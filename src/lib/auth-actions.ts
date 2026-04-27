import { invalidateBalanceCache } from "@/hooks/use-user-balance";
import { createClient } from "@/lib/supabase/client";

const USER_ID_KEY = "copa_user_id";
const USER_NAME_KEY = "copa_user_name";

/**
 * Limpa toda a identidade local do usuario:
 * - localStorage (id + nome)
 * - cache do badge no bottom nav
 * - sessao Supabase Auth (login com Google, se existir)
 *
 * Idempotente — chamadas repetidas sao seguras.
 *
 * NAO faz redirect — quem chama decide pra onde ir (com ou sem ?expired=1).
 */
export async function logout(): Promise<void> {
  if (typeof window !== "undefined") {
    localStorage.removeItem(USER_ID_KEY);
    localStorage.removeItem(USER_NAME_KEY);
  }
  invalidateBalanceCache();
  try {
    await createClient().auth.signOut();
  } catch {
    // signOut pode falhar (ex: sem sessao Supabase Auth) — localStorage ja esta limpo
  }
}
