import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Búsqueda de comercios con autocompletado y sugerencia de categoría
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";

  if (!q.trim()) {
    const merchants = await db.merchant.findMany({
      orderBy: { useCount: "desc" },
      take: 10,
      include: { defaultCategory: true },
    });
    return NextResponse.json({ merchants });
  }

  const normalized = q.toLowerCase().trim();
  const merchants = await db.merchant.findMany({
    where: {
      OR: [
        { normalizedName: { contains: normalized } },
        { name: { contains: q } },
        { rfc: { contains: q.toUpperCase() } },
      ],
    },
    orderBy: { useCount: "desc" },
    take: 10,
    include: {
      defaultCategory: true,
      hints: { include: { category: true }, orderBy: { score: "desc" } },
    },
  });

  // Para cada comercio, calcular las 3 categorías más probables
  const result = merchants.map((m) => {
    const hints = m.hints
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((h) => ({ category: h.category, score: h.score }));
    return {
      ...m,
      suggestedCategories: hints,
    };
  });

  return NextResponse.json({ merchants: result });
}
