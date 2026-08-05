import { NextRequest, NextResponse } from "next/server";
import { scanTicket } from "@/lib/ai/scan";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image } = body as { image: string };

    if (!image) {
      return NextResponse.json({ error: "Imagen requerida" }, { status: 400 });
    }

    const result = await scanTicket(image);

    // Si tenemos un merchant, buscar hints de aprendizaje
    let suggestedCategory: { id: string; name: string; color: string; icon: string } | null = null;
    let suggestedAlternatives: Array<{ id: string; name: string; color: string; score: number }> = [];
    let merchantId: string | null = null;

    if (result.merchant) {
      const normalized = result.merchant.toLowerCase().trim();
      const merchant = await db.merchant.findUnique({
        where: { normalizedName: normalized },
        include: {
          defaultCategory: true,
          hints: { include: { category: true }, orderBy: { score: "desc" }, take: 3 },
        },
      });
      if (merchant) {
        merchantId = merchant.id;
        if (merchant.defaultCategory) {
          suggestedCategory = {
            id: merchant.defaultCategory.id,
            name: merchant.defaultCategory.name,
            color: merchant.defaultCategory.color,
            icon: merchant.defaultCategory.icon,
          };
        }
        suggestedAlternatives = merchant.hints.map((h) => ({
          id: h.category.id,
          name: h.category.name,
          color: h.category.color,
          score: h.score,
        }));
      }
    }

    return NextResponse.json({
      ...result,
      merchantId,
      suggestedCategory,
      suggestedAlternatives,
    });
  } catch (e) {
    console.error("Scan error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error procesando imagen" },
      { status: 500 }
    );
  }
}
