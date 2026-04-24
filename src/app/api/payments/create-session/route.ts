import { createClient, createServiceClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import {
  validateAndRecalcAmounts,
  type PaymentItem,
} from "@/lib/payment-helpers";
import { isValidUUID } from "@/lib/validators";

interface CreateSessionBody {
  userId: string;
  items: PaymentItem[];
}

export async function POST(request: Request) {
  let body: CreateSessionBody;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Corpo da requisicao invalido" },
      { status: 400 }
    );
  }

  const { userId, items } = body;

  if (
    !isValidUUID(userId) ||
    !items ||
    !Array.isArray(items) ||
    items.length === 0
  ) {
    return Response.json(
      { error: "userId e items sao obrigatorios" },
      { status: 400 }
    );
  }

  // Validar tipos permitidos
  const allowedTypes = new Set(["activity", "bolao", "expense_share", "aviso"]);
  for (const item of items) {
    if (!allowedTypes.has(item.type)) {
      return Response.json(
        { error: `Tipo de item invalido: ${item.type}` },
        { status: 400 }
      );
    }
  }

  // 1. Validar que o userId existe
  const supabase = await createClient();

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id, name")
    .eq("id", userId)
    .single();

  if (userError || !user) {
    return Response.json({ error: "Usuario nao encontrado" }, { status: 404 });
  }

  // 2. Recalcular valores no servidor (usar service client para bypass RLS)
  const serviceClient = await createServiceClient();

  let serverItems: Array<PaymentItem & { serverAmount: number }>;
  try {
    serverItems = await validateAndRecalcAmounts(items, serviceClient, userId);
  } catch (err) {
    console.error("Erro ao calcular valores no servidor:", err);
    return Response.json(
      { error: "Erro ao validar valores dos itens" },
      { status: 400 }
    );
  }

  // Soma em centavos (evita drift de floating point entre items e total)
  const totalCentavos = serverItems.reduce(
    (sum, item) => sum + Math.round(item.serverAmount * 100),
    0
  );
  const totalAmount = totalCentavos / 100;

  if (totalAmount <= 0) {
    return Response.json({ error: "Valor total invalido" }, { status: 400 });
  }

  // 3. Mapear items para line_items do Stripe (usando valor do SERVIDOR)
  const lineItems = serverItems.map((item) => ({
    price_data: {
      currency: "brl",
      product_data: { name: item.description },
      unit_amount: Math.round(item.serverAmount * 100),
    },
    quantity: 1,
  }));

  // 4. Inserir payment + payment_items ATOMICAMENTE via RPC (evita orphan
  // entre os dois inserts caso o processo morra no meio).
  const itemsForRpc = serverItems.map(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ({ serverAmount, ...rest }) => ({
      type: rest.type,
      id: rest.id ?? null,
      description: rest.description,
      amount: serverAmount,
    })
  );

  const { data: paymentId, error: rpcError } = await serviceClient.rpc(
    "create_pending_payment",
    {
      p_user_id: userId,
      p_amount: totalAmount,
      p_method: "card",
      p_items: itemsForRpc,
      p_pix_br_code: null,
      p_pix_txid: null,
    }
  );

  if (rpcError || !paymentId) {
    console.error("Erro ao criar payment+items atomico:", rpcError);
    return Response.json(
      { error: "Erro ao registrar pagamento" },
      { status: 500 }
    );
  }

  // 5. Criar sessao Stripe — metadata fica pequeno (fixo ~80 chars)
  // Sem payment_method_types: o Stripe usa os metodos ativados no Dashboard
  // (cartao, Apple Pay, Google Pay, Link etc).
  try {
    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded_page",
      redirect_on_completion: "if_required",
      line_items: lineItems,
      mode: "payment",
      currency: "brl",
      metadata: {
        userId,
        paymentId, // <- UUID de 36 chars, sempre cabe nos 500
      },
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/pagamento/sucesso?session_id={CHECKOUT_SESSION_ID}`,
    });

    // 6. Gravar o session_id no payment que acabamos de criar
    const { error: updateError } = await serviceClient
      .from("payments")
      .update({ stripe_session_id: session.id })
      .eq("id", paymentId);

    if (updateError) {
      console.error(
        "Erro ao gravar stripe_session_id no payment:",
        updateError
      );
      // Nao bloquear — webhook usa metadata.paymentId, nao precisa de session_id
    }

    return Response.json({ client_secret: session.client_secret });
  } catch (err) {
    // Rollback: se Stripe falhou, deletar o payment que criamos.
    // payment_items cascade delete automatico via FK ON DELETE CASCADE.
    console.error("Erro ao criar sessao Stripe:", err);
    await serviceClient.from("payments").delete().eq("id", paymentId);
    return Response.json(
      { error: "Erro ao criar sessao de pagamento" },
      { status: 500 }
    );
  }
}
