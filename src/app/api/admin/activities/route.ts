import { createServiceClient } from "@/lib/supabase/server";

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
  const { id, total_cost, cost_fixed, max_participants, bottle_price, people_per_bottle } = body;

  if (!id) {
    return Response.json(
      { error: "id da atividade e obrigatorio" },
      { status: 400 }
    );
  }

  const updateData: Record<string, number | null> = {};

  if (total_cost !== undefined) updateData.total_cost = total_cost;
  if (cost_fixed !== undefined) updateData.cost_fixed = cost_fixed;
  if (max_participants !== undefined) updateData.max_participants = max_participants;
  if (bottle_price !== undefined) updateData.bottle_price = bottle_price;
  if (people_per_bottle !== undefined) updateData.people_per_bottle = people_per_bottle;

  if (Object.keys(updateData).length === 0) {
    return Response.json(
      { error: "Nenhum campo para atualizar" },
      { status: 400 }
    );
  }

  const { data, error } = await serviceClient
    .from("activities")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return Response.json(
      { error: "Erro ao atualizar atividade" },
      { status: 500 }
    );
  }

  return Response.json(data);
}
