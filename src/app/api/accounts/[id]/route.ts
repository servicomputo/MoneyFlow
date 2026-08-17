import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const existing = await db.account.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = String(body.name);
    if (body.type !== undefined) data.type = String(body.type);
    if (body.balance !== undefined) data.balance = Number(body.balance);
    if (body.currency !== undefined) data.currency = String(body.currency);
    if (body.color !== undefined) data.color = String(body.color);
    if (body.bank !== undefined) data.bank = body.bank || null;
    if (body.last4 !== undefined) data.last4 = body.last4 || null;
    if (body.creditLimit !== undefined) data.creditLimit = body.creditLimit ? Number(body.creditLimit) : null;
    if (body.dueDay !== undefined) data.dueDay = body.dueDay || null;
    if (body.isDefault !== undefined) data.isDefault = Boolean(body.isDefault);

    const account = await db.account.update({ where: { id }, data });
    return NextResponse.json({ account });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const existing = await db.account.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });

    const count = await db.expense.count({ where: { accountId: id } });
    if (count > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar: hay ${count} gasto(s) asociado(s). Reasigna esos gastos primero.` },
        { status: 400 }
      );
    }

    await db.account.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
