import { daysInMonth, monthKey as mk } from "./format";
import type { Expense, Category, Account, Budget, Subscription, SavingsGoal, Stats } from "./data-provider";

// =============================================================================
// computeStatsFromExpenses
// Calcula estadísticas a partir de un arreglo de gastos para cualquier rango
// de fechas. Usado para las vistas de semana, mes y año.
// =============================================================================

export function computeStatsFromExpenses(
  allExpenses: Expense[],
  prevExpenses: Expense[],
  accounts: Account[],
  budgets: Budget[],
  subscriptions: Subscription[],
  goals: SavingsGoal[],
  periodLabel: string,
  // Para tendencia: "day" = por día del mes, "week" = por día de la semana,
  // "month" = por mes del año
  trendMode: "day" | "week" | "month",
  // Referencia para construir la tendencia
  trendRef: Date
): Stats {
  const expenseList = allExpenses.filter((e) => e.type !== "income");
  const incomeList = allExpenses.filter((e) => e.type === "income");

  const totalSpent = expenseList.reduce((s, e) => s + e.amount, 0);
  const totalIncome = incomeList.reduce((s, e) => s + e.amount, 0);
  const prevTotalSpent = prevExpenses.filter((e) => e.type !== "income").reduce((s, e) => s + e.amount, 0);
  const variation = prevTotalSpent > 0 ? ((totalSpent - prevTotalSpent) / prevTotalSpent) * 100 : 0;

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const budgetRemaining = totalBudget - totalSpent;
  const totalSaved = totalIncome - totalSpent;

  // Categorías
  const catMap = new Map<string, Category>();
  for (const e of allExpenses) {
    if (e.category) catMap.set(e.categoryId, e.category);
  }

  const byCat: Record<string, { name: string; color: string; icon: string; total: number; count: number }> = {};
  for (const e of expenseList) {
    const c = catMap.get(e.categoryId);
    if (!byCat[e.categoryId]) {
      byCat[e.categoryId] = {
        name: c?.name || "Otros",
        color: c?.color || "slate",
        icon: c?.icon || "Wallet",
        total: 0,
        count: 0,
      };
    }
    byCat[e.categoryId].total += e.amount;
    byCat[e.categoryId].count += 1;
  }
  const topCategories = Object.values(byCat).sort((a, b) => b.total - a.total).slice(0, 8);

  // Tendencia
  const byDay = computeTrend(expenseList, trendMode, trendRef);

  // Por método
  const byMethod: Record<string, number> = {};
  for (const e of expenseList) {
    const m = e.paymentMethod || "cash";
    byMethod[m] = (byMethod[m] || 0) + e.amount;
  }

  // Por comercio
  const byMerch: Record<string, number> = {};
  for (const e of expenseList) {
    const name = e.merchantName || "Otro";
    byMerch[name] = (byMerch[name] || 0) + e.amount;
  }
  const topMerchants = Object.entries(byMerch)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Por cuenta
  const byAcc: Record<string, { name: string; total: number; color: string }> = {};
  for (const e of expenseList) {
    const id = e.accountId || "none";
    const name = e.account?.name || "Sin cuenta";
    const color = e.account?.color || "slate";
    if (!byAcc[id]) byAcc[id] = { name, total: 0, color };
    byAcc[id].total += e.amount;
  }

  // Budget usage
  const budgetUsage = budgets.map((b) => {
    const spent = expenseList
      .filter((e) => e.categoryId === b.categoryId)
      .reduce((s, e) => s + e.amount, 0);
    const c = catMap.get(b.categoryId);
    return {
      id: b.id,
      categoryId: b.categoryId,
      categoryName: c?.name || "Otros",
      categoryColor: c?.color || "slate",
      categoryIcon: c?.icon || "Wallet",
      amount: b.amount,
      spent,
      remaining: b.amount - spent,
      percentage: b.amount > 0 ? (spent / b.amount) * 100 : 0,
    };
  });

  // Comparación
  const prevByCat: Record<string, number> = {};
  for (const e of prevExpenses.filter((e) => e.type !== "income")) {
    prevByCat[e.categoryId] = (prevByCat[e.categoryId] || 0) + e.amount;
  }
  const categoryComparison = Object.entries(byCat).map(([catId, c]) => ({
    ...c,
    categoryId: catId,
    prev: prevByCat[catId] || 0,
    variation: prevByCat[catId] ? ((c.total - prevByCat[catId]) / prevByCat[catId]) * 100 : 0,
  })).sort((a, b) => b.total - a.total);

  // Promedios
  const daysElapsed = computeDaysElapsed(trendMode, trendRef);
  const avgDaily = daysElapsed > 0 ? totalSpent / daysElapsed : 0;
  const totalPeriodDays = computeTotalPeriodDays(trendMode, trendRef);
  const projectedMonth = avgDaily * totalPeriodDays;

  // Recent expenses
  const recentExpenses = [...allExpenses]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);

  return {
    month: periodLabel,
    summary: {
      totalBalance,
      totalSpent,
      totalIncome,
      prevTotalSpent,
      variation,
      totalBudget,
      budgetRemaining,
      budgetPercentage: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
      totalSaved,
      monthlyGoal: 0,
      expenseCount: expenseList.length,
      incomeCount: incomeList.length,
      avgDaily,
      avgWeekly: avgDaily * 7,
      avgMonthly: totalSpent,
      projectedMonth,
      subscriptionsTotal: subscriptions.reduce((s, x) => s + x.amount, 0),
    },
    topCategories,
    byDay,
    byMethod: Object.entries(byMethod).map(([method, total]) => ({ method, total })),
    topMerchants,
    byAccount: Object.values(byAcc),
    budgetUsage,
    categoryComparison,
    goals: goals as SavingsGoal[],
    recentExpenses,
  };
}

function computeTrend(
  expenses: Expense[],
  mode: "day" | "week" | "month",
  ref: Date
): Array<{ day: number; total: number }> {
  if (mode === "day") {
    // Por día del mes (para vista mensual)
    const totalDays = daysInMonth(ref);
    const byDay: Array<{ day: number; total: number }> = [];
    for (let d = 1; d <= totalDays; d++) byDay.push({ day: d, total: 0 });
    for (const e of expenses) {
      const d = new Date(e.date).getDate();
      byDay[d - 1].total += e.amount;
    }
    return byDay;
  }

  if (mode === "week") {
    // Por día de la semana (7 días: Lun-Dom)
    // day: 1=Lunes ... 7=Domingo
    const byDay: Array<{ day: number; total: number }> = [];
    for (let d = 1; d <= 7; d++) byDay.push({ day: d, total: 0 });
    for (const e of expenses) {
      const dow = new Date(e.date).getDay(); // 0=Dom ... 6=Sab
      const idx = dow === 0 ? 6 : dow - 1; // 0=Lun ... 6=Dom
      byDay[idx].total += e.amount;
    }
    return byDay;
  }

  // month: por mes del año (1-12)
  const byDay: Array<{ day: number; total: number }> = [];
  for (let m = 1; m <= 12; m++) byDay.push({ day: m, total: 0 });
  for (const e of expenses) {
    const m = new Date(e.date).getMonth(); // 0-11
    byDay[m].total += e.amount;
  }
  return byDay;
}

function computeDaysElapsed(mode: "day" | "week" | "month", ref: Date): number {
  const now = new Date();
  if (mode === "day") {
    // Mes: días transcurridos del mes
    if (ref.getMonth() === now.getMonth() && ref.getFullYear() === now.getFullYear()) {
      return now.getDate();
    }
    return daysInMonth(ref);
  }
  if (mode === "week") {
    // Semana: días transcurridos de la semana (Lun-Dom)
    const start = startOfWeek(ref);
    const daysSinceStart = Math.floor((now.getTime() - start.getTime()) / 86400000) + 1;
    return Math.max(1, Math.min(7, daysSinceStart));
  }
  // Año: meses transcurridos
  if (ref.getFullYear() === now.getFullYear()) {
    return now.getMonth() + 1;
  }
  return 12;
}

function computeTotalPeriodDays(mode: "day" | "week" | "month", ref: Date): number {
  if (mode === "day") return daysInMonth(ref);
  if (mode === "week") return 7;
  return 365;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Utilidades para rangos de fechas según el periodo
export function getPeriodRange(period: "month" | "week" | "year", ref: Date): { start: Date; end: Date } {
  if (period === "week") {
    const start = startOfWeek(ref);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  if (period === "year") {
    const start = new Date(ref.getFullYear(), 0, 1);
    const end = new Date(ref.getFullYear(), 11, 31, 23, 59, 59, 999);
    return { start, end };
  }
  // month
  const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export function getPrevPeriodRange(period: "month" | "week" | "year", ref: Date): { start: Date; end: Date } {
  if (period === "week") {
    const prev = new Date(ref);
    prev.setDate(prev.getDate() - 7);
    return getPeriodRange("week", prev);
  }
  if (period === "year") {
    const prev = new Date(ref.getFullYear() - 1, 0, 1);
    return getPeriodRange("year", prev);
  }
  const prev = new Date(ref.getFullYear(), ref.getMonth() - 1, 1);
  return getPeriodRange("month", prev);
}

export function shiftPeriod(period: "month" | "week" | "year", ref: Date, direction: -1 | 1): Date {
  if (period === "week") {
    const d = new Date(ref);
    d.setDate(d.getDate() + direction * 7);
    return d;
  }
  if (period === "year") {
    return new Date(ref.getFullYear() + direction, ref.getMonth(), 1);
  }
  return new Date(ref.getFullYear(), ref.getMonth() + direction, 1);
}

export function formatPeriodLabel(period: "month" | "week" | "year", ref: Date): string {
  if (period === "week") {
    const { start, end } = getPeriodRange("week", ref);
    const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
    const s = start.toLocaleDateString("es-MX", opts);
    const e = end.toLocaleDateString("es-MX", opts);
    return `${s} - ${e}`;
  }
  if (period === "year") {
    return String(ref.getFullYear());
  }
  return ref.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
}
