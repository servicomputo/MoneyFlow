import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const existing = await db.category.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.icon !== undefined) data.icon = String(body.icon);
    if (body.color !== undefined) data.color = String(body.color);
    if (body.type !== undefined) data.type = String(body.type);

    if (!data.name) {
      return NextResponse.json({ error: "El nombre no puede estar vacío" }, { status: 400 });
    }

    const category = await db.category.update({
      where: { id },
      data,
      include: { subcategories: true },
    });
    return NextResponse.json({ category });
  } catch (e) {
    console.error("PATCH category error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al actualizar categoría" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const existing = await db.category.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });

    // Verificar si hay gastos asociados
    const count = await db.expense.count({ where: { categoryId: id } });
    if (count > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar: hay ${count} gasto(s) asociado(s) a esta categoría. Reasigna o elimina esos gastos primero.` },
        { status: 400 }
      );
    }

    await db.category.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE category error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al eliminar categoría" },
      { status: 500 }
    );
  }
}
