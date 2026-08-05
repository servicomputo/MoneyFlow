import { getAI } from "./client";

export interface ClassificationResult {
  categoryId: string;
  categoryName: string;
  confidence: number; // 0-1
  alternatives: Array<{ categoryName: string; confidence: number }>;
  reasoning?: string;
}

const CLASSIFY_PROMPT = `Eres un clasificador inteligente de gastos personales.
Dado el nombre de un comercio, debes clasificarlo en una de las categorías disponibles.

Devuelve EXCLUSIVAMENTE un JSON válido:
{
  "category": "nombre exacto de la categoría",
  "confidence": 0.0 a 1.0,
  "alternatives": [
    { "category": "nombre", "confidence": 0.0 a 1.0 }
  ]
}

Reglas:
- Si reconoces el comercio (ej. Starbucks, Netflix, Uber), asigna alta confianza (>=0.9).
- Si no estás seguro, ofrece 3 alternativas con sus confianzas.
- La suma de confianzas de alternativas puede ser < 1 si hay incertidumbre.
- NO incluyas texto fuera del JSON.`;

export async function classifyExpense(
  merchantName: string,
  availableCategories: Array<{ id: string; name: string }>
): Promise<ClassificationResult | null> {
  try {
    const ai = await getAI();
    const catList = availableCategories.map((c) => `- ${c.name}`).join("\n");

    const response = await ai.chat.completions.create({
      model: "glm-4.6",
      messages: [
        { role: "system", content: CLASSIFY_PROMPT },
        {
          role: "user",
          content: `Comercio a clasificar: "${merchantName}"\n\nCategorías disponibles:\n${catList}`,
        },
      ],
      temperature: 0.2,
    });

    const content = response?.choices?.[0]?.message?.content || "";
    let text = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end !== -1) text = text.slice(start, end + 1);

    const parsed = JSON.parse(text);
    const matched = availableCategories.find(
      (c) => c.name.toLowerCase() === String(parsed.category).toLowerCase()
    );
    if (!matched) return null;

    const alternatives = (parsed.alternatives || [])
      .map((a: { category: string; confidence: number }) => {
        const cat = availableCategories.find(
          (c) => c.name.toLowerCase() === String(a.category).toLowerCase()
        );
        return cat ? { categoryName: cat.name, confidence: Number(a.confidence) || 0 } : null;
      })
      .filter(Boolean)
      .slice(0, 3);

    return {
      categoryId: matched.id,
      categoryName: matched.name,
      confidence: Number(parsed.confidence) || 0.8,
      alternatives,
    };
  } catch (e) {
    console.error("classifyExpense error:", e);
    return null;
  }
}
