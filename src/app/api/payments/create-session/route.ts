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

  // 1. Validar que o userId existe na tabela users
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

  const totalAmount =
    Math.round(
      serverItems.reduce((sum, item) => sum + item.serverAmount, 0) * 100
    ) / 100;

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

  try {
    // 4. Criar sessao de checkout no Stripe (Embedded).
    // payment_method_types NAO eh setado — com isso o Stripe usa
    // automaticamente os metodos que voce ativou no Dashboard
    // (Settings → Payment methods): cartao, Apple Pay, Google Pay, Link
    // etc, decidindo qual mostrar baseado no device/browser do user.
    // Ativar um novo metodo no futuro nao exige mudanca de codigo.
    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded_page",
      redirect_on_completion: "if_required",
      line_items: lineItems,
      mode: "payment",
      currency: "brl",
      metadata: {
        userId,
        items: JSON.stringify(
          serverItems.map(
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            ({ serverAmount, ...rest }) => ({
              ...rest,
              amount: serverAmount,
            })
          )
        ),
      },
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/pagamento/sucesso?session_id={CHECKOUT_SESSION_ID}`,
    });

    // 5. Criar registro de pagamento pendente
    const { error: insertError } = await supabase.from("payments").insert({
      user_id: userId,
      amount: totalAmount,
      stripe_session_id: session.id,
      status: "pending",
      payment_method: "card",
    });

    if (insertError) {
      console.error("Erro ao criar registro de pagamento:", insertError);
      // Nao retornar erro — o webhook vai lidar com a confirmacao (fallback de insert)
    }

    return Response.json({ client_secret: session.client_secret });
  } catch (err) {
    console.error("Erro ao criar sessao Stripe:", err);
    return Response.json(
      { error: "Erro ao criar sessao de pagamento" },
      { status: 500 }
    );
  }
}
