import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const accounts = await db.account.findMany({
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ accounts });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const account = await db.account.create({
    data: {
      name: body.name,
      type: body.type,
      balance: Number(body.balance || 0),
      currency: body.currency || "MXN",
      color: body.color || "emerald",
      bank: body.bank || null,
      last4: body.last4 || null,
      creditLimit: body.creditLimit ? Number(body.creditLimit) : null,
      dueDay: body.dueDay || null,
      isDefault: body.isDefault || false,
    },
  });
  return NextResponse.json({ account }, { status: 201 });
}
