import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { monthKey, startOfMonth, endOfMonth, startOfWeek, daysInMonth, dayOfMonth } from "@/lib/format";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month") || monthKey();
  const [y, m] = month.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0, 23, 59, 59, 999);

  // Mes anterior para comparación
  const prevStart = new Date(y, m - 2, 1);
  const prevEnd = new Date(y, m - 1, 0, 23, 59, 59, 999);

  const [expenses, prevExpenses, accounts, budgets, subscriptions, goals] = await Promise.all([
    db.expense.findMany({
      where: { date: { gte: start, lte: end } },
      include: { category: true, merchant: true, account: true },
    }),
    db.expense.findMany({
      where: { date: { gte: prevStart, lte: prevEnd } },
      include: { category: true },
    }),
    db.account.findMany(),
    db.budget.findMany({
      where: { period: "monthly", month },
      include: { category: true },
    }),
    db.subscription.findMany({ where: { active: true } }),
    db.savingsGoal.findMany(),
  ]);

  // Separar egresos e ingresos
  const expenseList = expenses.filter((e) => e.type !== "income");
  const incomeList = expenses.filter((e) => e.type === "income");

  const totalSpent = expenseList.reduce((s, e) => s + e.amount, 0);
  const totalIncome = incomeList.reduce((s, e) => s + e.amount, 0);
  const prevTotalSpent = prevExpenses.filter((e) => e.type !== "income").reduce((s, e) => s + e.amount, 0);
  const variation = prevTotalSpent > 0 ? ((totalSpent - prevTotalSpent) / prevTotalSpent) * 100 : 0;

  // Saldo total de cuentas
  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  // Presupuesto total y restante
  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const budgetRemaining = totalBudget - totalSpent;

  // Ahorro real del mes = ingresos - egresos
  const totalSaved = totalIncome - totalSpent;

  // Meta mensual (si existe)
  const user = await db.user.findFirst();
  const monthlyGoal = user?.monthlyGoal || 0;

  // Top 5 categorías (solo egresos)
  const byCategory: Record<string, { name: string; color: string; icon: string; total: number; count: number }> = {};
  for (const e of expenseList) {
    const key = e.categoryId;
    if (!byCategory[key]) {
      byCategory[key] = {
        name: e.category.name,
        color: e.category.color,
        icon: e.category.icon,
        total: 0,
        count: 0,
      };
    }
    byCategory[key].total += e.amount;
    byCategory[key].count += 1;
  }
  const topCategories = Object.values(byCategory)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Gasto por día del mes (solo egresos)
  const totalDays = daysInMonth(start);
  const byDay: Array<{ day: number; total: number }> = [];
  for (let d = 1; d <= totalDays; d++) {
    byDay.push({ day: d, total: 0 });
  }
  for (const e of expenseList) {
    const d = new Date(e.date).getDate();
    byDay[d - 1].total += e.amount;
  }

  // Gasto por método de pago (solo egresos)
  const byMethod: Record<string, number> = {};
  for (const e of expenseList) {
    const m = e.paymentMethod || "cash";
    byMethod[m] = (byMethod[m] || 0) + e.amount;
  }

  // Gasto por comercio (top 10, solo egresos)
  const byMerchant: Record<string, number> = {};
  for (const e of expenseList) {
    const name = e.merchantName || "Otro";
    byMerchant[name] = (byMerchant[name] || 0) + e.amount;
  }
  const topMerchants = Object.entries(byMerchant)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Gasto por cuenta (solo egresos)
  const byAccount: Record<string, { name: string; total: number; color: string }> = {};
  for (const e of expenseList) {
    const id = e.accountId || "none";
    const name = e.account?.name || "Sin cuenta";
    const color = e.account?.color || "slate";
    if (!byAccount[id]) byAccount[id] = { name, total: 0, color };
    byAccount[id].total += e.amount;
  }

  // Presupuestos con uso (solo egresos)
  const budgetUsage = await Promise.all(
    budgets.map(async (b) => {
      const spent = expenseList
        .filter((e) => e.categoryId === b.categoryId)
        .reduce((s, e) => s + e.amount, 0);
      return {
        id: b.id,
        categoryId: b.categoryId,
        categoryName: b.category.name,
        categoryColor: b.category.color,
        categoryIcon: b.category.icon,
        amount: b.amount,
        spent,
        remaining: b.amount - spent,
        percentage: b.amount > 0 ? (spent / b.amount) * 100 : 0,
      };
    })
  );

  // Promedios (basados en egresos)
  const today = new Date();
  const daysElapsed = start.getMonth() === today.getMonth() && start.getFullYear() === today.getFullYear()
    ? dayOfMonth(today)
    : totalDays;
  const avgDaily = daysElapsed > 0 ? totalSpent / daysElapsed : 0;
  const avgWeekly = avgDaily * 7;
  const avgMonthly = totalSpent;

  // Predicción de cierre de mes
  const projectedMonth = daysElapsed > 0 ? avgDaily * totalDays : totalSpent;

  // Comparación por categoría con mes anterior (solo egresos)
  const prevByCategory: Record<string, number> = {};
  for (const e of prevExpenses.filter((e) => e.type !== "income")) {
    prevByCategory[e.categoryId] = (prevByCategory[e.categoryId] || 0) + e.amount;
  }
  const categoryComparison = Object.values(byCategory).map((c) => {
    // Necesitamos categoryId
    const entry = Object.entries(byCategory).find(([, v]) => v.name === c.name);
    const catId = entry?.[0] || "";
    const prev = prevByCategory[catId] || 0;
    return {
      ...c,
      categoryId: catId,
      prev,
      variation: prev > 0 ? ((c.total - prev) / prev) * 100 : 0,
    };
  });

  return NextResponse.json({
    month,
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
      monthlyGoal,
      expenseCount: expenseList.length,
      incomeCount: incomeList.length,
      avgDaily,
      avgWeekly,
      avgMonthly,
      projectedMonth,
      subscriptionsTotal: subscriptions.reduce((s, x) => s + x.amount, 0),
    },
    topCategories,
    byDay,
    byMethod: Object.entries(byMethod).map(([method, total]) => ({ method, total })),
    topMerchants,
    byAccount: Object.values(byAccount),
    budgetUsage,
    categoryComparison: categoryComparison.sort((a, b) => b.total - a.total),
    goals,
    recentExpenses: expenses.slice(0, 6),
  });
}
