"use client";

import { useEffect, useState, useCallback } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Activity, Expense } from "@/types";

// ── Helpers ──────────────────────────────────────────────

function getPin(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("copa_admin_pin");
}

function setPin(pin: string) {
  sessionStorage.setItem("copa_admin_pin", pin);
}

function adminHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "x-admin-pin": getPin() || "",
  };
}

// ── Types ────────────────────────────────────────────────

type Tab = "despesas" | "resumo" | "atividades";

interface UserSummary {
  id: string;
  name: string;
  total_owed: number;
  total_paid: number;
  balance: number;
}

interface SummaryData {
  users: UserSummary[];
  totals: {
    total_expenses: number;
    total_collected: number;
    total_outstanding: number;
  };
  confirmed_count: number;
}

interface ActivityWithCheckins extends Activity {
  checkin_count: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  aluguel: "Aluguel",
  carne: "Carne",
  bebida: "Bebida",
  descartavel: "Descartavel",
  geral: "Geral",
};

// ── PIN Screen ───────────────────────────────────────────

function PinScreen({ onSuccess }: { onSuccess: () => void }) {
  const [pin, setPinValue] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();

      if (data.valid) {
        setPin(pin);
        onSuccess();
      } else {
        setError("PIN incorreto");
      }
    } catch {
      setError("Erro ao validar PIN");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageContainer>
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Painel Admin</h1>
          <p className="text-sm text-zinc-500">
            Digite o PIN de administrador para continuar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card w-full max-w-xs space-y-4">
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            placeholder="PIN (4 digitos)"
            value={pin}
            onChange={(e) => setPinValue(e.target.value.replace(/\D/g, "").slice(0, 4))}
            className="w-full text-center text-2xl tracking-[0.5em] border border-zinc-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-green"
            autoFocus
          />

          {error && (
            <p className="text-red-600 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={pin.length < 4 || loading}
            className="btn-primary w-full disabled:opacity-50"
          >
            {loading ? "Verificando..." : "Entrar"}
          </button>
        </form>
      </div>
    </PageContainer>
  );
}

// ── Tab: Despesas ────────────────────────────────────────

function DespesasTab() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("geral");
  const [splitAll, setSplitAll] = useState(true);

  const fetchExpenses = useCallback(async () => {
    try {
      const res = await fetch("/api/expenses");
      if (res.ok) {
        const data = await res.json();
        setExpenses(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({
          description,
          amount: parseFloat(amount),
          category,
          split_among_all: splitAll,
        }),
      });

      if (res.ok) {
        setDescription("");
        setAmount("");
        setCategory("geral");
        setSplitAll(true);
        fetchExpenses();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir esta despesa?")) return;

    await fetch(`/api/expenses?id=${id}`, {
      method: "DELETE",
      headers: adminHeaders(),
    });
    fetchExpenses();
  }

  return (
    <div className="space-y-5">
      {/* Form */}
      <form onSubmit={handleAdd} className="card space-y-3">
        <h3 className="font-semibold text-sm text-blue">Nova Despesa</h3>

        <input
          type="text"
          placeholder="Descricao"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border border-zinc-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green"
          required
        />

        <input
          type="number"
          placeholder="Valor (R$)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          step="0.01"
          min="0"
          className="w-full border border-zinc-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green"
          required
        />

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full border border-zinc-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green bg-white"
        >
          <option value="aluguel">Aluguel</option>
          <option value="carne">Carne</option>
          <option value="bebida">Bebida</option>
          <option value="descartavel">Descartavel</option>
          <option value="geral">Geral</option>
        </select>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={splitAll}
            onChange={(e) => setSplitAll(e.target.checked)}
            className="w-4 h-4 accent-green"
          />
          Dividir entre todos os confirmados
        </label>

        <button
          type="submit"
          disabled={submitting || !description || !amount}
          className="btn-primary w-full text-sm disabled:opacity-50"
        >
          {submitting ? "Adicionando..." : "Adicionar Despesa"}
        </button>
      </form>

      {/* Expenses list */}
      <div className="space-y-2">
        <h3 className="font-semibold text-sm text-blue">
          Despesas Registradas ({expenses.length})
        </h3>

        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-4 bg-zinc-200 rounded w-2/3 mb-2" />
                <div className="h-3 bg-zinc-100 rounded w-1/3" />
              </div>
            ))}
          </div>
        )}

        {!loading && expenses.length === 0 && (
          <div className="card text-center">
            <p className="text-sm text-zinc-500">Nenhuma despesa registrada.</p>
          </div>
        )}

        {!loading &&
          expenses.map((expense) => (
            <div key={expense.id} className="card flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{expense.description}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-green font-semibold text-sm">
                    {formatCurrency(expense.amount)}
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-zinc-100 rounded-full text-zinc-600">
                    {CATEGORY_LABELS[expense.category] || expense.category}
                  </span>
                  {expense.split_among_all && (
                    <span className="text-xs px-2 py-0.5 bg-blue/10 rounded-full text-blue">
                      Dividido
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  {formatDate(expense.created_at)}
                </p>
              </div>

              <button
                onClick={() => handleDelete(expense.id)}
                className="text-red-500 hover:text-red-700 text-sm font-medium shrink-0 p-1"
                title="Excluir despesa"
              >
                Excluir
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}

// ── Tab: Resumo ──────────────────────────────────────────

function ResumoTab() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [eventStatus, setEventStatus] = useState<string>("open");
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [summaryRes, statusRes] = await Promise.all([
        fetch("/api/admin/summary", { headers: adminHeaders() }),
        fetch("/api/admin/event-status"),
      ]);

      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setSummary(data);
      }

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setEventStatus(statusData.status);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleToggleStatus() {
    const newStatus = eventStatus === "open" ? "closed" : "open";

    if (newStatus === "closed") {
      setShowConfirmDialog(true);
      return;
    }

    await executeToggle(newStatus);
  }

  async function executeToggle(newStatus: string) {
    setToggling(true);
    setShowConfirmDialog(false);

    try {
      const res = await fetch("/api/admin/event-status", {
        method: "PUT",
        headers: adminHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setEventStatus(newStatus);
      }
    } finally {
      setToggling(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card animate-pulse">
            <div className="h-4 bg-zinc-200 rounded w-full mb-2" />
            <div className="h-3 bg-zinc-100 rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="card text-center">
        <p className="text-sm text-red-600">Erro ao carregar resumo financeiro.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Status do evento */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm text-blue">Status do Evento</h3>
            <p className="text-sm mt-1">
              {eventStatus === "open" ? (
                <span className="text-green font-medium">Aberto</span>
              ) : (
                <span className="text-red-600 font-medium">Fechado</span>
              )}
            </p>
          </div>
          <button
            onClick={handleToggleStatus}
            disabled={toggling}
            className={`text-sm px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 ${
              eventStatus === "open"
                ? "bg-red-100 text-red-700 hover:bg-red-200"
                : "bg-green/10 text-green hover:bg-green/20"
            }`}
          >
            {toggling
              ? "Alterando..."
              : eventStatus === "open"
                ? "Fechar Evento"
                : "Reabrir Evento"}
          </button>
        </div>
      </div>

      {/* Dialog de confirmacao */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full space-y-4 shadow-xl">
            <h3 className="font-bold text-lg text-blue">Fechar Evento?</h3>
            <p className="text-sm text-zinc-600">
              Ao fechar o evento, check-ins serao travados e pagamentos liberados.
              Voce pode reabrir depois se necessario.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1 btn-secondary text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => executeToggle("closed")}
                className="flex-1 bg-red-600 text-white font-semibold py-2.5 px-4 rounded-xl text-sm hover:bg-red-700 transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Totais */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <p className="text-xs text-zinc-500">Total Despesas</p>
          <p className="text-sm font-bold text-blue mt-1">
            {formatCurrency(summary.totals.total_expenses)}
          </p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-zinc-500">Total Recebido</p>
          <p className="text-sm font-bold text-green mt-1">
            {formatCurrency(summary.totals.total_collected)}
          </p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-zinc-500">Pendente</p>
          <p className="text-sm font-bold text-red-600 mt-1">
            {formatCurrency(summary.totals.total_outstanding)}
          </p>
        </div>
      </div>

      <p className="text-xs text-zinc-500 text-center">
        {summary.confirmed_count} confirmados
      </p>

      {/* Tabela de usuarios */}
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200">
              <th className="text-left p-3 font-semibold text-blue">Nome</th>
              <th className="text-right p-3 font-semibold text-blue">Devido</th>
              <th className="text-right p-3 font-semibold text-blue">Pago</th>
              <th className="text-right p-3 font-semibold text-blue">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {summary.users.map((user) => (
              <tr key={user.id} className="border-b border-zinc-100 last:border-0">
                <td className="p-3 font-medium">{user.name}</td>
                <td className="p-3 text-right">{formatCurrency(user.total_owed)}</td>
                <td className="p-3 text-right">{formatCurrency(user.total_paid)}</td>
                <td
                  className={`p-3 text-right font-semibold ${
                    user.balance >= 0 ? "text-green" : "text-red-600"
                  }`}
                >
                  {formatCurrency(user.balance)}
                </td>
              </tr>
            ))}

            {summary.users.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-zinc-500">
                  Nenhum usuario confirmado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Tab: Atividades ──────────────────────────────────────

function AtividadesTab() {
  const [activities, setActivities] = useState<ActivityWithCheckins[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Editable fields per activity
  const [editValues, setEditValues] = useState<Record<string, Record<string, string>>>({});

  const fetchActivities = useCallback(async () => {
    try {
      const res = await fetch("/api/activities");
      if (res.ok) {
        const data = await res.json();
        setActivities(data);

        // Initialize edit values
        const initial: Record<string, Record<string, string>> = {};
        data.forEach((a: ActivityWithCheckins) => {
          initial[a.id] = {
            total_cost: a.total_cost?.toString() || "",
            cost_fixed: a.cost_fixed?.toString() || "",
            bottle_price: a.bottle_price?.toString() || "",
            people_per_bottle: a.people_per_bottle?.toString() || "",
            max_participants: a.max_participants?.toString() || "",
            litros: a.total_cost ? (a.total_cost / 12).toFixed(1) : "",
          };
        });
        setEditValues(initial);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  function updateField(activityId: string, field: string, value: string) {
    setEditValues((prev) => ({
      ...prev,
      [activityId]: {
        ...prev[activityId],
        [field]: value,
      },
    }));
  }

  function handleLitrosChange(activityId: string, litros: string) {
    const litrosNum = parseFloat(litros);
    const totalCost = isNaN(litrosNum) ? "" : (litrosNum * 12).toFixed(2);
    setEditValues((prev) => ({
      ...prev,
      [activityId]: {
        ...prev[activityId],
        litros,
        total_cost: totalCost,
      },
    }));
  }

  async function handleSave(activity: ActivityWithCheckins) {
    setSavingId(activity.id);
    const values = editValues[activity.id];

    const body: Record<string, string | number | null> = { id: activity.id };

    if (activity.cost_type === "total_split") {
      const val = parseFloat(values.total_cost);
      body.total_cost = isNaN(val) ? null : val;
    } else if (activity.cost_type === "fixed") {
      const val = parseFloat(values.cost_fixed);
      body.cost_fixed = isNaN(val) ? null : val;
    } else if (activity.cost_type === "per_bottle") {
      const bp = parseFloat(values.bottle_price);
      const ppb = parseFloat(values.people_per_bottle);
      body.bottle_price = isNaN(bp) ? null : bp;
      body.people_per_bottle = isNaN(ppb) ? null : ppb;
    }

    const mp = parseFloat(values.max_participants);
    if (!isNaN(mp)) body.max_participants = mp;

    try {
      const res = await fetch("/api/admin/activities", {
        method: "PUT",
        headers: adminHeaders(),
        body: JSON.stringify(body),
      });

      if (res.ok) {
        fetchActivities();
      }
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card animate-pulse">
            <div className="h-4 bg-zinc-200 rounded w-1/2 mb-2" />
            <div className="h-8 bg-zinc-100 rounded w-full mb-2" />
            <div className="h-3 bg-zinc-100 rounded w-1/4" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => {
        const values = editValues[activity.id] || {};
        const isChopp = activity.name.toLowerCase().includes("chopp");

        return (
          <div key={activity.id} className="card space-y-3">
            <div className="flex items-center gap-2">
              {activity.emoji && <span className="text-xl">{activity.emoji}</span>}
              <div>
                <h4 className="font-semibold text-sm">{activity.name}</h4>
                <p className="text-xs text-zinc-500">
                  Tipo: {activity.cost_type} | {activity.checkin_count} participantes
                </p>
              </div>
            </div>

            {/* total_split type */}
            {activity.cost_type === "total_split" && (
              <div className="space-y-2">
                {isChopp && (
                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">
                      Quantidade de litros (R$ 12/litro)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={values.litros || ""}
                      onChange={(e) => handleLitrosChange(activity.id, e.target.value)}
                      className="w-full border border-zinc-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-green"
                      placeholder="Ex: 50"
                    />
                  </div>
                )}
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">
                    Custo total (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={values.total_cost || ""}
                    onChange={(e) => updateField(activity.id, "total_cost", e.target.value)}
                    className="w-full border border-zinc-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-green"
                    placeholder="Custo total da atividade"
                  />
                </div>
              </div>
            )}

            {/* fixed type */}
            {activity.cost_type === "fixed" && (
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">
                  Custo fixo por pessoa (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={values.cost_fixed || ""}
                  onChange={(e) => updateField(activity.id, "cost_fixed", e.target.value)}
                  className="w-full border border-zinc-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-green"
                  placeholder="Custo fixo por pessoa"
                />
              </div>
            )}

            {/* per_bottle type */}
            {activity.cost_type === "per_bottle" && (
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">
                    Preco da garrafa (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={values.bottle_price || ""}
                    onChange={(e) => updateField(activity.id, "bottle_price", e.target.value)}
                    className="w-full border border-zinc-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-green"
                    placeholder="Preco da garrafa"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">
                    Pessoas por garrafa
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={values.people_per_bottle || ""}
                    onChange={(e) => updateField(activity.id, "people_per_bottle", e.target.value)}
                    className="w-full border border-zinc-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-green"
                    placeholder="Pessoas por garrafa"
                  />
                </div>
              </div>
            )}

            {/* Max participants (all types) */}
            {!activity.is_mandatory && (
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">
                  Maximo de participantes
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={values.max_participants || ""}
                  onChange={(e) => updateField(activity.id, "max_participants", e.target.value)}
                  className="w-full border border-zinc-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-green"
                  placeholder="Sem limite"
                />
              </div>
            )}

            <button
              onClick={() => handleSave(activity)}
              disabled={savingId === activity.id}
              className="btn-primary w-full text-sm disabled:opacity-50"
            >
              {savingId === activity.id ? "Salvando..." : "Salvar"}
            </button>
          </div>
        );
      })}

      {activities.length === 0 && (
        <div className="card text-center">
          <p className="text-sm text-zinc-500">Nenhuma atividade cadastrada.</p>
        </div>
      )}
    </div>
  );
}

// ── Main Admin Page ──────────────────────────────────────

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("despesas");

  useEffect(() => {
    const pin = getPin();
    if (pin) {
      setAuthenticated(true);
    }
  }, []);

  if (!authenticated) {
    return <PinScreen onSuccess={() => setAuthenticated(true)} />;
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "despesas", label: "Despesas" },
    { key: "resumo", label: "Resumo" },
    { key: "atividades", label: "Atividades" },
  ];

  return (
    <PageContainer>
      <div className="flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Admin</h1>
            <p className="text-sm text-zinc-500">Gerenciamento do evento</p>
          </div>
          <button
            onClick={() => {
              sessionStorage.removeItem("copa_admin_pin");
              setAuthenticated(false);
            }}
            className="text-xs text-red-500 hover:text-red-700 font-medium"
          >
            Sair
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 text-sm font-medium py-2 rounded-lg transition-colors ${
                activeTab === tab.key
                  ? "bg-white text-blue shadow-sm"
                  : "text-zinc-500 hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "despesas" && <DespesasTab />}
        {activeTab === "resumo" && <ResumoTab />}
        {activeTab === "atividades" && <AtividadesTab />}
      </div>
    </PageContainer>
  );
}
