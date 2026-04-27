"use client";

import { useSearchParams } from "next/navigation";

/**
 * Banner mostrado em /confirmar?expired=1 — disparado pelo SessionGuard
 * quando detecta sessao orfã (user_id no localStorage que nao existe mais).
 *
 * Renderizar dentro de <Suspense> em /confirmar/page.tsx (Next 16 exige
 * Suspense ao redor de useSearchParams).
 */
export function ExpiredBanner() {
  const params = useSearchParams();
  if (params.get("expired") !== "1") return null;

  return (
    <div className="card bg-yellow/10 border border-yellow/30">
      <p className="text-sm text-foreground">
        ⚠️ Sua sessão expirou. Confirme presença novamente para continuar.
      </p>
    </div>
  );
}
