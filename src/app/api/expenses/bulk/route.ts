import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

interface BulkExpenseInput {
  amount: number;
  date: string;
  categoryId?: string;
  categoryName?: string;
  subcategoryName?: string;
  merchantName?: string;
  paymentMethod?: string;
  accountName?: string;
  notes?: string;
  tags?: string[];
  currency?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const expenses: BulkExpenseInput[] = body.expenses || [];

    if (!Array.isArray(expenses) || expenses.length === 0) {
      return NextResponse.json(
        { error: "Se requiere un arreglo de gastos" },
        { status: 400 }
      );
    }

    if (expenses.length > 5000) {
      return NextResponse.json(
        { error: "Máximo 5000 gastos por importación" },
        { status: 400 }
      );
    }

    // Pre-cargar categorías, comercios y cuentas para resolver nombres → IDs
    const [categories, accounts, merchants] = await Promise.all([
      db.category.findMany({ include: { subcategories: true } }),
      db.account.findMany(),
      db.merchant.findMany(),
    ]);

    const categoryByName = new Map(
      categories.map((c) => [c.name.toLowerCase(), c])
    );
    const accountByName = new Map(
      accounts.map((a) => [a.name.toLowerCase(), a])
    );
    const merchantByNorm = new Map(
      merchants.map((m) => [m.normalizedName, m])
    );

    const defaultAccount = accounts.find((a) => a.isDefault) || accounts[0];
    const defaultCategory = categories[0];

    const results: Array<{ ok: boolean; error?: string; merchantName?: string }> = [];
    let created = 0;
    let failed = 0;
    let merchantsCreated = 0;

    // Procesar en lotes para evitar demasiadas transacciones
    for (const input of expenses) {
      try {
        // Validar importe
        const amount = Number(input.amount);
        if (!isFinite(amount) || amount <= 0) {
          failed++;
          results.push({ ok: false, error: "Importe inválido", merchantName: input.merchantName });
          continue;
        }

        // Validar fecha
        let date: Date;
        try {
          date = new Date(input.date);
          if (isNaN(date.getTime())) date = new Date();
        } catch {
          date = new Date();
        }

        // Resolver categoría
        let category = defaultCategory;
        if (input.categoryId) {
          const found = categories.find((c) => c.id === input.categoryId);
          if (found) category = found;
        } else if (input.categoryName) {
          const found = categoryByName.get(input.categoryName.toLowerCase().trim());
          if (found) category = found;
        }

        // Resolver subcategoría
        let subcategoryId: string | null = null;
        if (input.subcategoryName && category.subcategories) {
          const sub = category.subcategories.find(
            (s) => s.name.toLowerCase() === input.subcategoryName!.toLowerCase().trim()
          );
          if (sub) subcategoryId = sub.id;
        }

        // Resolver cuenta
        let account = defaultAccount;
        if (input.accountName) {
          const found = accountByName.get(input.accountName.toLowerCase().trim());
          if (found) account = found;
        }

        // Resolver o crear comercio
        let merchantId: string | null = null;
        let merchantName = input.merchantName?.trim() || null;
        if (merchantName) {
          const normalized = merchantName.toLowerCase();
          let merchant = merchantByNorm.get(normalized);
          if (!merchant) {
            merchant = await db.merchant.create({
              data: {
                name: merchantName,
                normalizedName: normalized,
                defaultCategoryId: category.id,
                defaultPaymentMethod: input.paymentMethod || null,
                defaultAccountId: account?.id || null,
                useCount: 1,
              },
            });
            merchantByNorm.set(normalized, merchant);
            merchantsCreated++;
          } else {
            merchant = await db.merchant.update({
              where: { id: merchant.id },
              data: { useCount: { increment: 1 } },
            });
          }
          merchantId = merchant.id;

          // Actualizar hint de aprendizaje
          const existingHint = await db.merchantHint.findUnique({
            where: { merchantId_categoryId: { merchantId, categoryId: category.id } },
          });
          if (existingHint) {
            await db.merchantHint.update({
              where: { id: existingHint.id },
              data: { score: { increment: 1 } },
            });
          } else {
            await db.merchantHint.create({
              data: { merchantId, categoryId: category.id, score: 1 },
            });
          }
        }

        // Crear gasto
        await db.expense.create({
          data: {
            amount,
            currency: input.currency || "MXN",
            date,
            categoryId: category.id,
            subcategoryId,
            merchantId,
            merchantName,
            paymentMethod: input.paymentMethod || null,
            accountId: account?.id || null,
            notes: input.notes || null,
            tags: Array.isArray(input.tags)
              ? input.tags.join(",")
              : typeof input.tags === "string"
                ? input.tags
                : "",
            source: "import",
          },
        });

        // Actualizar balance de cuenta
        if (account) {
          await db.account.update({
            where: { id: account.id },
            data: { balance: { decrement: amount } },
          });
        }

        created++;
        results.push({ ok: true, merchantName });
      } catch (e) {
        failed++;
        results.push({
          ok: false,
          error: e instanceof Error ? e.message : "Error",
          merchantName: input.merchantName,
        });
      }
    }

    return NextResponse.json({
      success: true,
      created,
      failed,
      total: expenses.length,
      merchantsCreated,
      results: results.slice(0, 100), // limitar tamaño de respuesta
    });
  } catch (e) {
    console.error("Bulk import error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error en importación masiva" },
      { status: 500 }
    );
  }
}
