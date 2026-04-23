import { createServiceClient } from "@/lib/supabase/server";
import { gerarPixBRCode, gerarTxid } from "@/lib/pix";
import {
  criarPaymentItems,
  validateAndRecalcAmounts,
  type PaymentItem,
} from "@/lib/payment-helpers";
import { isValidUUID } from "@/lib/validators";
import QRCode from "qrcode";

interface CreatePixBody {
  userId: string;
  items: PaymentItem[];
}

export async function POST(request: Request) {
  let body: CreatePixBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Corpo da requisicao invalido" }, { status: 400 });
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

  // Valida tipos
  const allowedTypes = new Set(["activity", "bolao", "expense_share", "aviso"]);
  for (const item of items) {
    if (!allowedTypes.has(item.type)) {
      return Response.json(
        { error: `Tipo de item invalido: ${item.type}` },
        { status: 400 }
      );
    }
  }

  // Env vars do Pix
  const pixKey = process.env.PIX_KEY;
  const merchantName = process.env.PIX_MERCHANT_NAME;
  const merchantCity = process.env.PIX_MERCHANT_CITY;

  if (!pixKey || !merchantName || !merchantCity) {
    console.error("PIX_KEY / PIX_MERCHANT_NAME / PIX_MERCHANT_CITY nao configurados");
    return Response.json(
      { error: "Pix nao configurado no servidor" },
      { status: 500 }
    );
  }

  const serviceClient = await createServiceClient();

  // Valida user
  const { data: user, error: userError } = await serviceClient
    .from("users")
    .select("id, name")
    .eq("id", userId)
    .single();

  if (userError || !user) {
    return Response.json({ error: "Usuario nao encontrado" }, { status: 404 });
  }

  // Recalcula amounts
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

  // Gera txid unico
  const txid = gerarTxid();

  // Gera BR Code
  let brCode: string;
  try {
    brCode = gerarPixBRCode({
      chave: pixKey,
      nome: merchantName,
      cidade: merchantCity,
      valor: totalAmount,
      txid,
    });
  } catch (err) {
    console.error("Erro ao gerar BR Code:", err);
    return Response.json(
      { error: "Erro ao gerar codigo Pix" },
      { status: 500 }
    );
  }

  // Gera QR como data URL
  let qrDataUrl: string;
  try {
    qrDataUrl = await QRCode.toDataURL(brCode, {
      errorCorrectionLevel: "M",
      width: 300,
      margin: 1,
    });
  } catch (err) {
    console.error("Erro ao gerar QR code:", err);
    return Response.json({ error: "Erro ao gerar QR code" }, { status: 500 });
  }

  // Insere payment (pending)
  const { data: payment, error: paymentError } = await serviceClient
    .from("payments")
    .insert({
      user_id: userId,
      amount: totalAmount,
      pix_br_code: brCode,
      pix_txid: txid,
      status: "pending",
      payment_method: "pix",
    })
    .select("id")
    .single();

  if (paymentError || !payment) {
    console.error("Erro ao criar payment:", paymentError);
    return Response.json(
      { error: "Erro ao registrar pagamento" },
      { status: 500 }
    );
  }

  // Insere payment_items imediatamente (nao tem webhook pra fazer isso)
  const paymentItems: PaymentItem[] = serverItems.map(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ({ serverAmount, ...rest }) => ({
      ...rest,
      amount: serverAmount,
    })
  );

  await criarPaymentItems(serviceClient, payment.id, paymentItems);

  return Response.json({
    paymentId: payment.id,
    brCode,
    qrDataUrl,
    amount: totalAmount,
    txid,
  });
}
