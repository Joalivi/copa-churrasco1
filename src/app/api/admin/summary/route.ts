import { createServiceClient } from "@/lib/supabase/server";
import { calculateBottleCost } from "@/lib/utils";

const TOTAL_RENTAL = 1650;
const AVISO = 35;

export async function GET(request: Request) {
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

  // Buscar tudo em paralelo
  const [usersRes, activitiesRes, checkinsRes, expensesRes, paymentsRes, ticketsRes] =
    await Promise.all([
      serviceClient
        .from("users")
        .select("id, name")
        .eq("status", "confirmed")
        .order("name", { ascending: true }),
      serviceClient.from("activities").select("*"),
      serviceClient.from("activity_checkins").select("user_id, activity_id"),
      serviceClient.from("expenses").select("amount, category, split_among_all"),
      serviceClient
        .from("payments")
        .select("user_id, amount, status, payment_items(item_type, amount)")
        .eq("status", "succeeded"),
      serviceClient.from("bolao_tickets").select("user_id"),
    ]);

  if (usersRes.error) {
    return Response.json({ error: "Erro ao buscar usuarios" }, { status: 500 });
  }

  const users = usersRes.data || [];
  const activities = activitiesRes.data || [];
  const checkins = checkinsRes.data || [];
  const expenses = expensesRes.data || [];
  const payments = paymentsRes.data || [];
  const tickets = ticketsRes.data || [];
  const confirmedCount = users.length || 0;

  // Rateio de despesas (exceto aluguel)
  const splitExpenses = expenses.filter(
    (e) => e.split_among_all && e.category !== "aluguel"
  );
  const totalSplitExpenses = splitExpenses.reduce((sum, e) => sum + e.amount, 0);
  const expenseShare = confirmedCount > 0 ? totalSplitExpenses / confirmedCount : 0;

  // Rateio do aluguel (mesmo calculo do user-summary)
  const rentalShare = confirmedCount > 0 ? TOTAL_RENTAL / confirmedCount - AVISO : 0;

  // Contagem de checkins por atividade
  const checkinCountByActivity: Record<string, number> = {};
  checkins.forEach((c) => {
    checkinCountByActivity[c.activity_id] = (checkinCountByActivity[c.activity_id] || 0) + 1;
  });

  // Custo por atividade (por pessoa)
  const activityCostMap: Record<string, number> = {};
  for (const activity of activities) {
    const count = checkinCountByActivity[activity.id] || 0;
    if (count === 0) {
      activityCostMap[activity.id] = 0;
      continue;
    }
    if (activity.cost_type === "fixed") {
      activityCostMap[activity.id] = activity.cost_fixed || 0;
    } else if (activity.cost_type === "per_bottle") {
      activityCostMap[activity.id] = calculateBottleCost(
        count,
        activity.bottle_price || 0,
        activity.people_per_bottle || 1
      );
    } else if (activity.cost_type === "total_split") {
      activityCostMap[activity.id] = activity.total_cost ? activity.total_cost / count : 0;
    } else {
      activityCostMap[activity.id] = 0;
    }
  }

  // Agrupar bolao por usuario
  const ticketsByUser: Record<string, number> = {};
  for (const t of tickets) {
    ticketsByUser[t.user_id] = (ticketsByUser[t.user_id] || 0) + 1;
  }

  // Calcular total devido por usuario
  const userSummaries = users.map((user) => {
    // Base: rateio aluguel + despesas
    let totalOwed = rentalShare + expenseShare;

    // Adicionar custo de atividades
    const userCheckins = checkins.filter((c) => c.user_id === user.id);
    userCheckins.forEach((checkin) => {
      totalOwed += activityCostMap[checkin.activity_id] || 0;
    });

    // Adicionar bolao
    const bolaoTotal = (ticketsByUser[user.id] || 0) * 2;
    totalOwed += bolaoTotal;

    // Total pago (excluir aviso)
    const userPayments = payments.filter((p) => p.user_id === user.id);
    let totalPaid = 0;
    for (const p of userPayments) {
      const items = (p.payment_items || []) as Array<{
        item_type: string;
        amount: number;
      }>;
      if (items.length === 0) {
        totalPaid += p.amount;
      } else {
        totalPaid += items
          .filter((item) => item.item_type !== "aviso")
          .reduce((s, item) => s + item.amount, 0);
      }
    }

    return {
      id: user.id,
      name: user.name,
      total_owed: Math.round(totalOwed * 100) / 100,
      total_paid: Math.round(totalPaid * 100) / 100,
      balance: Math.round((totalPaid - totalOwed) * 100) / 100,
    };
  });

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalCollected = userSummaries.reduce((sum, u) => sum + u.total_paid, 0);
  const totalOutstanding = userSummaries.reduce(
    (sum, u) => sum + Math.max(0, u.total_owed - u.total_paid),
    0
  );

  return Response.json({
    users: userSummaries,
    totals: {
      total_expenses: Math.round(totalExpenses * 100) / 100,
      total_collected: Math.round(totalCollected * 100) / 100,
      total_outstanding: Math.round(totalOutstanding * 100) / 100,
    },
    confirmed_count: confirmedCount,
  });
}
