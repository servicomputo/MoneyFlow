import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { classifyExpense } from "@/lib/ai/classify";

export async function POST(req: NextRequest) {
  try {
    const { merchantName } = await req.json();
    if (!merchantName) return NextResponse.json({ error: "merchantName requerido" }, { status: 400 });

    // 1. Intentar match exacto en merchants
    const normalized = merchantName.toLowerCase().trim();
    const merchant = await db.merchant.findUnique({
      where: { normalizedName: normalized },
      include: {
        defaultCategory: true,
        hints: { include: { category: true }, orderBy: { score: "desc" }, take: 3 },
      },
    });

    if (merchant && merchant.defaultCategory) {
      return NextResponse.json({
        source: "learning",
        categoryId: merchant.defaultCategory.id,
        categoryName: merchant.defaultCategory.name,
        confidence: 0.95,
        alternatives: merchant.hints
          .filter((h) => h.categoryId !== merchant.defaultCategoryId)
          .slice(0, 2)
          .map((h) => ({
            categoryId: h.category.id,
            categoryName: h.category.name,
            confidence: h.score / 10,
          })),
      });
    }

    // 2. Buscar match parcial en merchants
    const partial = await db.merchant.findFirst({
      where: {
        OR: [
          { normalizedName: { contains: normalized } },
          { name: { contains: merchantName } },
        ],
      },
      include: { defaultCategory: true },
    });
    if (partial && partial.defaultCategory) {
      return NextResponse.json({
        source: "similar",
        categoryId: partial.defaultCategory.id,
        categoryName: partial.defaultCategory.name,
        confidence: 0.8,
        alternatives: [],
      });
    }

    // 3. Usar IA para clasificar
    const categories = await db.category.findMany();
    const result = await classifyExpense(merchantName, categories);
    if (result) {
      return NextResponse.json({
        source: "ai",
        categoryId: result.categoryId,
        categoryName: result.categoryName,
        confidence: result.confidence,
        alternatives: result.alternatives.map((a) => ({
          categoryName: a.categoryName,
          confidence: a.confidence,
        })),
      });
    }

    return NextResponse.json({ source: "none", categoryId: null });
  } catch (e) {
    console.error("Classify error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    );
  }
}
