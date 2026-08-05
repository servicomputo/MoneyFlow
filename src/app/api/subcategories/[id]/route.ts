import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const existing = await db.subcategory.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Subcategoría no encontrada" }, { status: 404 });

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = String(body.name).trim();
    if (!data.name) {
      return NextResponse.json({ error: "El nombre no puede estar vacío" }, { status: 400 });
    }

    const subcategory = await db.subcategory.update({ where: { id }, data });
    return NextResponse.json({ subcategory });
  } catch (e) {
    console.error("PATCH subcategory error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al actualizar subcategoría" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const existing = await db.subcategory.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Subcategoría no encontrada" }, { status: 404 });

    const count = await db.expense.count({ where: { subcategoryId: id } });
    if (count > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar: hay ${count} gasto(s) asociado(s) a esta subcategoría.` },
        { status: 400 }
      );
    }

    await db.subcategory.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE subcategory error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al eliminar subcategoría" },
      { status: 500 }
    );
  }
}
