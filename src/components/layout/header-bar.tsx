"use client";

import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { logout } from "@/lib/auth-actions";

/**
 * Header global, in-flow no topo do <main>. Renderiza apenas quando
 * o usuario esta logado. Mostra "Olá, {nome}" + botão Sair.
 *
 * - Estilo identico ao botao que existia inline em /pagamento.
 * - Em /confirmar (pre-login), userId e null → header invisivel.
 * - Logout: chama logout() (compartilhado), sincroniza state local
 *   via clearUser, e redireciona pra /confirmar.
 */
export function HeaderBar() {
  const router = useRouter();
  const { userId, userName, isLoading, clearUser } = useCurrentUser();

  // Esconde durante loading (evita flash) e quando guest
  if (isLoading || !userId) return null;

  async function handleLogout() {
    await logout();
    clearUser();
    router.replace("/confirmar");
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-3 flex items-center justify-end gap-2">
      <span className="text-xs text-zinc-400 hidden sm:inline">
        Ola, {userName}
      </span>
      <button
        onClick={handleLogout}
        className="text-xs text-zinc-400 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
      >
        Sair
      </button>
    </div>
  );
}
