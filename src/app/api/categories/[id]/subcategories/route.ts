import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const name = String(body.name || "").trim();
    if (!name) {
      return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
    }

    const category = await db.category.findUnique({ where: { id } });
    if (!category) return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });

    // Evitar duplicados
    const existing = await db.subcategory.findFirst({
      where: { categoryId: id, name: { equals: name } },
    });
    if (existing) {
      return NextResponse.json({ error: "Ya existe una subcategoría con ese nombre" }, { status: 400 });
    }

    const subcategory = await db.subcategory.create({
      data: { name, categoryId: id },
    });
    return NextResponse.json({ subcategory }, { status: 201 });
  } catch (e) {
    console.error("POST subcategory error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al crear subcategoría" },
      { status: 500 }
    );
  }
}
