import { createClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";
import { calculateBottleCost } from "@/lib/utils";
import { TOTAL_RENTAL, AVISO_PRICE } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("user_id");

  if (!userId) {
    return Response.json(
      { error: "user_id e obrigatorio" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  // Buscar dados em paralelo
  const [
    userRes,
    checkinsRes,
    activitiesRes,
    allCheckinsRes,
    ticketsRes,
    expensesRes,
    confirmedRes,
    paymentsRes,
  ] = await Promise.all([
    supabase.from("users").select("*").eq("id", userId).single(),
    supabase
      .from("activity_checkins")
      .select("*, activities(*)")
      .eq("user_id", userId),
    supabase.from("activities").select("*"),
    supabase.from("activity_checkins").select("activity_id"),
    supabase.from("bolao_tickets").select("*").eq("user_id", userId),
    supabase.from("expenses").select("*").eq("split_among_all", true),
    supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("status", "confirmed"),
    supabase
      .from("payments")
      .select("*, payment_items(*)")
      .eq("user_id", userId)
      .eq("status", "succeeded"),
  ]);

  if (userRes.error || !userRes.data) {
    return Response.json(
      { error: "Usuario nao encontrado" },
      { status: 404 }
    );
  }

  const user = userRes.data;
  const checkins = checkinsRes.data || [];
  const activities = activitiesRes.data || [];
  const allCheckins = allCheckinsRes.data || [];
  const tickets = ticketsRes.data || [];
  const expenses = expensesRes.data || [];
  const confirmedCount = confirmedRes.count || 1;
  const succeededPayments = paymentsRes.data || [];

  // Contar checkins por atividade (para calculo de custo)
  const checkinCountByActivity: Record<string, number> = {};
  for (const c of allCheckins) {
    checkinCountByActivity[c.activity_id] =
      (checkinCountByActivity[c.activity_id] || 0) + 1;
  }

  // Calcular custo de cada atividade do usuario
  interface CheckinWithCost {
    checkin_id: string;
    activity_id: string;
    activity_name: string;
    activity_emoji: string | null;
    cost_type: string;
    estimated_cost: number;
    total_checkins: number;
  }

  const activityCheckins: CheckinWithCost[] = checkins.map((checkin) => {
    const activity = checkin.activities as unknown as {
      id: string;
      name: string;
      emoji: string | null;
      cost_type: string;
      cost_fixed: number | null;
      bottle_price: number | null;
      people_per_bottle: number | null;
      total_cost: number | null;
      is_mandatory: boolean;
    };
    const totalCheckins = checkinCountByActivity[activity.id] || 1;

    let estimatedCost = 0;
    if (activity.cost_type === "fixed") {
      estimatedCost = activity.cost_fixed || 0;
    } else if (activity.cost_type === "per_bottle") {
      estimatedCost = calculateBottleCost(
        totalCheckins,
        activity.bottle_price || 0,
        activity.people_per_bottle || 1
      );
    } else if (activity.cost_type === "total_split") {
      estimatedCost =
        activity.total_cost ? activity.total_cost / totalCheckins : 0;
    }

    return {
      checkin_id: checkin.id,
      activity_id: activity.id,
      activity_name: activity.name,
      activity_emoji: activity.emoji,
      cost_type: activity.cost_type,
      estimated_cost: estimatedCost,
      total_checkins: totalCheckins,
    };
  });

  // Custo total de atividades
  const totalActivityCost = activityCheckins.reduce(
    (sum, c) => sum + c.estimated_cost,
    0
  );

  // Bolao
  const bolaoTotal = tickets.length * 2;

  // Rateio de despesas (exceto aluguel - aluguel ja eh tratado separado)
  const splitExpenses = expenses.filter(
    (e) => e.category !== "aluguel"
  );
  const totalSplitExpenses = splitExpenses.reduce(
    (sum, e) => sum + e.amount,
    0
  );
  const expenseShare =
    confirmedCount > 0 ? totalSplitExpenses / confirmedCount : 0;

  // Rateio do aluguel
  const rentalShare =
    confirmedCount > 0 ? TOTAL_RENTAL / confirmedCount - AVISO_PRICE : 0;

  // Total que deve
  const totalOwed =
    rentalShare + expenseShare + totalActivityCost + bolaoTotal;

  // Total pago (excluir pagamentos de aviso do calculo de balance)
  const totalPaid = succeededPayments.reduce((sum, p) => {
    const items = (p.payment_items || []) as Array<{
      item_type: string;
      amount: number;
    }>;
    const nonAvisoAmount = items
      .filter((item) => item.item_type !== "aviso")
      .reduce((s, item) => s + item.amount, 0);
    // Se nao tem items, usar o amount do pagamento (exceto se for exatamente 35 - provavel aviso)
    if (items.length === 0) {
      return sum + p.amount;
    }
    return sum + nonAvisoAmount;
  }, 0);

  // Saldo
  const balance = totalOwed - totalPaid;

  // Verificar se pagou aviso
  const avisoPaid = succeededPayments.some((p) => {
    const items = (p.payment_items || []) as Array<{ item_type: string }>;
    return items.some((item) => item.item_type === "aviso");
  });

  return Response.json({
    user,
    activity_checkins: activityCheckins,
    bolao_tickets: tickets.map((t) => ({
      id: t.id,
      home_score: t.home_score,
      away_score: t.away_score,
      cost: t.cost,
    })),
    expense_share: Math.round(expenseShare * 100) / 100,
    rental_share: Math.round(rentalShare * 100) / 100,
    total_activity_cost: Math.round(totalActivityCost * 100) / 100,
    bolao_total: bolaoTotal,
    total_owed: Math.round(totalOwed * 100) / 100,
    payments: succeededPayments,
    total_paid: Math.round(totalPaid * 100) / 100,
    balance: Math.round(balance * 100) / 100,
    confirmed_count: confirmedCount,
    aviso_paid: avisoPaid,
  });
}
