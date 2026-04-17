import { createClient, createServiceClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { calculateBottleCost } from "@/lib/utils";
import { criarPaymentItems } from "@/lib/payment-helpers";

interface PaymentItemInput {
  type: "activity" | "bolao" | "expense_share" | "aviso";
  id?: string;
  description: string;
  amount: number; // em BRL (ex: 15.00) — NÃO confiável, servidor recalcula
}

interface CreateSessionBody {
  userId: string;
  items: PaymentItemInput[];
}

/**
 * Recalcula o valor de cada item no servidor, ignorando o amount enviado pelo client.
 * Retorna o valor correto em BRL (ex: 15.00).
 */
async function calculateServerAmount(
  item: PaymentItemInput,
  serviceClient: Awaited<ReturnType<typeof createServiceClient>>
): Promise<number> {
  switch (item.type) {
    case "aviso":
      return 35.0;

    case "bolao":
      return 2.0;

    case "activity": {
      if (!item.id) throw new Error("activity item sem id (checkin_id)");

      // item.id é o checkin_id — buscar o checkin e a atividade associada
      const { data: checkin, error: checkinError } = await serviceClient
        .from("activity_checkins")
        .select("*, activities(*)")
        .eq("id", item.id)
        .single();

      if (checkinError || !checkin) {
        throw new Error(`Checkin não encontrado: ${item.id}`);
      }

      const activity = checkin.activities as unknown as {
        id: string;
        cost_type: string;
        cost_fixed: number | null;
        bottle_price: number | null;
        people_per_bottle: number | null;
        total_cost: number | null;
      };

      // Contar total de checkins para esta atividade
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
      // Buscar total de despesas com split_among_all=true
      const { data: expenses } = await serviceClient
        .from("expenses")
        .select("amount, category")
        .eq("split_among_all", true);

      // Buscar contagem de usuários confirmados
      const { count: confirmedCount } = await serviceClient
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("status", "confirmed");

      const totalConfirmed = confirmedCount || 1;
      const allExpenses = expenses || [];

      // Rateio de despesas (exceto aluguel)
      const splitExpenses = allExpenses.filter((e) => e.category !== "aluguel");
      const totalSplitExpenses = splitExpenses.reduce(
        (sum, e) => sum + e.amount,
        0
      );
      const expenseShare = totalSplitExpenses / totalConfirmed;

      // Rateio do aluguel (mesmo cálculo do user-summary)
      const rentalShare = 1650 / totalConfirmed - 35;

      return Math.round((expenseShare + rentalShare) * 100) / 100;
    }

    default:
      throw new Error(`Tipo de item desconhecido: ${(item as PaymentItemInput).type}`);
  }
}

export async function POST(request: Request) {
  let body: CreateSessionBody;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Corpo da requisição inválido" }, { status: 400 });
  }

  const { userId, items } = body;

  if (!userId || !items || !Array.isArray(items) || items.length === 0) {
    return Response.json(
      { error: "userId e items são obrigatórios" },
      { status: 400 }
    );
  }

  // Validar tipos permitidos
  const allowedTypes = new Set(["activity", "bolao", "expense_share", "aviso"]);
  for (const item of items) {
    if (!allowedTypes.has(item.type)) {
      return Response.json(
        { error: `Tipo de item inválido: ${item.type}` },
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
    return Response.json(
      { error: "Usuário não encontrado" },
      { status: 404 }
    );
  }

  // 2. Recalcular valores no servidor (usar service client para bypass RLS)
  const serviceClient = await createServiceClient();

  let serverItems: Array<PaymentItemInput & { serverAmount: number }>;
  try {
    serverItems = await Promise.all(
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
  } catch (err) {
    console.error("Erro ao calcular valores no servidor:", err);
    return Response.json(
      { error: "Erro ao validar valores dos itens" },
      { status: 400 }
    );
  }

  // Calcular valor total com valores do servidor
  const totalAmount = serverItems.reduce((sum, item) => sum + item.serverAmount, 0);

  // ── TESTE: bypass Stripe, grava direto no banco ──
  // TODO: remover este bloco e o return abaixo para reabilitar Stripe em producao
  {
    const testSessionId = `test_${crypto.randomUUID()}`;
    const finalItems = serverItems.map(({ serverAmount, ...rest }) => ({
      ...rest,
      amount: serverAmount,
    }));

    const { data: payment, error: payError } = await serviceClient
      .from("payments")
      .insert({
        user_id: userId,
        amount: Math.round(totalAmount * 100) / 100,
        stripe_session_id: testSessionId,
        status: "succeeded",
        payment_method: "test",
        completed_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (payError || !payment) {
      console.error("Erro test mode ao inserir pagamento:", payError);
      return Response.json(
        { error: "Erro ao registrar pagamento (test mode)" },
        { status: 500 }
      );
    }

    await criarPaymentItems(serviceClient, payment.id, finalItems);

    // Se tem aviso, confirmar usuario
    if (finalItems.some((i) => i.type === "aviso")) {
      await serviceClient
        .from("users")
        .update({ status: "confirmed" })
        .eq("id", userId);
    }

    return Response.json({ test_mode: true });
  }

  // ── STRIPE (desabilitado para teste — codigo abaixo é unreachable) ──
  // Para reabilitar: remover o bloco de bypass acima (entre os comentarios TODO)
  // 3. Mapear items para line_items do Stripe (usando valor do SERVIDOR)
  const lineItems = serverItems.map((item) => ({
    price_data: {
      currency: "brl",
      product_data: { name: item.description },
      unit_amount: Math.round(item.serverAmount * 100), // converter para centavos
    },
    quantity: 1,
  }));

  try {
    // 4. Criar sessão de checkout no Stripe (Embedded mode)
    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded_page",
      redirect_on_completion: "if_required",
      line_items: lineItems,
      mode: "payment",
      currency: "brl",
      metadata: {
        userId,
        items: JSON.stringify(
          serverItems.map(({ serverAmount, ...rest }) => ({
            ...rest,
            amount: serverAmount,
          }))
        ),
      },
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/pagamento/sucesso?session_id={CHECKOUT_SESSION_ID}`,
    });

    // 5. Criar registro de pagamento pendente no banco de dados
    const { error: insertError } = await supabase.from("payments").insert({
      user_id: userId,
      amount: Math.round(totalAmount * 100) / 100,
      stripe_session_id: session.id,
      status: "pending",
      payment_method: "auto",
    });

    if (insertError) {
      console.error("Erro ao criar registro de pagamento:", insertError);
      // Não retornar erro — o webhook vai lidar com a confirmação
    }

    // 6. Retornar o client_secret para o Embedded Checkout
    return Response.json({ client_secret: session.client_secret });
  } catch (err) {
    console.error("Erro ao criar sessão Stripe:", err);
    return Response.json(
      { error: "Erro ao criar sessão de pagamento" },
      { status: 500 }
    );
  }
}
