import { createClient } from "@/lib/supabase/server";
import { calculateBottleCost } from "@/lib/utils";

const TOTAL_RENTAL = 1650;
const AVISO = 35;

export async function GET() {
  const supabase = await createClient();

  const [
    confirmedRes,
    expensesRes,
    activitiesRes,
    allCheckinsRes,
    allTicketsRes,
    allPaymentsRes,
  ] = await Promise.all([
    supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("status", "confirmed"),
    supabase.from("expenses").select("*"),
    supabase.from("activities").select("*"),
    supabase.from("activity_checkins").select("user_id, activity_id"),
    supabase.from("bolao_tickets").select("user_id"),
    supabase
      .from("payments")
      .select("user_id, amount, status, payment_items(item_type, amount)")
      .eq("status", "succeeded"),
  ]);

  const confirmedCount = confirmedRes.count || 1;
  const expenses = expensesRes.data || [];
  const activities = activitiesRes.data || [];
  const allCheckins = allCheckinsRes.data || [];
  const allTickets = allTicketsRes.data || [];
  const allPayments = allPaymentsRes.data || [];

  // Despesas totais (todas, incluindo aluguel)
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Total arrecadado (soma de pagamentos succeeded, excluindo aviso)
  let totalCollected = 0;
  for (const payment of allPayments) {
    const items = (payment.payment_items || []) as Array<{
      item_type: string;
      amount: number;
    }>;
    if (items.length === 0) {
      totalCollected += payment.amount;
    } else {
      totalCollected += items
        .filter((item) => item.item_type !== "aviso")
        .reduce((s, item) => s + item.amount, 0);
    }
  }

  // Calcular total que cada pessoa deve (para saldo pendente)
  // Agrupar checkins por atividade para calcular custo por pessoa
  const checkinCountByActivity: Record<string, number> = {};
  for (const c of allCheckins) {
    checkinCountByActivity[c.activity_id] =
      (checkinCountByActivity[c.activity_id] || 0) + 1;
  }

  // Custo estimado de cada atividade
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
      activityCostMap[activity.id] =
        activity.total_cost ? activity.total_cost / count : 0;
    } else {
      activityCostMap[activity.id] = 0;
    }
  }

  // Despesas partilhadas (excluindo aluguel, pois aluguel tem rateio fixo)
  const splitExpenses = expenses.filter(
    (e) => e.split_among_all && e.category !== "aluguel"
  );
  const totalSplitExpenses = splitExpenses.reduce(
    (sum, e) => sum + e.amount,
    0
  );
  const expenseShare = confirmedCount > 0 ? totalSplitExpenses / confirmedCount : 0;
  const rentalShare = confirmedCount > 0 ? TOTAL_RENTAL / confirmedCount - AVISO : 0;

  // Calcular total de todos os usuarios confirmados
  // Agrupar checkins por usuario
  const checkinsByUser: Record<string, string[]> = {};
  for (const c of allCheckins) {
    if (!checkinsByUser[c.user_id]) checkinsByUser[c.user_id] = [];
    checkinsByUser[c.user_id].push(c.activity_id);
  }

  // Agrupar bolao por usuario
  const ticketsByUser: Record<string, number> = {};
  for (const t of allTickets) {
    ticketsByUser[t.user_id] = (ticketsByUser[t.user_id] || 0) + 1;
  }

  // Total owed de todos os usuarios confirmados
  const confirmedUsersRes = await supabase
    .from("users")
    .select("id")
    .eq("status", "confirmed");
  const confirmedUsers = confirmedUsersRes.data || [];

  let totalOwed = 0;
  for (const user of confirmedUsers) {
    const userCheckins = checkinsByUser[user.id] || [];
    const activityCost = userCheckins.reduce(
      (sum, actId) => sum + (activityCostMap[actId] || 0),
      0
    );
    const bolaoCost = (ticketsByUser[user.id] || 0) * 2;
    totalOwed += rentalShare + expenseShare + activityCost + bolaoCost;
  }

  return Response.json({
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    totalCollected: Math.round(totalCollected * 100) / 100,
    totalOwed: Math.round(totalOwed * 100) / 100,
    pendingBalance: Math.round((totalOwed - totalCollected) * 100) / 100,
    confirmedCount,
    perCapita: confirmedCount > 0
      ? Math.round((totalExpenses / confirmedCount) * 100) / 100
      : 0,
  });
}
