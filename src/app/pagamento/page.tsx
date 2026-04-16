"use client";

import { Suspense, useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { PageContainer } from "@/components/layout/page-container";
import { useCurrentUser } from "@/hooks/use-current-user";
import { formatCurrency } from "@/lib/utils";
import { PaymentHistory } from "@/components/pagamento/payment-history";
import { PhaseBar } from "@/components/layout/phase-bar";
import { invalidateBalanceCache } from "@/hooks/use-user-balance";
import { createClient } from "@/lib/supabase/client";
import { getStripe } from "@/lib/stripe-client";

interface ItemSelecionavel {
  key: string;
  type: "activity" | "bolao" | "expense_share" | "aviso";
  id?: string;
  description: string;
  amount: number;
  pago: boolean;
  isDynamic?: boolean;
  checkinCount?: number;
}

interface UserSummary {
  user: {
    id: string;
    name: string;
    status: string;
  };
  activity_checkins: Array<{
    checkin_id: string;
    activity_id: string;
    activity_name: string;
    activity_emoji: string | null;
    cost_type: string;
    estimated_cost: number;
    total_checkins: number;
  }>;
  confirmed_count: number;
  bolao_tickets: Array<{
    id: string;
    home_score: number;
    away_score: number;
    cost: number;
  }>;
  expense_share: number;
  rental_share: number;
  total_owed: number;
  total_paid: number;
  balance: number;
  aviso_paid: boolean;
  payments: Array<{
    id: string;
    user_id: string;
    amount: number;
    stripe_session_id: string;
    stripe_payment_intent_id: string | null;
    payment_method: string;
    status: string;
    created_at: string;
    completed_at: string | null;
    payment_items: Array<{
      id: string;
      payment_id: string;
      item_type: string;
      item_id: string | null;
      description: string;
      amount: number;
    }>;
  }>;
}

interface EventStatus {
  status: "open" | "closed";
}

function PagamentoContent() {
  const { userId, userName, isLoading: userLoading } = useCurrentUser();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [summary, setSummary] = useState<UserSummary | null>(null);
  const [eventStatus, setEventStatus] = useState<"open" | "closed">("open");
  const [loading, setLoading] = useState(true);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [justPaidKeys, setJustPaidKeys] = useState<Set<string>>(new Set());
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [isTestMode, setIsTestMode] = useState(false);

  // userId pode vir do hook ou da searchParam (fallback)
  const effectiveUserId = userId ?? searchParams.get("user_id");

  const fetchData = useCallback(async (uid: string) => {
    try {
      const [summaryRes, statusRes] = await Promise.all([
        fetch(`/api/user-summary?user_id=${uid}`),
        fetch("/api/admin/event-status"),
      ]);

      if (summaryRes.ok) {
        const data: UserSummary = await summaryRes.json();
        setSummary(data);
      }

      if (statusRes.ok) {
        const statusData: EventStatus = await statusRes.json();
        setEventStatus(statusData.status);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userLoading && effectiveUserId) {
      fetchData(effectiveUserId);
    } else if (!userLoading && !effectiveUserId) {
      setLoading(false);
    }
  }, [userLoading, effectiveUserId, fetchData]);

  // Detectar test mode
  useEffect(() => {
    fetch("/api/test-mode")
      .then((r) => r.json())
      .then((d) => setIsTestMode(d.test === true))
      .catch(() => {});
  }, []);

  // Construir lista de itens a pagar
  const itensPagarDisponiveis = useCallback((): ItemSelecionavel[] => {
    if (!summary) return [];

    const itens: ItemSelecionavel[] = [];

    // IDs de checkins já pagos em algum payment_item
    const actividadesPagas = new Set<string>();
    const boloesPagos = new Set<string>();
    let avisoPago = summary.aviso_paid;
    let expensePago = false;

    for (const pagamento of summary.payments) {
      if (pagamento.status !== "succeeded") continue;
      for (const pi of pagamento.payment_items) {
        if (pi.item_type === "aviso") avisoPago = true;
        if (pi.item_type === "activity" && pi.item_id) actividadesPagas.add(pi.item_id);
        if (pi.item_type === "bolao" && pi.item_id) boloesPagos.add(pi.item_id);
        if (pi.item_type === "expense_share") expensePago = true;
      }
    }

    // Aviso da chácara (R$35 — obrigatório para confirmação)
    if (!avisoPago) {
      itens.push({
        key: "aviso",
        type: "aviso",
        description: "Aviso da Chácara",
        amount: 35,
        pago: false,
      });
    }

    // Atividades opcionais
    for (const checkin of summary.activity_checkins) {
      const pago = actividadesPagas.has(checkin.checkin_id);
      itens.push({
        key: `activity-${checkin.checkin_id}`,
        type: "activity",
        id: checkin.checkin_id,
        description: `${checkin.activity_emoji ? checkin.activity_emoji + " " : ""}${checkin.activity_name}`,
        amount: Math.round(checkin.estimated_cost * 100) / 100,
        pago,
        isDynamic: checkin.cost_type !== "fixed",
        checkinCount: checkin.total_checkins,
      });
    }

    // Rateio de despesas
    const totalExpenseShare =
      Math.round((summary.expense_share + summary.rental_share) * 100) / 100;
    if (totalExpenseShare > 0) {
      itens.push({
        key: "expense_share",
        type: "expense_share",
        description: "Rateio de Despesas",
        amount: totalExpenseShare,
        pago: expensePago,
        isDynamic: true,
        checkinCount: summary.confirmed_count,
      });
    }

    // Tickets do bolão
    for (const ticket of summary.bolao_tickets) {
      const pago = boloesPagos.has(ticket.id);
      itens.push({
        key: `bolao-${ticket.id}`,
        type: "bolao",
        id: ticket.id,
        description: `Bolão — Palpite ${ticket.home_score}x${ticket.away_score}`,
        amount: ticket.cost ?? 2,
        pago,
      });
    }

    return itens;
  }, [summary]);

  const itens = itensPagarDisponiveis();
  const itensPendentes = itens.filter((i) => !i.pago);

  // Separar itens liberados (pagáveis agora) de bloqueados (aguardando fechamento)
  const itensLiberados = itensPendentes.filter(
    (i) => !i.isDynamic || eventStatus === "closed"
  );
  const itensBloqueados = itensPendentes.filter(
    (i) => i.isDynamic && eventStatus === "open"
  );

  // Inicializar selecionados apenas com itens liberados
  useEffect(() => {
    if (itensLiberados.length > 0 && selecionados.size === 0) {
      setSelecionados(new Set(itensLiberados.map((i) => i.key)));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itensLiberados.length]);

  const toggleItem = (key: string) => {
    setSelecionados((prev) => {
      const novo = new Set(prev);
      if (novo.has(key)) {
        novo.delete(key);
      } else {
        novo.add(key);
      }
      return novo;
    });
  };

  const itensSelecionados = itensLiberados.filter((i) => selecionados.has(i.key));
  const totalSelecionado = itensSelecionados.reduce((sum, i) => sum + i.amount, 0);

  const handlePagar = async () => {
    if (!effectiveUserId || itensSelecionados.length === 0) return;

    setProcessando(true);
    setErro(null);

    try {
      const payload = {
        userId: effectiveUserId,
        items: itensSelecionados.map((item) => ({
          type: item.type,
          id: item.id,
          description: item.description,
          amount: item.amount,
        })),
      };

      const res = await fetch("/api/payments/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setErro(data.error ?? "Erro ao iniciar pagamento");
        return;
      }

      if (data.test_mode) {
        // Test mode: pagamento ja registrado no banco, pular Stripe
        await handleCheckoutComplete();
        return;
      }

      if (data.client_secret) {
        setClientSecret(data.client_secret);
      }
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setProcessando(false);
    }
  };

  const handleCheckoutComplete = useCallback(async () => {
    // Guarda os keys dos itens que acabaram de ser pagos para destaque visual
    const paidKeys = itensSelecionados.map((i) => i.key);
    setJustPaidKeys(new Set(paidKeys));
    setClientSecret(null);
    setSelecionados(new Set());
    setSuccessBanner(
      `Pagamento confirmado! ${paidKeys.length} item(ns) quitado(s).`
    );
    invalidateBalanceCache();

    // Refetch com pequeno polling caso o webhook ainda nao tenha registrado
    if (effectiveUserId) {
      for (let i = 0; i < 4; i++) {
        await fetchData(effectiveUserId);
        await new Promise((r) => setTimeout(r, 800));
      }
    }

    // Remove o destaque depois de 6s
    setTimeout(() => setJustPaidKeys(new Set()), 6000);
    setTimeout(() => setSuccessBanner(null), 6000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveUserId, fetchData, itensSelecionados.map((i) => i.key).join(",")]);

  const stripePromise = useMemo(() => getStripe(), []);

  // Estado: carregando
  if (loading || userLoading) {
    return (
      <PageContainer>
        <div className="flex flex-col gap-5 animate-pulse">
          <div className="h-8 bg-zinc-200 rounded w-1/2" />
          <div className="card">
            <div className="h-4 bg-zinc-200 rounded w-3/4 mb-3" />
            <div className="h-4 bg-zinc-100 rounded w-1/2 mb-3" />
            <div className="h-4 bg-zinc-100 rounded w-2/3" />
          </div>
        </div>
      </PageContainer>
    );
  }

  // Estado: usuário não identificado
  if (!effectiveUserId) {
    return (
      <PageContainer>
        <div className="flex flex-col gap-5">
          <h1 className="text-2xl font-bold">Pagamento</h1>
          <div className="card bg-yellow/10 border border-yellow/30">
            <p className="text-sm text-foreground">
              Você precisa confirmar presença antes de acessar os pagamentos.
            </p>
            <a href="/confirmar" className="inline-block mt-3 btn-primary text-sm text-center">
              Confirmar presença
            </a>
          </div>
        </div>
      </PageContainer>
    );
  }

  // Estado: dados não encontrados
  if (!summary) {
    return (
      <PageContainer>
        <div className="flex flex-col gap-5">
          <h1 className="text-2xl font-bold">Pagamento</h1>
          <div className="card bg-red-50 border border-red-200">
            <p className="text-sm text-red-700">
              Não foi possível carregar seus dados. Tente novamente.
            </p>
          </div>
        </div>
      </PageContainer>
    );
  }

  const nomeUsuario = userName ?? summary.user.name;
  const eventoAberto = eventStatus === "open";

  // Agrupar itens liberados por tipo
  const grupoObrigatorio = itensLiberados.filter(
    (i) => i.type === "expense_share" || i.type === "aviso"
  );
  const grupoAtividades = itensLiberados.filter((i) => i.type === "activity");
  const grupoBolao = itensLiberados.filter((i) => i.type === "bolao");

  return (
    <PageContainer>
      <div className="flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Pagamento</h1>
            <p className="text-sm text-zinc-500 mt-1">Olá, {nomeUsuario}!</p>
          </div>
          <button
            onClick={async () => {
              localStorage.removeItem("copa_user_id");
              localStorage.removeItem("copa_user_name");
              invalidateBalanceCache();
              try {
                const supabase = createClient();
                await supabase.auth.signOut();
              } catch {}
              router.push("/confirmar");
            }}
            className="text-xs text-zinc-400 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
          >
            Sair
          </button>
        </div>

        {/* Badge modo teste */}
        {isTestMode && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl px-3 py-2">
            <p className="text-xs font-semibold text-amber-800 text-center">
              MODO TESTE — pagamentos simulados, nada é cobrado
            </p>
          </div>
        )}

        {/* Banner de sucesso pós-pagamento */}
        {successBanner && (
          <div className="card bg-green/10 border border-green/30 animate-slide-up">
            <div className="flex items-start gap-2">
              <span className="text-lg shrink-0">✅</span>
              <p className="text-sm font-semibold text-green flex-1">
                {successBanner}
              </p>
              <button
                onClick={() => setSuccessBanner(null)}
                className="text-green/60 hover:text-green text-xs shrink-0"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Resumo de saldo */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card bg-blue/5 border border-blue/10">
            <p className="text-[10px] uppercase tracking-wide text-zinc-500 font-medium">
              Total a pagar
            </p>
            <p className="text-lg font-bold text-blue mt-1">
              {formatCurrency(summary.total_owed)}
            </p>
          </div>
          <div className="card bg-green/5 border border-green/10">
            <p className="text-[10px] uppercase tracking-wide text-zinc-500 font-medium">
              Já pago
            </p>
            <p className="text-lg font-bold text-green mt-1">
              {formatCurrency(summary.total_paid)}
            </p>
          </div>
        </div>

        {itensLiberados.length === 0 && itensBloqueados.length === 0 ? (
          <div className="card bg-green/5 border border-green/20 text-center">
            <p className="text-2xl mb-2">🎉</p>
            <p className="text-sm font-semibold text-green">Tudo quitado!</p>
            <p className="text-xs text-zinc-500 mt-1">
              Você está em dia com todos os pagamentos do churras.
            </p>
          </div>
        ) : (
          <>
            {/* Itens liberados para pagamento */}
            {itensLiberados.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-blue mb-2">
                Pagar agora
              </h2>

              {itensLiberados.length > 1 && (
                <div className="flex items-center gap-2 bg-blue/5 border border-blue/15 rounded-xl px-3 py-2 mb-3">
                  <span className="text-blue text-xs">ℹ️</span>
                  <p className="text-xs text-zinc-600">
                    Todos os itens já estão selecionados. Desmarque o que não quer pagar agora.
                  </p>
                </div>
              )}

              {/* Change A: grouped sections */}
              <div className="flex flex-col gap-4">
                {grupoObrigatorio.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
                      📋 Obrigatório
                    </p>
                    <div className="flex flex-col gap-2">
                      {grupoObrigatorio.map((item) => {
                        const selecionado = selecionados.has(item.key);
                        return (
                          <label
                            key={item.key}
                            className={`card flex items-center gap-3 cursor-pointer transition-all duration-200 ${
                              selecionado
                                ? "bg-green/5 border border-green/20"
                                : "border border-transparent"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selecionado}
                              onChange={() => toggleItem(item.key)}
                              className="w-4 h-4 accent-green"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                                {item.description}
                                {item.type === "aviso" && (
                                  <span className="text-[10px] bg-yellow/20 text-yellow-700 px-1.5 py-0.5 rounded-full font-medium">
                                    obrigatório
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-zinc-500 capitalize">
                                {item.type === "expense_share" ? "Rateio" : "Confirmação de presença"}
                              </p>
                            </div>
                            <p className="text-sm font-bold text-foreground shrink-0">
                              {formatCurrency(item.amount)}
                              {eventoAberto && item.isDynamic && (
                                <span className="text-[10px] text-zinc-400 ml-1 font-normal">(est.)</span>
                              )}
                            </p>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {grupoAtividades.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
                      🎯 Atividades
                    </p>
                    <div className="flex flex-col gap-2">
                      {grupoAtividades.map((item) => {
                        const selecionado = selecionados.has(item.key);
                        return (
                          <label
                            key={item.key}
                            className={`card flex items-center gap-3 cursor-pointer transition-all duration-200 ${
                              selecionado
                                ? "bg-green/5 border border-green/20"
                                : "border border-transparent"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selecionado}
                              onChange={() => toggleItem(item.key)}
                              className="w-4 h-4 accent-green"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground">
                                {item.description}
                              </p>
                              <p className="text-xs text-zinc-500">Atividade</p>
                            </div>
                            <p className="text-sm font-bold text-foreground shrink-0">
                              {formatCurrency(item.amount)}
                              {eventoAberto && item.isDynamic && (
                                <span className="text-[10px] text-zinc-400 ml-1 font-normal">(est.)</span>
                              )}
                            </p>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {grupoBolao.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
                      🎲 Bolão
                    </p>
                    <div className="flex flex-col gap-2">
                      {grupoBolao.map((item) => {
                        const selecionado = selecionados.has(item.key);
                        return (
                          <label
                            key={item.key}
                            className={`card flex items-center gap-3 cursor-pointer transition-all duration-200 ${
                              selecionado
                                ? "bg-green/5 border border-green/20"
                                : "border border-transparent"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selecionado}
                              onChange={() => toggleItem(item.key)}
                              className="w-4 h-4 accent-green"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground">
                                {item.description}
                              </p>
                              <p className="text-xs text-zinc-500">Bolão</p>
                            </div>
                            <p className="text-sm font-bold text-foreground shrink-0">
                              {formatCurrency(item.amount)}
                            </p>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
            )}

            {/* Mensagem de erro */}
            {erro && (
              <div className="card bg-red-50 border border-red-200">
                <p className="text-sm text-red-700">{erro}</p>
              </div>
            )}

            {/* Sticky payment bar — só aparece se tem itens liberados */}
            {itensLiberados.length > 0 && (
            <div className="sticky bottom-20 z-10 bg-white/95 backdrop-blur-sm rounded-2xl border border-zinc-200 shadow-xl p-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-500">
                    {itensSelecionados.length} item(ns) selecionado(s)
                  </p>
                  <p className="text-lg font-bold text-foreground leading-tight">
                    {formatCurrency(totalSelecionado)}
                  </p>
                </div>
                <button
                  onClick={handlePagar}
                  disabled={processando || itensSelecionados.length === 0}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-green text-white font-semibold text-sm hover:bg-green/90 shadow-md active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  Pagar
                </button>
              </div>
              {processando && (
                <p className="text-xs text-zinc-500 text-center mt-2 animate-pulse">
                  Iniciando pagamento...
                </p>
              )}
            </div>
            )}

            {/* Seção: Aguardando fechamento */}
            {itensBloqueados.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-zinc-400 mb-2">
                  🔒 Aguardando fechamento
                </h2>

                <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 mb-3">
                  <p className="text-xs text-amber-800">
                    Estes itens têm valor dividido entre os participantes. O valor final será apurado
                    quando o organizador fechar o evento, e então serão liberados para pagamento.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  {itensBloqueados.map((item) => (
                    <div
                      key={item.key}
                      className="card flex items-center gap-3 opacity-70 border border-zinc-200"
                    >
                      <span className="text-zinc-400 text-sm">🔒</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {item.description}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {item.checkinCount
                            ? `${item.checkinCount} ${item.type === "expense_share" ? "confirmados" : "inscritos"}`
                            : ""}
                          {item.checkinCount ? " · " : ""}
                          {formatCurrency(item.amount)} por pessoa (estimado)
                        </p>
                      </div>
                      <p className="text-sm font-bold text-zinc-400 shrink-0">
                        {formatCurrency(item.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Itens já pagos */}
        {itens.filter((i) => i.pago).length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-zinc-400 mb-2">Já pagos</h2>
            <div className="flex flex-col gap-2">
              {itens
                .filter((i) => i.pago)
                .map((item) => {
                  const justPaid = justPaidKeys.has(item.key);
                  return (
                    <div
                      key={item.key}
                      className={`card flex items-center gap-3 transition-all ${
                        justPaid
                          ? "ring-2 ring-green bg-green/5 animate-pulse"
                          : "opacity-60 grayscale"
                      }`}
                    >
                      <span className="text-green text-sm">✓</span>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm text-foreground ${
                            justPaid ? "font-semibold" : "line-through"
                          }`}
                        >
                          {item.description}
                          {justPaid && (
                            <span className="ml-2 text-[10px] bg-green text-white px-1.5 py-0.5 rounded-full font-bold">
                              PAGO AGORA
                            </span>
                          )}
                        </p>
                      </div>
                      <p className="text-sm text-zinc-500 shrink-0">
                        {formatCurrency(item.amount)}
                      </p>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Embedded Checkout Modal (fullscreen mobile) */}
        {clientSecret && (
          <div className="fixed inset-0 z-50 bg-black/50 flex flex-col">
            <div className="bg-white flex items-center justify-between px-4 py-3 border-b border-zinc-200">
              <p className="text-sm font-semibold text-foreground">
                Finalizar pagamento
              </p>
              <button
                onClick={() => setClientSecret(null)}
                className="text-zinc-500 hover:text-red-500 text-sm font-medium px-2 py-1 rounded-lg hover:bg-red-50"
              >
                Cancelar
              </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-white">
              <EmbeddedCheckoutProvider
                stripe={stripePromise}
                options={{
                  clientSecret,
                  onComplete: handleCheckoutComplete,
                }}
              >
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            </div>
          </div>
        )}

        {/* Change D: Histórico de Pagamentos */}
        {summary.payments.length > 0 && (
          <details className="group">
            <summary className="list-none cursor-pointer">
              <div className="flex items-center justify-between card py-3 hover:bg-zinc-50 transition-colors">
                <span className="text-sm font-bold text-blue">Histórico de Pagamentos</span>
                <span className="text-zinc-400 text-xs group-open:rotate-180 transition-transform">▼</span>
              </div>
            </summary>
            <div className="mt-2">
              <PaymentHistory payments={summary.payments} />
            </div>
          </details>
        )}
      </div>
    </PageContainer>
  );
}

export default function PagamentoPage() {
  return (
    <Suspense fallback={<PageContainer><div className="py-8 text-center text-zinc-400">Carregando...</div></PageContainer>}>
      <PagamentoContent />
    </Suspense>
  );
}
