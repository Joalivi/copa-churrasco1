"use client";

import Image from "next/image";
import { useEffect, useState, useCallback } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { formatCurrency } from "@/lib/utils";
import { MEAT_PER_PERSON_KG } from "@/lib/constants";
import type { Expense, MenuItem } from "@/types";

// ─── Configuração de categorias ───────────────────────────────────────────────
interface CategoryConfig {
  label: string;
  emoji: string;
  bg: string;
  text: string;
}

const categoryConfig: Record<string, CategoryConfig> = {
  aluguel: {
    label: "Aluguel",
    emoji: "🏡",
    bg: "bg-emerald-100",
    text: "text-emerald-700",
  },
  carne: {
    label: "Carne",
    emoji: "🥩",
    bg: "bg-red-100",
    text: "text-red-700",
  },
  bebida: {
    label: "Bebida",
    emoji: "🍺",
    bg: "bg-amber-100",
    text: "text-amber-700",
  },
  descartavel: {
    label: "Descartável",
    emoji: "🧻",
    bg: "bg-zinc-100",
    text: "text-zinc-600",
  },
  geral: {
    label: "Geral",
    emoji: "📦",
    bg: "bg-zinc-100",
    text: "text-zinc-600",
  },
};

function getCategoryConfig(category: string): CategoryConfig {
  return categoryConfig[category] ?? categoryConfig.geral;
}

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface CollectedBreakdown {
  aviso: number;
  activity: number;
  bolao: number;
  expense_share: number;
  outros: number;
}

interface FinancialStats {
  totalExpenses: number;
  totalCollected: number;
  collected: CollectedBreakdown;
  pendingBalance: number;
  perCapita: number;
  confirmedCount: number;
}

const EMPTY_COLLECTED: CollectedBreakdown = {
  aviso: 0,
  activity: 0,
  bolao: 0,
  expense_share: 0,
  outros: 0,
};

// ─── Componente principal ─────────────────────────────────────────────────────
export default function FinanceiroPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState<FinancialStats | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [expensesRes, statsRes, menuRes] = await Promise.all([
        fetch("/api/expenses"),
        fetch("/api/payments/stats"),
        fetch("/api/menu"),
      ]);

      if (expensesRes.ok) {
        const data: Expense[] = await expensesRes.json();
        setExpenses(data);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats({
          totalExpenses: data.totalExpenses ?? 0,
          totalCollected: data.totalCollected ?? 0,
          collected: data.collected ?? EMPTY_COLLECTED,
          pendingBalance: data.pendingBalance ?? 0,
          perCapita: data.perCapita ?? 0,
          confirmedCount: data.confirmedCount ?? 0,
        });
      }

      if (menuRes.ok) {
        const data = await menuRes.json();
        setMenu(Array.isArray(data.items) ? data.items : []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <PageContainer>
      <div className="flex flex-col gap-5">
        {/* Cabeçalho */}
        <div>
          <h1 className="text-2xl font-bold">Financeiro</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Visão geral das despesas e arrecadação do churras
          </p>
        </div>

        {/* Cards de resumo — 2×2 */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card">
                <div className="h-3 skeleton rounded w-2/3 mb-2" />
                <div className="h-6 skeleton rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {/* Total Despesas */}
            <div className="card border border-blue/10 animate-slide-up delay-1" style={{ background: "rgba(0,39,118,0.04)" }}>
              <p className="text-[10px] uppercase tracking-wide text-zinc-500 font-medium">
                Total Despesas
              </p>
              <p className="text-lg font-bold text-blue mt-1">
                {formatCurrency(stats?.totalExpenses ?? 0)}
              </p>
              {stats && (
                <p className="text-[10px] text-zinc-400 mt-0.5">
                  {expenses.length} {expenses.length === 1 ? "item" : "itens"}
                </p>
              )}
            </div>

            {/* Total Arrecadado */}
            <div className="card border border-green/10 animate-slide-up delay-2" style={{ background: "rgba(0,156,59,0.04)" }}>
              <p className="text-[10px] uppercase tracking-wide text-zinc-500 font-medium">
                Total Arrecadado
              </p>
              <p className="text-lg font-bold text-green mt-1">
                {formatCurrency(stats?.totalCollected ?? 0)}
              </p>
              {stats && (
                <p className="text-[10px] text-zinc-400 mt-0.5">
                  {stats.confirmedCount}{" "}
                  {stats.confirmedCount === 1 ? "confirmado" : "confirmados"}
                </p>
              )}
            </div>

          </div>
        )}

        {/* Composição do arrecadado — explica de onde veio o Total Arrecadado */}
        {!loading && stats && stats.totalCollected > 0 && (
          <div>
            <h2 className="text-sm font-bold text-green mb-3">
              Arrecadado por origem
            </h2>
            <div className="flex flex-col gap-2">
              {[
                { key: "aviso", label: "Aviso da Chácara", emoji: "🏠", value: stats.collected.aviso },
                { key: "activity", label: "Atividades", emoji: "🎮", value: stats.collected.activity },
                { key: "bolao", label: "Bolão", emoji: "🎯", value: stats.collected.bolao },
                { key: "expense_share", label: "Rateio do aluguel", emoji: "🏡", value: stats.collected.expense_share },
                { key: "outros", label: "Outros", emoji: "📦", value: stats.collected.outros },
              ]
                .filter((row) => row.value > 0)
                .map((row) => (
                  <div key={row.key} className="card flex items-center gap-3 py-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0 text-lg">
                      {row.emoji}
                    </div>
                    <p className="flex-1 text-sm font-medium text-foreground">
                      {row.label}
                    </p>
                    <p className="text-sm font-bold text-green shrink-0">
                      {formatCurrency(row.value)}
                    </p>
                  </div>
                ))}

              {/* Total */}
              <div className="card flex items-center justify-between border border-green/10 mt-1">
                <p className="text-sm font-bold text-green">Total Arrecadado</p>
                <p className="text-sm font-bold text-green">
                  {formatCurrency(stats.totalCollected)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Cardápio */}
        {!loading && menu.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-amber-600 mb-3">🍽️ Cardápio</h2>
            <div className="card flex flex-col gap-2 py-3">
              {menu.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-sm text-foreground">{item.name}</span>
                  {item.category && (
                    <span className="text-[10px] px-2 py-0.5 bg-zinc-100 rounded-full text-zinc-500">
                      {item.category}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Carnes compradas */}
        {!loading && expenses.some((e) => e.category === "carne") && (
          <div>
            <h2 className="text-sm font-bold text-red-600 mb-3">
              🥩 Carnes compradas
            </h2>
            <div className="flex flex-col gap-2">
              {expenses
                .filter((e) => e.category === "carne")
                .map((expense) => {
                  const receipt = expense.receipt_url;
                  return (
                    <div
                      key={expense.id}
                      className="card flex items-start gap-3 py-3"
                    >
                      {receipt ? (
                        <button
                          type="button"
                          onClick={() => setLightboxUrl(receipt)}
                          className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-zinc-200"
                          title="Ver nota"
                        >
                          <Image
                            src={receipt}
                            alt="Nota"
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        </button>
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center shrink-0 text-lg">
                          🥩
                        </div>
                      )}
                      <p className="flex-1 text-sm font-medium text-foreground whitespace-pre-line break-words">
                        {expense.description}
                      </p>
                      <p className="text-sm font-bold text-foreground shrink-0">
                        {formatCurrency(expense.amount)}
                      </p>
                    </div>
                  );
                })}
              {stats && stats.confirmedCount > 0 && (
                <p className="text-[11px] text-zinc-400 px-1">
                  Referência: ~{MEAT_PER_PERSON_KG} kg/pessoa → ≈{" "}
                  {Math.round(MEAT_PER_PERSON_KG * stats.confirmedCount * 10) / 10}{" "}
                  kg para {stats.confirmedCount} confirmados.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Lista de despesas */}
        <div>
          <h2 className="text-sm font-bold text-blue mb-3">Despesas</h2>

          {loading ? (
            <div className="flex flex-col gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl skeleton" />
                    <div className="flex-1">
                      <div className="h-3 skeleton rounded w-1/2 mb-1.5" />
                      <div className="h-2.5 skeleton rounded w-1/4" />
                    </div>
                    <div className="h-4 skeleton rounded w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : expenses.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-2xl mb-2">📋</p>
              <p className="text-sm text-zinc-500">
                Nenhuma despesa registrada ainda.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {expenses.map((expense) => {
                const cat = getCategoryConfig(expense.category);
                const receipt = expense.receipt_url;
                return (
                  <div
                    key={expense.id}
                    className="card flex items-start gap-3 py-3 hover:shadow-lg transition-shadow duration-200"
                  >
                    {/* Foto da nota (ou ícone da categoria) */}
                    {receipt ? (
                      <button
                        type="button"
                        onClick={() => setLightboxUrl(receipt)}
                        className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-zinc-200"
                        title="Ver nota"
                      >
                        <Image
                          src={receipt}
                          alt="Nota"
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      </button>
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0 text-lg">
                        {cat.emoji}
                      </div>
                    )}

                    {/* Categoria + descrição (texto livre, multilinha) */}
                    <div className="flex-1 min-w-0">
                      <span
                        className={`inline-block mb-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${cat.bg} ${cat.text}`}
                      >
                        {cat.emoji} {cat.label}
                      </span>
                      <p className="text-sm font-medium text-foreground whitespace-pre-line break-words">
                        {expense.description}
                      </p>
                    </div>

                    {/* Valor */}
                    <p className="text-sm font-bold text-foreground shrink-0">
                      {formatCurrency(expense.amount)}
                    </p>
                  </div>
                );
              })}

              {/* Despesa pendente de fechamento */}
              <div className="card flex items-center gap-3 py-3 opacity-60 border border-dashed border-zinc-300">
                <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0 text-lg">
                  🧻
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-zinc-500">
                      Itens Basicos
                    </p>
                    <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500">
                      Pendente
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Papel higienico, detergente, papel toalha, descartaveis — valor aprox. R$6 por pessoa
                  </p>
                </div>
                <p className="text-sm font-bold text-zinc-400 shrink-0">
                  —
                </p>
              </div>

              {/* Linha de total */}
              {stats && expenses.length > 0 && (
                <div className="card flex items-center justify-between border border-blue/10 mt-1">
                  <p className="text-sm font-bold text-blue">Total</p>
                  <p className="text-sm font-bold text-blue">
                    {formatCurrency(stats.totalExpenses)}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox da nota */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt="Nota fiscal"
            className="max-w-full max-h-[85vh] rounded-lg object-contain"
          />
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 text-white text-3xl leading-none font-bold"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
      )}
    </PageContainer>
  );
}
