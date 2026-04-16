"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

interface PhaseState {
  eventStatus: "open" | "closed";
  avisoPaid: boolean;
  balance: number;
}

export function PhaseBar() {
  const [state, setState] = useState<PhaseState | null>(null);

  useEffect(() => {
    const userId =
      typeof window !== "undefined"
        ? localStorage.getItem("copa_user_id")
        : null;
    if (!userId) return;

    Promise.all([
      fetch(`/api/user-summary?user_id=${userId}`).then((r) =>
        r.ok ? r.json() : null
      ),
      fetch("/api/admin/event-status").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([summary, status]) => {
        if (summary && status) {
          setState({
            eventStatus: status.status as "open" | "closed",
            avisoPaid: summary.aviso_paid,
            balance: summary.balance,
          });
        }
      })
      .catch(() => {});
  }, []);

  if (!state) return null;

  const { eventStatus, avisoPaid, balance } = state;

  if (eventStatus === "open" && !avisoPaid) {
    return (
      <Link
        href="/pagamento"
        className="w-full text-center px-4 py-2 text-xs font-medium bg-amber-50 border-b border-amber-200 text-amber-800 block hover:bg-amber-100 transition-colors"
      >
        ⚠️ Confirme sua presença pagando o aviso — R$35,00 →
      </Link>
    );
  }

  if (eventStatus === "open" && avisoPaid) {
    return (
      <div className="w-full text-center px-4 py-2 text-xs font-medium bg-green/10 border-b border-green/20 text-green">
        ✅ Você está confirmado! Atividades e bolão liberados.
      </div>
    );
  }

  if (eventStatus === "closed" && balance > 0) {
    return (
      <Link
        href="/pagamento"
        className="w-full text-center px-4 py-2 text-xs font-medium bg-amber-50 border-b border-amber-200 text-amber-800 block hover:bg-amber-100 transition-colors"
      >
        🔔 Evento encerrado. Você tem {formatCurrency(balance)} a pagar →
      </Link>
    );
  }

  // Evento fechado e tudo pago
  return (
    <div className="w-full text-center px-4 py-2 text-xs font-medium bg-green/10 border-b border-green/20 text-green">
      🎉 Tudo pago! Bora churrar! 🔥
    </div>
  );
}
