import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";

// IMPORTANTE: não usar request.json() — o Stripe precisa do corpo bruto para validar a assinatura
export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET não configurado");
    return Response.json(
      { error: "Webhook secret não configurado" },
      { status: 500 }
    );
  }

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("Assinatura do webhook inválida:", err);
    return Response.json({ error: "Assinatura inválida" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata!;
    const { userId, items: itemsJson } = metadata;

    let items: Array<{
      type: "activity" | "bolao" | "expense_share" | "aviso";
      id?: string;
      description: string;
      amount: number;
    }>;

    try {
      items = JSON.parse(itemsJson);
    } catch {
      console.error("Erro ao parsear items do metadata:", itemsJson);
      return Response.json({ error: "Metadata inválido" }, { status: 400 });
    }

    // Usar service client para bypassar RLS no contexto do webhook
    const supabase = await createServiceClient();

    // Atualizar status do pagamento para 'succeeded'
    const { data: payment, error: updateError } = await supabase
      .from("payments")
      .update({
        status: "succeeded",
        stripe_payment_intent_id: session.payment_intent as string | null,
        completed_at: new Date().toISOString(),
      })
      .eq("stripe_session_id", session.id)
      .select("id")
      .single();

    if (updateError || !payment) {
      console.error("Erro ao atualizar pagamento:", updateError);
      // Tentar criar o registro caso não exista (fallback)
      const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
      const { data: inserted, error: insertError } = await supabase
        .from("payments")
        .insert({
          user_id: userId,
          amount: Math.round(totalAmount * 100) / 100,
          stripe_session_id: session.id,
          stripe_payment_intent_id: session.payment_intent as string | null,
          status: "succeeded",
          payment_method: "card",
          completed_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (insertError || !inserted) {
        console.error("Erro crítico ao inserir pagamento:", insertError);
        return Response.json(
          { error: "Erro ao processar pagamento" },
          { status: 500 }
        );
      }

      // Usar o id inserido
      const paymentId = inserted.id;
      await criarPaymentItems(supabase, paymentId, items);
    } else {
      // Criar registros de payment_items
      await criarPaymentItems(supabase, payment.id, items);
    }

    // Se algum item for do tipo 'aviso', atualizar status do usuário para 'confirmed'
    const temAviso = items.some((item) => item.type === "aviso");
    if (temAviso) {
      const { error: userUpdateError } = await supabase
        .from("users")
        .update({ status: "confirmed" })
        .eq("id", userId);

      if (userUpdateError) {
        console.error("Erro ao confirmar usuário:", userUpdateError);
      }
    }
  }

  return Response.json({ received: true });
}

// Função auxiliar para criar os payment_items
async function criarPaymentItems(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  paymentId: string,
  items: Array<{
    type: "activity" | "bolao" | "expense_share" | "aviso";
    id?: string;
    description: string;
    amount: number;
  }>
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
