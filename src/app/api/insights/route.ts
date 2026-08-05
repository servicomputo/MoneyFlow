import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { monthKey } from "@/lib/format";
import { generateMonthlySummary, generateTips, type AssistantContext } from "@/lib/ai/assistant";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month") || monthKey();
  const refresh = searchParams.get("refresh") === "1";
  const [y, mo] = month.split("-").map(Number);
  const start = new Date(y, mo - 1, 1);
  const end = new Date(y, mo, 0, 23, 59, 59, 999);
  const prevStart = new Date(y, mo - 2, 1);
  const prevEnd = new Date(y, mo - 1, 0, 23, 59, 59, 999);

  // Intentar leer insights cacheados
  if (!refresh) {
    const cached = await db.aiInsight.findMany({
      where: { period: month },
      orderBy: { createdAt: "desc" },
    });
    if (cached.length > 0) {
      return NextResponse.json({
        insights: cached,
        summary: cached.find((i) => i.type === "monthly")?.content || "",
        tips: cached.filter((i) => i.type === "tip").map((i) => i.content),
      });
    }
  }

  // Generar nuevos insights con IA
  const [expenses, prevExpenses, budgets, subscriptions] = await Promise.all([
    db.expense.findMany({
      where: { date: { gte: start, lte: end } },
      include: { category: true, merchant: true },
    }),
    db.expense.findMany({
      where: { date: { gte: prevStart, lte: prevEnd } },
      include: { category: true },
    }),
    db.budget.findMany({ where: { period: "monthly", month }, include: { category: true } }),
    db.subscription.findMany({ where: { active: true } }),
  ]);

  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const prevTotalSpent = prevExpenses.reduce((s, e) => s + e.amount, 0);

  const byCategory: Record<string, { name: string; total: number; color: string }> = {};
  for (const e of expenses) {
    if (!byCategory[e.categoryId])
      byCategory[e.categoryId] = { name: e.category.name, total: 0, color: e.category.color };
    byCategory[e.categoryId].total += e.amount;
  }
  const topCategories = Object.values(byCategory).sort((a, b) => b.total - a.total).slice(0, 8);

  const byMerchant: Record<string, number> = {};
  for (const e of expenses) byMerchant[e.merchantName || "Otro"] = (byMerchant[e.merchantName || "Otro"] || 0) + e.amount;

  const byMethod: Record<string, number> = {};
  for (const e of expenses) {
    const m = e.paymentMethod || "cash";
    byMethod[m] = (byMethod[m] || 0) + e.amount;
  }

  const budgetUsage = budgets.map((b) => {
    const spent = expenses.filter((e) => e.categoryId === b.categoryId).reduce((s, e) => s + e.amount, 0);
    return {
      categoryName: b.category.name,
      amount: b.amount,
      spent,
      percentage: b.amount > 0 ? (spent / b.amount) * 100 : 0,
    };
  });

  const ctx: AssistantContext = {
    totalSpent,
    prevTotalSpent,
    topCategories,
    byMerchant: Object.entries(byMerchant).map(([name, total]) => ({ name, total })),
    byMethod: Object.entries(byMethod).map(([method, total]) => ({ method, total })),
    budgetUsage,
    subscriptions: subscriptions.map((s) => ({ name: s.name, amount: s.amount })),
    recentExpenses: expenses.slice(0, 10).map((e) => ({
      amount: e.amount,
      merchantName: e.merchantName || undefined,
      categoryName: e.category.name,
      date: e.date.toISOString(),
    })),
    expenseCount: expenses.length,
    month,
    avgDaily: totalSpent / Math.max(1, new Date().getDate()),
    projectedMonth: (totalSpent / Math.max(1, new Date().getDate())) * 30,
  };

  const [summary, tips] = await Promise.all([
    generateMonthlySummary(ctx),
    generateTips(ctx),
  ]);

  // Guardar en BD
  await db.aiInsight.deleteMany({ where: { period: month } });
  const created = await Promise.all([
    db.aiInsight.create({
      data: { type: "monthly", title: "Resumen del mes", content: summary, period: month },
    }),
    ...tips.map((tip) =>
      db.aiInsight.create({
        data: { type: "tip", title: "Consejo personalizado", content: tip, period: month },
      })
    ),
  ]);

  return NextResponse.json({
    insights: created,
    summary,
    tips,
  });
}
