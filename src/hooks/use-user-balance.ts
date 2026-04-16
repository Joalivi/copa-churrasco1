"use client";

import { useEffect, useState } from "react";

// Cache de módulo para evitar múltiplos fetches entre componentes
let cachedCount: number | null = null;
let cachedUserId: string | null = null;
let cacheTime = 0;
const CACHE_TTL = 120_000; // 2 minutos

/**
 * Retorna a quantidade de itens pendentes de pagamento do usuário.
 * Usado pelo NavBadge para mostrar a bolinha vermelha com contagem.
 */
export function useUserBalance(): number | null {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const userId =
      typeof window !== "undefined"
        ? localStorage.getItem("copa_user_id")
        : null;

    if (!userId) return;

    // Retornar cache se for do mesmo usuário e não expirou
    const now = Date.now();
    if (
      cachedUserId === userId &&
      cachedCount !== null &&
      now - cacheTime < CACHE_TTL
    ) {
      setCount(cachedCount);
      return;
    }

    fetch(`/api/user-summary?user_id=${userId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;

        // Coletar IDs de itens já pagos
        const actividadesPagas = new Set<string>();
        const boloesPagos = new Set<string>();
        let avisoPago = data.aviso_paid || false;
        let expensePago = false;

        for (const pagamento of data.payments || []) {
          if (pagamento.status !== "succeeded") continue;
          for (const pi of pagamento.payment_items || []) {
            if (pi.item_type === "aviso") avisoPago = true;
            if (pi.item_type === "activity" && pi.item_id) actividadesPagas.add(pi.item_id);
            if (pi.item_type === "bolao" && pi.item_id) boloesPagos.add(pi.item_id);
            if (pi.item_type === "expense_share") expensePago = true;
          }
        }

        // Contar itens pendentes
        let pending = 0;
        if (!avisoPago) pending++;
        for (const checkin of data.activity_checkins || []) {
          if (!actividadesPagas.has(checkin.checkin_id)) pending++;
        }
        for (const ticket of data.bolao_tickets || []) {
          if (!boloesPagos.has(ticket.id)) pending++;
        }
        const totalExpenseShare =
          (data.expense_share || 0) + (data.rental_share || 0);
        if (totalExpenseShare > 0 && !expensePago) pending++;

        cachedCount = pending;
        cachedUserId = userId;
        cacheTime = Date.now();
        setCount(pending);
      })
      .catch(() => {});
  }, []);

  return count;
}

/** Invalida o cache para forçar refetch na próxima renderização */
export function invalidateBalanceCache() {
  cachedCount = null;
  cachedUserId = null;
  cacheTime = 0;
}
