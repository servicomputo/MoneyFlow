import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAI } from "@/lib/ai/client";

// Búsqueda en lenguaje natural: parsea la query y filtra gastos
export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    if (!query) return NextResponse.json({ error: "query requerido" }, { status: 400 });

    // Obtener todos los gastos de los últimos 12 meses para buscar
    const since = new Date();
    since.setFullYear(since.getFullYear() - 1);
    const expenses = await db.expense.findMany({
      where: { date: { gte: since } },
      include: { category: true, merchant: true, account: true },
      orderBy: { date: "desc" },
      take: 1000,
    });

    // Lista única de categorías, comercios y cuentas
    const categories = [...new Set(expenses.map((e) => e.category.name))];
    const merchants = [...new Set(expenses.map((e) => e.merchantName).filter(Boolean) as string[])];
    const accounts = [...new Set(expenses.map((e) => e.account?.name).filter(Boolean) as string[])];

    // Usar IA para generar un filtro estructurado
    const ai = await getAI();
    const response = await ai.chat.completions.create({
      model: "glm-4.6",
      messages: [
        {
          role: "system",
          content: `Eres un parser de búsqueda financiera en lenguaje natural.
Convierte la pregunta del usuario en un JSON de filtros estructurados.
Devuelve SOLO JSON, sin texto adicional.

Estructura:
{
  "category": "nombre exacto de categoría o null",
  "merchant": "nombre de comercio o null",
  "account": "nombre de cuenta o null",
  "minAmount": número o null,
  "maxAmount": número o null,
  "month": "YYYY-MM" o null (si menciona un mes específico como "marzo"),
  "paymentMethod": "credit|debit|cash|transfer|wallet" o null
}

Categorías disponibles: ${categories.join(", ")}
Comercios disponibles: ${merchants.slice(0, 30).join(", ")}
Cuentas disponibles: ${accounts.join(", ")}

Ejemplos:
- "¿cuánto gasté en gasolina?" -> {"category":"Gasolina","minAmount":null,"maxAmount":null,"merchant":null,"account":null,"month":null,"paymentMethod":null}
- "compras mayores a 1000" -> {"minAmount":1000,"category":null,"merchant":null,"account":null,"month":null,"paymentMethod":null}
- "starbucks en marzo" -> {"merchant":"Starbucks","month":"2025-03","category":null,"minAmount":null,"maxAmount":null,"account":null,"paymentMethod":null}`,
        },
        { role: "user", content: query },
      ],
      temperature: 0,
    });

    let text = response?.choices?.[0]?.message?.content || "{}";
    text = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end !== -1) text = text.slice(start, end + 1);
    const filter = JSON.parse(text);

    // Aplicar filtro
    let filtered = expenses;
    if (filter.category) {
      filtered = filtered.filter((e) => e.category.name.toLowerCase() === String(filter.category).toLowerCase());
    }
    if (filter.merchant) {
      filtered = filtered.filter((e) => (e.merchantName || "").toLowerCase().includes(String(filter.merchant).toLowerCase()));
    }
    if (filter.account) {
      filtered = filtered.filter((e) => (e.account?.name || "").toLowerCase().includes(String(filter.account).toLowerCase()));
    }
    if (filter.minAmount != null) {
      filtered = filtered.filter((e) => e.amount >= Number(filter.minAmount));
    }
    if (filter.maxAmount != null) {
      filtered = filtered.filter((e) => e.amount <= Number(filter.maxAmount));
    }
    if (filter.month) {
      filtered = filtered.filter((e) => e.date.toISOString().slice(0, 7) === filter.month);
    }
    if (filter.paymentMethod) {
      filtered = filtered.filter((e) => e.paymentMethod === filter.paymentMethod);
    }

    const total = filtered.reduce((s, e) => s + e.amount, 0);

    return NextResponse.json({
      filter,
      count: filtered.length,
      total,
      expenses: filtered.slice(0, 50).map((e) => ({
        id: e.id,
        amount: e.amount,
        date: e.date,
        merchantName: e.merchantName,
        categoryName: e.category.name,
        accountName: e.account?.name,
        paymentMethod: e.paymentMethod,
      })),
    });
  } catch (e) {
    console.error("Search error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    );
  }
}
