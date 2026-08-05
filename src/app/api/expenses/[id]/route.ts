import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const expense = await db.expense.findUnique({
    where: { id },
    include: { category: true, subcategory: true, merchant: true, account: true },
  });
  if (!expense) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ expense });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json();

  const existing = await db.expense.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (body.amount !== undefined) data.amount = Number(body.amount);
  if (body.date !== undefined) data.date = new Date(body.date);
  if (body.categoryId !== undefined) data.categoryId = body.categoryId;
  if (body.subcategoryId !== undefined) data.subcategoryId = body.subcategoryId || null;
  if (body.merchantName !== undefined) data.merchantName = body.merchantName;
  if (body.paymentMethod !== undefined) data.paymentMethod = body.paymentMethod;
  if (body.accountId !== undefined) data.accountId = body.accountId || null;
  if (body.notes !== undefined) data.notes = body.notes;
  if (body.tags !== undefined)
    data.tags = Array.isArray(body.tags) ? body.tags.join(",") : body.tags;
  if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl;
  if (body.ticketNumber !== undefined) data.ticketNumber = body.ticketNumber;
  if (body.rfc !== undefined) data.rfc = body.rfc;
  if (body.subtotal !== undefined) data.subtotal = body.subtotal ? Number(body.subtotal) : null;
  if (body.tax !== undefined) data.tax = body.tax ? Number(body.tax) : null;
  if (body.isRecurring !== undefined) data.isRecurring = body.isRecurring;
  if (body.recurringName !== undefined) data.recurringName = body.recurringName;

  const expense = await db.expense.update({ where: { id }, data, include: { category: true, subcategory: true, merchant: true, account: true } });

  // Si cambió monto o cuenta, ajustar balances
  if (body.amount !== undefined && body.amount !== existing.amount) {
    const diff = Number(body.amount) - existing.amount;
    const targetAccount = body.accountId !== undefined ? body.accountId : existing.accountId;
    if (targetAccount) {
      await db.account.update({
        where: { id: targetAccount },
        data: { balance: { decrement: diff } },
      });
    }
  } else if (body.accountId !== undefined && body.accountId !== existing.accountId) {
    // Cambió de cuenta: reembolsar la vieja y cobrar la nueva
    if (existing.accountId) {
      await db.account.update({
        where: { id: existing.accountId },
        data: { balance: { increment: existing.amount } },
      });
    }
    if (body.accountId) {
      await db.account.update({
        where: { id: body.accountId },
        data: { balance: { decrement: existing.amount } },
      });
    }
  }

  return NextResponse.json({ expense });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const existing = await db.expense.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (existing.accountId) {
    await db.account.update({
      where: { id: existing.accountId },
      data: { balance: { increment: existing.amount } },
    });
  }
  await db.expense.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
