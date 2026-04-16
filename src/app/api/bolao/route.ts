import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const [ticketsRes, paidItemsRes] = await Promise.all([
    supabase
      .from("bolao_tickets")
      .select("*, users(id, name, photo_url)")
      .order("created_at", { ascending: false }),
    supabase
      .from("payment_items")
      .select("item_id, payments!inner(status)")
      .eq("item_type", "bolao")
      .eq("payments.status", "succeeded"),
  ]);

  if (ticketsRes.error) {
    return Response.json(
      { error: "Erro ao buscar palpites" },
      { status: 500 }
    );
  }

  const tickets = ticketsRes.data || [];
  const paidTicketIds = new Set(
    (paidItemsRes.data || []).map((pi: { item_id: string }) => pi.item_id)
  );

  const paidTickets = tickets.filter((t) => paidTicketIds.has(t.id));
  const pendingTickets = tickets.filter((t) => !paidTicketIds.has(t.id));

  // Agregar contagem por combinacao de placar (apenas pagos)
  const scoreCounts: Record<string, number> = {};
  for (const ticket of paidTickets) {
    const key = `${ticket.home_score}x${ticket.away_score}`;
    scoreCounts[key] = (scoreCounts[key] || 0) + 1;
  }

  return Response.json({
    tickets: paidTickets,
    pendingTickets,
    scoreCounts,
    totalTickets: paidTickets.length,
    totalPending: pendingTickets.length,
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json();
  const { user_id, home_score, away_score } = body;

  if (!user_id || home_score === undefined || away_score === undefined) {
    return Response.json(
      { error: "user_id, home_score e away_score sao obrigatorios" },
      { status: 400 }
    );
  }

  if (
    home_score < 0 ||
    home_score > 4 ||
    away_score < 0 ||
    away_score > 4
  ) {
    return Response.json(
      { error: "Placar deve ser entre 0 e 4" },
      { status: 400 }
    );
  }

  // Validar limites de tickets por usuário
  const { data: existingTickets, error: ticketsError } = await supabase
    .from("bolao_tickets")
    .select("id, home_score, away_score")
    .eq("user_id", user_id);

  if (ticketsError) {
    return Response.json(
      { error: "Erro ao verificar palpites existentes" },
      { status: 500 }
    );
  }

  const userTickets = existingTickets || [];

  // Max 10 tickets total por usuário
  if (userTickets.length >= 10) {
    return Response.json(
      { error: "Limite de 10 palpites por usuário atingido" },
      { status: 409 }
    );
  }

  // Max 5 tickets por combinação de placar
  const sameScoreCount = userTickets.filter(
    (t) => t.home_score === home_score && t.away_score === away_score
  ).length;

  if (sameScoreCount >= 5) {
    return Response.json(
      {
        error: `Limite de 5 palpites para o placar ${home_score}x${away_score} atingido`,
      },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from("bolao_tickets")
    .insert({
      user_id,
      home_score,
      away_score,
      cost: 2.0,
    })
    .select()
    .single();

  if (error) {
    return Response.json(
      { error: "Erro ao registrar palpite" },
      { status: 500 }
    );
  }

  return Response.json(data, { status: 201 });
}
