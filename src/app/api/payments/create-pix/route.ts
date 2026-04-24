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

  // Env vars do Pix (trim pra evitar espaços que bugam o EMV)
  const pixKey = process.env.PIX_KEY?.trim();
  const merchantName = process.env.PIX_MERCHANT_NAME?.trim();
  const merchantCity = process.env.PIX_MERCHANT_CITY?.trim();

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

  // Somar em centavos pra evitar drift de precisao floating-point
  const totalCentavos = serverItems.reduce(
    (sum, item) => sum + Math.round(item.serverAmount * 100),
    0
  );
  const totalAmount = totalCentavos / 100;

  if (totalAmount <= 0) {
    return Response.json({ error: "Valor total invalido" }, { status: 400 });
  }

  // Insere payment com retry em caso de colisao de txid (raro mas possivel)
  let paymentId: string | null = null;
  let finalTxid = "";
  let finalBrCode = "";
  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const candidateTxid = gerarTxid();

    let candidateBrCode: string;
    try {
      candidateBrCode = gerarPixBRCode({
        chave: pixKey,
        nome: merchantName,
        cidade: merchantCity,
        valor: totalAmount,
        txid: candidateTxid,
      });
    } catch (err) {
      console.error("Erro ao gerar BR Code:", err);
      return Response.json(
        { error: "Erro ao gerar codigo Pix" },
        { status: 500 }
      );
    }

    const { data: payment, error: paymentError } = await serviceClient
      .from("payments")
      .insert({
        user_id: userId,
        amount: totalAmount,
        pix_br_code: candidateBrCode,
        pix_txid: candidateTxid,
        status: "pending",
        payment_method: "pix",
      })
      .select("id")
      .single();

    if (!paymentError && payment) {
      paymentId = payment.id;
      finalTxid = candidateTxid;
      finalBrCode = candidateBrCode;
      break;
    }

    // 23505 = unique violation em Postgres — retry
    if (paymentError?.code === "23505") {
      console.warn(`Colisao de pix_txid, retry ${attempt + 1}/${maxRetries}`);
      continue;
    }

    console.error("Erro ao criar payment:", paymentError);
    return Response.json(
      { error: "Erro ao registrar pagamento" },
      { status: 500 }
    );
  }

  if (!paymentId) {
    console.error("Falha em gerar txid unico apos retries");
    return Response.json(
      { error: "Erro ao registrar pagamento" },
      { status: 500 }
    );
  }

  // Gera QR como data URL
  let qrDataUrl: string;
  try {
    qrDataUrl = await QRCode.toDataURL(finalBrCode, {
      errorCorrectionLevel: "M",
      width: 300,
      margin: 1,
    });
  } catch (err) {
    console.error("Erro ao gerar QR code:", err);
    // Rollback: o payment foi inserido mas QR falhou
    await serviceClient.from("payments").delete().eq("id", paymentId);
    return Response.json({ error: "Erro ao gerar QR code" }, { status: 500 });
  }

  // Insere payment_items imediatamente (nao tem webhook pra fazer isso)
  const paymentItems: PaymentItem[] = serverItems.map(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ({ serverAmount, ...rest }) => ({
      ...rest,
      amount: serverAmount,
    })
  );

  const itemsResult = await criarPaymentItems(
    serviceClient,
    paymentId,
    paymentItems
  );

  if (!itemsResult.ok) {
    // Rollback: nao deixar payment "fantasma" sem items
    await serviceClient.from("payments").delete().eq("id", paymentId);
    return Response.json(
      { error: "Erro ao registrar itens do pagamento" },
      { status: 500 }
    );
  }

  return Response.json({
    paymentId,
    brCode: finalBrCode,
    qrDataUrl,
    amount: totalAmount,
    txid: finalTxid,
  });
}
