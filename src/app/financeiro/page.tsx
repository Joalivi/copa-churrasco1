"use client";

import { useEffect, useState, useCallback } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { formatCurrency } from "@/lib/utils";
import type { Expense } from "@/types";

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
interface FinancialStats {
  totalExpenses: number;
  totalCollected: number;
  pendingBalance: number;
  perCapita: number;
  confirmedCount: number;
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function FinanceiroPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState<FinancialStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [expensesRes, statsRes] = await Promise.all([
        fetch("/api/expenses"),
        fetch("/api/payments/stats"),
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
          pendingBalance: data.pendingBalance ?? 0,
          perCapita: data.perCapita ?? 0,
          confirmedCount: data.confirmedCount ?? 0,
        });
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
                return (
                  <div
                    key={expense.id}
                    className="card flex items-center gap-3 py-3 hover:shadow-lg transition-shadow duration-200"
                  >
                    {/* Ícone da categoria */}
                    <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0 text-lg">
                      {cat.emoji}
                    </div>

                    {/* Descrição + badge */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-foreground truncate">
                          {expense.description}
                        </p>
                        <span
                          className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${cat.bg} ${cat.text}`}
                        >
                          {cat.label}
                        </span>
                      </div>
                      {expense.receipt_url && (
                        <a
                          href={expense.receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-blue underline mt-0.5 inline-block"
                        >
                          Ver comprovante ↗
                        </a>
                      )}
                    </div>

                    {/* Valor */}
                    <p className="text-sm font-bold text-foreground shrink-0">
                      {formatCurrency(expense.amount)}
                    </p>
                  </div>
                );
              })}

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
    </PageContainer>
  );
}
