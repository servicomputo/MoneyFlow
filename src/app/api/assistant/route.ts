import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { monthKey } from "@/lib/format";
import { askAssistant } from "@/lib/ai/assistant";

export async function POST(req: NextRequest) {
  try {
    const { question, month } = await req.json();
    const m = month || monthKey();
    const [y, mo] = m.split("-").map(Number);
    const start = new Date(y, mo - 1, 1);
    const end = new Date(y, mo, 0, 23, 59, 59, 999);
    const prevStart = new Date(y, mo - 2, 1);
    const prevEnd = new Date(y, mo - 1, 0, 23, 59, 59, 999);

    const [expenses, prevExpenses, budgets, subscriptions] = await Promise.all([
      db.expense.findMany({
        where: { date: { gte: start, lte: end } },
        include: { category: true, merchant: true, account: true },
        orderBy: { date: "desc" },
      }),
      db.expense.findMany({
        where: { date: { gte: prevStart, lte: prevEnd } },
        include: { category: true },
      }),
      db.budget.findMany({ where: { period: "monthly", month: m }, include: { category: true } }),
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
    for (const e of expenses) {
      const name = e.merchantName || "Otro";
      byMerchant[name] = (byMerchant[name] || 0) + e.amount;
    }

    const byMethod: Record<string, number> = {};
    for (const e of expenses) {
      const method = e.paymentMethod || "cash";
      byMethod[method] = (byMethod[method] || 0) + e.amount;
    }

    const budgetUsage = budgets.map((b) => {
      const spent = expenses
        .filter((e) => e.categoryId === b.categoryId)
        .reduce((s, e) => s + e.amount, 0);
      return {
        categoryName: b.category.name,
        amount: b.amount,
        spent,
        percentage: b.amount > 0 ? (spent / b.amount) * 100 : 0,
      };
    });

    const daysElapsed = new Date().getMonth() === mo - 1 && new Date().getFullYear() === y
      ? new Date().getDate()
      : 30;
    const avgDaily = daysElapsed > 0 ? totalSpent / daysElapsed : 0;
    const projectedMonth = avgDaily * 30;

    const answer = await askAssistant(question, {
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
      month: m,
      avgDaily,
      projectedMonth,
    });

    return NextResponse.json({ answer });
  } catch (e) {
    console.error("Assistant error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    );
  }
}
