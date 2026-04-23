import { createClient } from "@/lib/supabase/server";
import { isValidUUID } from "@/lib/validators";

export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json();
  const { user_id, activity_id } = body;

  if (!isValidUUID(user_id) || !isValidUUID(activity_id)) {
    return Response.json(
      { error: "user_id e activity_id sao obrigatorios" },
      { status: 400 }
    );
  }

  // Verificar se o evento esta aberto
  const { data: config } = await supabase
    .from("admin_config")
    .select("value")
    .eq("key", "event_status")
    .single();

  if (config?.value === "closed") {
    return Response.json(
      { error: "Inscricoes encerradas" },
      { status: 403 }
    );
  }

  // Verificar limite de participantes
  const { data: activity } = await supabase
    .from("activities")
    .select("max_participants")
    .eq("id", activity_id)
    .single();

  if (activity?.max_participants) {
    const { count } = await supabase
      .from("activity_checkins")
      .select("id", { count: "exact", head: true })
      .eq("activity_id", activity_id);

    if (count !== null && count >= activity.max_participants) {
      return Response.json(
        { error: "Numero maximo de participantes atingido" },
        { status: 409 }
      );
    }
  }

  const { data, error } = await supabase
    .from("activity_checkins")
    .insert({ user_id, activity_id })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return Response.json(
        { error: "Voce ja esta inscrito nesta atividade" },
        { status: 409 }
      );
    }
    return Response.json(
      { error: "Erro ao realizar checkin" },
      { status: 500 }
    );
  }

  return Response.json(data, { status: 201 });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const body = await request.json();
  const { user_id, activity_id } = body;

  if (!isValidUUID(user_id) || !isValidUUID(activity_id)) {
    return Response.json(
      { error: "user_id e activity_id sao obrigatorios" },
      { status: 400 }
    );
  }

  // Verificar se o evento esta aberto
  const { data: config } = await supabase
    .from("admin_config")
    .select("value")
    .eq("key", "event_status")
    .single();

  if (config?.value === "closed") {
    return Response.json(
      { error: "Inscricoes encerradas" },
      { status: 403 }
    );
  }

  const { error } = await supabase
    .from("activity_checkins")
    .delete()
    .eq("user_id", user_id)
    .eq("activity_id", activity_id);

  if (error) {
    return Response.json(
      { error: "Erro ao cancelar checkin" },
      { status: 500 }
    );
  }

  return Response.json({ success: true });
}
