import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { monthKey } from "@/lib/format";

export async function GET() {
  const month = monthKey();
  const budgets = await db.budget.findMany({
    where: { period: "monthly", month },
    include: { category: true },
    orderBy: { amount: "desc" },
  });
  return NextResponse.json({ budgets, month });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const month = body.month || monthKey();

  // Upsert
  const existing = await db.budget.findFirst({
    where: { categoryId: body.categoryId, period: body.period || "monthly", month },
  });

  let budget;
  if (existing) {
    budget = await db.budget.update({
      where: { id: existing.id },
      data: { amount: Number(body.amount) },
      include: { category: true },
    });
  } else {
    budget = await db.budget.create({
      data: {
        categoryId: body.categoryId,
        amount: Number(body.amount),
        period: body.period || "monthly",
        month,
      },
      include: { category: true },
    });
  }
  return NextResponse.json({ budget }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await db.budget.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
