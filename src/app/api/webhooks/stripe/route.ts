import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";
import { criarPaymentItems } from "@/lib/payment-helpers";

// IMPORTANTE: não usar request.json() — o Stripe precisa do corpo bruto para validar a assinatura
export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return Response.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

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

    // Helper: resolver paymentId (achado ou inserido)
    async function resolvePaymentId(): Promise<string | null> {
      if (payment?.id) return payment.id;

      // Update nao bateu em nenhuma row. Pode ser que:
      // (a) webhook chegou antes do insert do create-session — precisa inserir
      // (b) pagamento ja foi processado antes — just return existing id
      const { data: existing } = await supabase
        .from("payments")
        .select("id, status")
        .eq("stripe_session_id", session.id)
        .maybeSingle();

      if (existing) {
        // Caso (b): pagamento existe. Se status != succeeded, atualiza.
        if (existing.status !== "succeeded") {
          await supabase
            .from("payments")
            .update({
              status: "succeeded",
              stripe_payment_intent_id: session.payment_intent as string | null,
              completed_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
        }
        return existing.id;
      }

      // Caso (a): webhook chegou antes do insert de create-session.
      // Usar UPSERT na unique constraint de stripe_session_id previne duplicatas.
      const totalCentavos = items.reduce(
        (sum, item) => sum + Math.round(item.amount * 100),
        0
      );

      const { data: upserted, error: upsertError } = await supabase
        .from("payments")
        .upsert(
          {
            user_id: userId,
            amount: totalCentavos / 100,
            stripe_session_id: session.id,
            stripe_payment_intent_id: session.payment_intent as string | null,
            status: "succeeded",
            payment_method: "card",
            completed_at: new Date().toISOString(),
          },
          { onConflict: "stripe_session_id" }
        )
        .select("id")
        .single();

      if (upsertError || !upserted) {
        console.error("Erro critico ao upsert payment:", upsertError);
        return null;
      }
      return upserted.id;
    }

    const paymentId = await resolvePaymentId();
    if (!paymentId) {
      return Response.json(
        { error: "Erro ao processar pagamento" },
        { status: 500 }
      );
    }

    // Insere payment_items se ainda nao existem (idempotente)
    const { count: itemCount } = await supabase
      .from("payment_items")
      .select("id", { count: "exact", head: true })
      .eq("payment_id", paymentId);

    if ((itemCount ?? 0) === 0) {
      const itemsResult = await criarPaymentItems(supabase, paymentId, items);
      if (!itemsResult.ok) {
        console.error("[webhook] Falha ao inserir payment_items:", itemsResult.error);
        // Stripe vai retentar; proxima tentativa cai no branch de "items ja existem"
        return Response.json({ error: "Retry" }, { status: 500 });
      }
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
