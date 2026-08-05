import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const goals = await db.savingsGoal.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ goals });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const goal = await db.savingsGoal.create({
    data: {
      name: body.name,
      target: Number(body.target),
      current: Number(body.current || 0),
      deadline: body.deadline ? new Date(body.deadline) : null,
      color: body.color || "emerald",
      icon: body.icon || "Target",
    },
  });
  return NextResponse.json({ goal }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, ...data } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const goal = await db.savingsGoal.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.target !== undefined && { target: Number(data.target) }),
      ...(data.current !== undefined && { current: Number(data.current) }),
      ...(data.deadline !== undefined && { deadline: data.deadline ? new Date(data.deadline) : null }),
    },
  });
  return NextResponse.json({ goal });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await db.savingsGoal.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
