import { SupabaseClient } from "@supabase/supabase-js";

export interface PaymentItem {
  type: "activity" | "bolao" | "expense_share" | "aviso";
  id?: string;
  description: string;
  amount: number;
}

/**
 * Cria os registros de payment_items no banco.
 * Compartilhado entre webhook Stripe e test-mode.
 */
export async function criarPaymentItems(
  supabase: SupabaseClient,
  paymentId: string,
  items: PaymentItem[]
) {
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
    console.error("Erro ao criar payment_items:", error);
  }
}
