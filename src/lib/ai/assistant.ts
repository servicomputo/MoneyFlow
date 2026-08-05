import { getAI } from "./client";

const ASSISTANT_SYSTEM_PROMPT = `Eres FinZeni, un asesor financiero personal experto integrado en una app de control de gastos.
Respondes en español, de forma clara, concisa y útil. Usas emojis con moderación.

Capacidades:
- Analizar los gastos del usuario que se te proporcionan como contexto.
- Responder preguntas en lenguaje natural sobre sus finanzas.
- Dar consejos personalizados de ahorro.
- Comparar periodos, categorías y comercios.
- Detectar patrones y gastos inusuales.

Cuando respondas con cantidades, usa formato de pesos mexicanos (MXN).
Si la pregunta requiere datos que no tienes en el contexto, indícalo.
Sé breve y directo. Evita listas largas; prefiere párrafos cortos.`;

export interface AssistantContext {
  totalSpent: number;
  prevTotalSpent: number;
  topCategories: Array<{ name: string; total: number; color: string }>;
  byMerchant: Array<{ name: string; total: number }>;
  byMethod: Array<{ method: string; total: number }>;
  budgetUsage: Array<{ categoryName: string; amount: number; spent: number; percentage: number }>;
  subscriptions: Array<{ name: string; amount: number }>;
  recentExpenses: Array<{
    amount: number;
    merchantName?: string;
    categoryName: string;
    date: string;
  }>;
  expenseCount: number;
  month: string;
  avgDaily: number;
  projectedMonth: number;
}

export async function askAssistant(question: string, ctx: AssistantContext): Promise<string> {
  try {
    const ai = await getAI();

    const ctxText = `Contexto financiero del mes actual (${ctx.month}):
- Total gastado: $${ctx.totalSpent.toFixed(2)} MXN
- Mes anterior: $${ctx.prevTotalSpent.toFixed(2)} MXN
- Número de gastos: ${ctx.expenseCount}
- Promedio diario: $${ctx.avgDaily.toFixed(2)} MXN
- Proyección de cierre de mes: $${ctx.projectedMonth.toFixed(2)} MXN

Top categorías:
${ctx.topCategories.map((c) => `- ${c.name}: $${c.total.toFixed(2)}`).join("\n")}

Top comercios:
${ctx.byMerchant.slice(0, 8).map((m) => `- ${m.name}: $${m.total.toFixed(2)}`).join("\n")}

Por método de pago:
${ctx.byMethod.map((m) => `- ${m.method}: $${m.total.toFixed(2)}`).join("\n")}

Presupuestos:
${ctx.budgetUsage.map((b) => `- ${b.categoryName}: gastado $${b.spent.toFixed(2)} de $${b.amount.toFixed(2)} (${b.percentage.toFixed(0)}%)`).join("\n")}

Suscripciones activas:
${ctx.subscriptions.map((s) => `- ${s.name}: $${s.amount.toFixed(2)}`).join("\n")}

Gastos recientes:
${ctx.recentExpenses.map((e) => `- ${e.date.slice(0, 10)} | ${e.merchantName || "N/A"} | ${e.categoryName} | $${e.amount.toFixed(2)}`).join("\n")}
`;

    const response = await ai.chat.completions.create({
      model: "glm-4.6",
      messages: [
        { role: "system", content: ASSISTANT_SYSTEM_PROMPT },
        { role: "user", content: ctxText },
        { role: "user", content: question },
      ],
      temperature: 0.5,
    });

    return response?.choices?.[0]?.message?.content || "Lo siento, no pude procesar tu consulta.";
  } catch (e) {
    console.error("askAssistant error:", e);
    return "Lo siento, hubo un problema al conectar con el asistente. Intenta de nuevo.";
  }
}

// Genera un resumen IA del mes
export async function generateMonthlySummary(ctx: AssistantContext): Promise<string> {
  return askAssistant(
    "Genera un resumen conciso de mis finanzas de este mes. Incluye: total gastado, comparación con el mes anterior, categoría con mayor crecimiento, y 1 consejo de ahorro accionable. Máximo 4 oraciones.",
    ctx
  );
}

// Genera consejos personalizados
export async function generateTips(ctx: AssistantContext): Promise<string[]> {
  try {
    const ai = await getAI();
    const response = await ai.chat.completions.create({
      model: "glm-4.6",
      messages: [
        { role: "system", content: ASSISTANT_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Basado en este contexto financiero, genera 3 consejos de ahorro personalizados y accionables.
Devuelve SOLO un JSON array de strings, cada uno un consejo corto (máx 140 caracteres).

Contexto: total gastado $${ctx.totalSpent.toFixed(2)}, top categorías: ${ctx.topCategories.map((c) => `${c.name} ($${c.total.toFixed(2)})`).join(", ")}. Presupuestos: ${ctx.budgetUsage.filter((b) => b.percentage > 80).map((b) => `${b.categoryName} al ${b.percentage.toFixed(0)}%`).join(", ") || "ninguno sobre 80%"}.
`,
        },
      ],
      temperature: 0.7,
    });
    const content = response?.choices?.[0]?.message?.content || "[]";
    let text = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");
    if (start !== -1 && end !== -1) text = text.slice(start, end + 1);
    return JSON.parse(text);
  } catch {
    return [
      "Reduce un café diario y ahorrarás ~$2,500 al mes.",
      "Revisa tus suscripciones: cancela las que no uses.",
      "Establece un presupuesto semanal para controlar gastos hormiga.",
    ];
  }
}
