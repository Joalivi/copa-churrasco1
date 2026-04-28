import { SupabaseClient } from "@supabase/supabase-js";
import { calculateBottleCost } from "@/lib/utils";
import { TOTAL_RENTAL, AVISO_PRICE, TICKET_COST } from "@/lib/constants";

export interface PaymentItem {
  type: "activity" | "bolao" | "expense_share" | "aviso";
  id?: string;
  description: string;
  amount: number;
}

/**
 * Cria os registros de payment_items no banco.
 * Retorna { ok: true } em sucesso, { ok: false, error } em falha.
 * Callers DEVEM checar o retorno — falha silenciosa causa payment fantasma
 * (status=succeeded mas sem items = nenhum item do usuario marca como pago).
 */
export async function criarPaymentItems(
  supabase: SupabaseClient,
  paymentId: string,
  items: PaymentItem[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const paymentItemsToInsert = items.map((item) => ({
    payment_id: paymentId,
    item_type: item.type,
    item_id: item.id ?? null,
    description: item.description,
    amount: item.amount,
  }));

  const { error } = await supabase
    .from("payment_items")
    .insert(paymentItemsToInsert);

  if (error) {
    console.error("Erro ao criar payment_items:", { paymentId, error });
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/**
 * Recalcula o valor canonico de um item no servidor, ignorando o amount
 * enviado pelo client. Retorna o valor correto em BRL (ex: 15.00).
 *
 * Usado em create-session (cartao/Stripe) e create-pix (estatico).
 */
export async function calculateServerAmount(
  item: PaymentItem,
  serviceClient: SupabaseClient
): Promise<number> {
  switch (item.type) {
    case "aviso":
      return AVISO_PRICE;

    case "bolao":
      return TICKET_COST;

    case "activity": {
      if (!item.id) throw new Error("activity item sem id (checkin_id)");

      const { data: checkin, error: checkinError } = await serviceClient
        .from("activity_checkins")
        .select("*, activities(*)")
        .eq("id", item.id)
        .single();

      if (checkinError || !checkin) {
        throw new Error(`Checkin nao encontrado: ${item.id}`);
      }

      const activity = checkin.activities as unknown as {
        id: string;
        cost_type: string;
        cost_fixed: number | null;
        bottle_price: number | null;
        people_per_bottle: number | null;
        total_cost: number | null;
      };

      const { count: checkinCount } = await serviceClient
        .from("activity_checkins")
        .select("id", { count: "exact", head: true })
        .eq("activity_id", activity.id);

      const totalCheckins = checkinCount || 1;

      if (activity.cost_type === "fixed") {
        return activity.cost_fixed || 0;
      } else if (activity.cost_type === "per_bottle") {
        return calculateBottleCost(
          totalCheckins,
          activity.bottle_price || 0,
          activity.people_per_bottle || 1
        );
      } else if (activity.cost_type === "total_split") {
        return activity.total_cost ? activity.total_cost / totalCheckins : 0;
      }
      return 0;
    }

    case "expense_share": {
      const { data: expenses } = await serviceClient
        .from("expenses")
        .select("amount, category")
        .eq("split_among_all", true);

      const { count: confirmedCount } = await serviceClient
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("status", "confirmed");

      const totalConfirmed = confirmedCount ?? 0;
      if (totalConfirmed === 0) {
        // Sem confirmados, rateio nao eh pagavel.
        // UI ja esconde o item (totalExpenseShare > 0 gate); servidor defende
        // contra request malicioso ou cliente com cache stale.
        return 0;
      }
      const allExpenses = expenses || [];

      const splitExpenses = allExpenses.filter((e) => e.category !== "aluguel");
      const totalSplitExpenses = splitExpenses.reduce(
        (sum, e) => sum + e.amount,
        0
      );
      const expenseShare = totalSplitExpenses / totalConfirmed;
      const rentalShare = TOTAL_RENTAL / totalConfirmed - AVISO_PRICE;

      return Math.round((expenseShare + rentalShare) * 100) / 100;
    }

    default:
      throw new Error(
        `Tipo de item desconhecido: ${(item as PaymentItem).type}`
      );
  }
}

/**
 * Recalcula todos os amounts do lado do servidor e loga mismatches suspeitos.
 * Retorna os items com amount canonico substituido.
 */
export async function validateAndRecalcAmounts(
  items: PaymentItem[],
  serviceClient: SupabaseClient,
  userId: string
): Promise<Array<PaymentItem & { serverAmount: number }>> {
  return await Promise.all(
    items.map(async (item) => {
      const serverAmount = await calculateServerAmount(item, serviceClient);
      const roundedServer = Math.round(serverAmount * 100) / 100;
      const roundedClient = Math.round(item.amount * 100) / 100;

      if (roundedClient !== roundedServer) {
        console.warn(
          `[SECURITY] Amount mismatch for ${item.type}${item.id ? ` (id=${item.id})` : ""}: ` +
          `client sent R$${roundedClient.toFixed(2)}, server calculated R$${roundedServer.toFixed(2)}. ` +
          `Using server value. userId=${userId}`
        );
      }

      return { ...item, amount: roundedServer, serverAmount: roundedServer };
    })
  );
}
