import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("admin_config")
    .select("value")
    .eq("key", "event_status")
    .single();

  if (error) {
    return Response.json(
      { error: "Erro ao buscar status do evento" },
      { status: 500 }
    );
  }

  return Response.json({ status: data.value });
}

export async function PUT(request: Request) {
  const pin = request.headers.get("x-admin-pin");
  if (!pin) {
    return Response.json(
      { error: "PIN de admin obrigatorio" },
      { status: 401 }
    );
  }

  if (pin !== process.env.ADMIN_PIN) {
    return Response.json({ error: "PIN invalido" }, { status: 403 });
  }

  const serviceClient = await createServiceClient();

  const body = await request.json();
  const { status } = body;

  if (status !== "open" && status !== "closed") {
    return Response.json(
      { error: "Status deve ser 'open' ou 'closed'" },
      { status: 400 }
    );
  }

  const { error } = await serviceClient
    .from("admin_config")
    .update({ value: status })
    .eq("key", "event_status");

  if (error) {
    return Response.json(
      { error: "Erro ao atualizar status do evento" },
      { status: 500 }
    );
  }

  return Response.json({ status });
}
