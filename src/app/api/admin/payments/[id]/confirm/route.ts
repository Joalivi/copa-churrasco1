import { createServiceClient } from "@/lib/supabase/server";
import { isValidUUID } from "@/lib/validators";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteContext) {
  const pin = request.headers.get("x-admin-pin");
  if (!pin) {
    return Response.json({ error: "PIN de admin obrigatorio" }, { status: 401 });
  }

  if (pin !== process.env.ADMIN_PIN) {
    return Response.json({ error: "PIN invalido" }, { status: 403 });
  }

  const { id: paymentId } = await params;

  if (!isValidUUID(paymentId)) {
    return Response.json({ error: "ID invalido" }, { status: 400 });
  }

  const serviceClient = await createServiceClient();

  // Valida que o payment existe, eh pix, e pega o user_id
  const { data: payment, error: fetchError } = await serviceClient
    .from("payments")
    .select("id, user_id, status, payment_method")
    .eq("id", paymentId)
    .single();

  if (fetchError || !payment) {
    return Response.json({ error: "Pagamento nao encontrado" }, { status: 404 });
  }

  if (payment.payment_method !== "pix") {
    return Response.json(
      { error: "Apenas pagamentos Pix podem ser confirmados manualmente" },
      { status: 400 }
    );
  }

  // Update atomico: so atualiza se ainda esta pending
  // Isso previne double-confirm em cliques simultaneos
  const { data: updated, error: updateError } = await serviceClient
    .from("payments")
    .update({
      status: "succeeded",
      completed_at: new Date().toISOString(),
    })
    .eq("id", paymentId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (updateError) {
    console.error("Erro ao atualizar payment:", updateError);
    return Response.json(
      { error: "Erro ao confirmar pagamento" },
      { status: 500 }
    );
  }

  if (!updated) {
    // Ninguem atualizado = ja tinha sido confirmado entre o SELECT e o UPDATE
    return Response.json(
      { error: "Pagamento ja confirmado" },
      { status: 409 }
    );
  }

  // Se tem item tipo "aviso", confirma o usuario
  const { data: paymentItems } = await serviceClient
    .from("payment_items")
    .select("item_type")
    .eq("payment_id", paymentId);

  const temAviso = (paymentItems || []).some((i) => i.item_type === "aviso");
  if (temAviso) {
    const { error: userUpdateError } = await serviceClient
      .from("users")
      .update({ status: "confirmed" })
      .eq("id", payment.user_id);

    if (userUpdateError) {
      console.error("Erro ao confirmar usuario:", userUpdateError);
    }
  }

  return Response.json({ success: true });
}
