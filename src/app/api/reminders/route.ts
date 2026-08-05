import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const reminders = await db.reminder.findMany({
    orderBy: { dueDate: "asc" },
  });
  return NextResponse.json({ reminders });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const reminder = await db.reminder.create({
    data: {
      title: body.title,
      type: body.type || "register",
      dueDate: new Date(body.dueDate),
      notes: body.notes || null,
    },
  });
  return NextResponse.json({ reminder }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, ...data } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const reminder = await db.reminder.update({
    where: { id },
    data: {
      ...(data.done !== undefined && { done: data.done }),
      ...(data.title !== undefined && { title: data.title }),
      ...(data.dueDate !== undefined && { dueDate: new Date(data.dueDate) }),
    },
  });
  return NextResponse.json({ reminder });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await db.reminder.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
