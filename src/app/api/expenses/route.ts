import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { monthKey } from "@/lib/format";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  const startParam = searchParams.get("start");
  const endParam = searchParams.get("end");
  const merchantId = searchParams.get("merchantId");
  const accountId = searchParams.get("accountId");
  const categoryId = searchParams.get("categoryId");
  const q = searchParams.get("q");
  const limit = Number(searchParams.get("limit") || 2000);

  let start: Date;
  let end: Date;

  if (startParam && endParam) {
    // Modo rango: usar start/end explícitos
    start = new Date(startParam);
    end = new Date(endParam);
  } else {
    // Modo mes: usar month (default: mes actual)
    const m = month || monthKey();
    const [y, mo] = m.split("-").map(Number);
    start = new Date(y, mo - 1, 1);
    end = new Date(y, mo, 0, 23, 59, 59, 999);
  }

  const where: Record<string, unknown> = {
    date: { gte: start, lte: end },
  };
  if (merchantId) where.merchantId = merchantId;
  if (accountId) where.accountId = accountId;
  if (categoryId) where.categoryId = categoryId;
  if (q) {
    where.OR = [
      { merchantName: { contains: q } },
      { notes: { contains: q } },
      { tags: { contains: q } },
      { ticketNumber: { contains: q } },
    ];
  }

  const expenses = await db.expense.findMany({
    where,
    orderBy: { date: "desc" },
    take: limit,
    include: {
      category: true,
      subcategory: true,
      merchant: true,
      account: true,
    },
  });

  return NextResponse.json({ expenses });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Buscar o crear comerciente
    let merchantId: string | undefined;
    let merchantName: string | undefined = body.merchantName;
    if (merchantName) {
      const normalized = merchantName.toLowerCase().trim();
      let merchant = await db.merchant.findUnique({ where: { normalizedName: normalized } });
      if (!merchant) {
        merchant = await db.merchant.create({
          data: {
            name: merchantName,
            normalizedName: normalized,
            defaultCategoryId: body.categoryId,
            defaultPaymentMethod: body.paymentMethod,
            defaultAccountId: body.accountId,
            useCount: 1,
          },
        });
      } else {
        merchant = await db.merchant.update({
          where: { id: merchant.id },
          data: { useCount: { increment: 1 } },
        });
      }
      merchantId = merchant.id;

      // Actualizar aprendizaje (hint)
      if (body.categoryId) {
        const existingHint = await db.merchantHint.findUnique({
          where: {
            merchantId_categoryId: { merchantId, categoryId: body.categoryId },
          },
        });
        if (existingHint) {
          await db.merchantHint.update({
            where: { id: existingHint.id },
            data: { score: { increment: 1 } },
          });
        } else {
          await db.merchantHint.create({
            data: { merchantId, categoryId: body.categoryId, score: 1 },
          });
        }
      }
    }

    const type = body.type === "income" ? "income" : "expense";

    const expense = await db.expense.create({
      data: {
        amount: Number(body.amount),
        type,
        currency: body.currency || "MXN",
        date: new Date(body.date),
        categoryId: body.categoryId,
        subcategoryId: body.subcategoryId || null,
        merchantId,
        merchantName,
        paymentMethod: body.paymentMethod || null,
        accountId: body.accountId || null,
        notes: body.notes || null,
        tags: Array.isArray(body.tags) ? body.tags.join(",") : body.tags || "",
        imageUrl: body.imageUrl || null,
        ticketNumber: body.ticketNumber || null,
        rfc: body.rfc || null,
        subtotal: body.subtotal ? Number(body.subtotal) : null,
        tax: body.tax ? Number(body.tax) : null,
        isRecurring: body.isRecurring || false,
        recurringName: body.recurringName || null,
        source: body.source || "manual",
        rawText: body.rawText || null,
      },
      include: {
        category: true,
        subcategory: true,
        merchant: true,
        account: true,
      },
    });

    // Actualizar balance de cuenta: ingresos suman, egresos restan
    if (body.accountId) {
      const delta = type === "income" ? Number(body.amount) : -Number(body.amount);
      await db.account.update({
        where: { id: body.accountId },
        data: { balance: { increment: delta } },
      });
    }

    return NextResponse.json({ expense }, { status: 201 });
  } catch (e) {
    console.error("POST /api/expenses error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error creating expense" },
      { status: 500 }
    );
  }
}
