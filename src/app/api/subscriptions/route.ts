import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const subscriptions = await db.subscription.findMany({
    orderBy: { nextDate: "asc" },
    include: { category: true, account: true },
  });
  return NextResponse.json({ subscriptions });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const sub = await db.subscription.create({
    data: {
      name: body.name,
      type: body.type || "subscription",
      merchantName: body.merchantName || null,
      amount: Number(body.amount),
      currency: body.currency || "MXN",
      period: body.period || "monthly",
      nextDate: new Date(body.nextDate),
      categoryId: body.categoryId || null,
      accountId: body.accountId || null,
      active: body.active !== false,
    },
    include: { category: true, account: true },
  });
  return NextResponse.json({ subscription: sub }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, ...data } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const sub = await db.subscription.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.type !== undefined && { type: data.type }),
      ...(data.amount !== undefined && { amount: Number(data.amount) }),
      ...(data.nextDate !== undefined && { nextDate: new Date(data.nextDate) }),
      ...(data.active !== undefined && { active: data.active }),
      ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
      ...(data.accountId !== undefined && { accountId: data.accountId }),
    },
    include: { category: true, account: true },
  });
  return NextResponse.json({ subscription: sub });
}
