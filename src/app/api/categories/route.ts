import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const categories = await db.category.findMany({
    orderBy: { name: "asc" },
    include: { subcategories: true },
  });
  return NextResponse.json({ categories });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const category = await db.category.create({
    data: {
      name: body.name,
      icon: body.icon || "Wallet",
      color: body.color || "emerald",
      type: body.type || "expense",
    },
    include: { subcategories: true },
  });
  return NextResponse.json({ category }, { status: 201 });
}
