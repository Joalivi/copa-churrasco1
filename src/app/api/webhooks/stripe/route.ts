import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";

// IMPORTANTE: nao usar request.json() — o Stripe precisa do corpo bruto para validar a assinatura
export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return Response.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET nao configurado");
    return Response.json(
      { error: "Webhook secret nao configurado" },
      { status: 500 }
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("Assinatura do webhook invalida:", err);
    return Response.json({ error: "Assinatura invalida" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    // Outros eventos nao tratados — responder 200 pra Stripe nao retentar
    return Response.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const metadata = session.metadata ?? {};
  const paymentId = metadata.paymentId;

  if (!paymentId) {
    console.warn(
      `[stripe-webhook] session ${session.id} sem paymentId no metadata. ` +
      `Provavelmente session antiga (pre-refactor) ou criada fora do fluxo. Ignorando.`
    );
    return Response.json({ received: true });
  }

  const supabase = await createServiceClient();

  // UPDATE atomico com guard: so atualiza se ainda esta pending.
  // Previne double-execution dos side-effects (aviso → confirmed) em retries do Stripe.
  const { data: updated, error: updateError } = await supabase
    .from("payments")
    .update({
      status: "succeeded",
      stripe_session_id: session.id,
      stripe_payment_intent_id: session.payment_intent as string | null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", paymentId)
    .eq("status", "pending")
    .select("id, user_id")
    .maybeSingle();

  if (updateError) {
    console.error("[stripe-webhook] erro ao atualizar payment:", updateError);
    return Response.json(
      { error: "Erro ao processar pagamento" },
      { status: 500 }
    );
  }

  if (!updated) {
    // Payment nao encontrado OU ja foi succeeded. Ambos casos sao OK —
    // Stripe esta retentando ou o fluxo foi processado por outra via.
    // Retornar 200 pra parar os retries do Stripe.
    return Response.json({ received: true, alreadyProcessed: true });
  }

  // Side-effect: se tem item tipo aviso, confirmar o usuario.
  // Idempotente por natureza, mas o guard acima garante que so roda uma vez por payment.
  const { data: paymentItems } = await supabase
    .from("payment_items")
    .select("item_type")
    .eq("payment_id", paymentId);

  const temAviso = (paymentItems ?? []).some((i) => i.item_type === "aviso");
  if (temAviso) {
    const { error: userUpdateError } = await supabase
      .from("users")
      .update({ status: "confirmed" })
      .eq("id", updated.user_id);

    if (userUpdateError) {
      console.error(
        "[stripe-webhook] erro ao confirmar usuario:",
        userUpdateError
      );
      // Nao retornar erro — payment ja foi marcado succeeded. Admin pode
      // confirmar manualmente o user se necessario.
    }
  }

  return Response.json({ received: true });
}
