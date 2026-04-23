import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const pin = request.headers.get("x-admin-pin");
  if (!pin) {
    return Response.json({ error: "PIN de admin obrigatorio" }, { status: 401 });
  }

  if (pin !== process.env.ADMIN_PIN) {
    return Response.json({ error: "PIN invalido" }, { status: 403 });
  }

  const serviceClient = await createServiceClient();

  const { data, error } = await serviceClient
    .from("payments")
    .select(
      `id,
       user_id,
       amount,
       status,
       payment_method,
       pix_txid,
       created_at,
       completed_at,
       users(id, name, photo_url),
       payment_items(id, item_type, item_id, description, amount)`
    )
    .eq("payment_method", "pix")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao buscar payments:", error);
    return Response.json(
      { error: "Erro ao buscar pagamentos" },
      { status: 500 }
    );
  }

  return Response.json(data);
}
