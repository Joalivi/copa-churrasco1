"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth-actions";

/**
 * Componente invisivel que valida a sessao do usuario uma vez por mount
 * do RootLayout (efetivamente uma vez por sessao de browser).
 *
 * Caso o copa_user_id no localStorage NAO corresponda a nenhum registro
 * no banco (HTTP 404 do /api/user-summary), faz logout local e redireciona
 * pra /confirmar?expired=1.
 *
 * Trata APENAS 404 — outros status (5xx, network) sao transientes e nao
 * devem deslogar o usuario.
 */
export function SessionGuard() {
  const router = useRouter();
  const validatedRef = useRef(false);

  useEffect(() => {
    // Guard contra StrictMode dev double-mount
    if (validatedRef.current) return;
    validatedRef.current = true;

    const userId = localStorage.getItem("copa_user_id");
    if (!userId) return;

    const controller = new AbortController();

    fetch(`/api/user-summary?user_id=${userId}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        if (res.status === 404) {
          await logout();
          router.replace("/confirmar?expired=1");
        }
        // Outros status (200, 5xx) — pagina trata
      })
      .catch(() => {
        // abort ou network error — ignorar (transiente)
      });

    return () => controller.abort();
  }, [router]);

  return null;
}
