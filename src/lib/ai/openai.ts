const OPENAI_MODEL = "gpt-4o-mini";
const MAX_TICKETS_PER_DAY = 50;

const SCAN_PROMPT = `Eres un asistente experto en leer tickets y facturas de compra en México y Latinoamérica.
Analiza la imagen del ticket/recibo y extrae TODA la información estructurada que puedas identificar.

Devuelve EXCLUSIVAMENTE un objeto JSON válido (sin texto adicional, sin markdown) con esta estructura:
{
  "date": "YYYY-MM-DD" (fecha del ticket),
  "merchant": "nombre del comercio",
  "rfc": "RFC si aparece (solo si está visible)",
  "total": número (importe total pagado),
  "subtotal": número (subtotal antes de impuestos, si aparece),
  "tax": número (IVA u otros impuestos, si aparece),
  "paymentMethod": "credit|debit|cash|transfer|wallet" (si se puede inferir),
  "currency": "MXN|USD|EUR" (moneda, por defecto MXN),
  "ticketNumber": "número de ticket/folio si aparece",
  "products": [{ "name": "nombre producto", "qty": número, "price": número }],
  "rawText": "texto completo extraído del ticket"
}

Reglas:
- Si un campo no está presente, omítelo o pon null.
- Los números deben ser numéricos (sin comas ni símbolos).
- Si no puedes leer el ticket, devuelve { "error": "motivo" }.
- NO incluyas texto fuera del JSON.`;

export interface ScannedTicket {
  date?: string;
  merchant?: string;
  rfc?: string;
  total?: number;
  subtotal?: number;
  tax?: number;
  paymentMethod?: string;
  currency?: string;
  ticketNumber?: string;
  products?: Array<{ name: string; qty?: number; price?: number }>;
  rawText?: string;
  error?: string;
}

export async function scanTicketWithOpenAI(
  imageBase64: string,
  apiKey: string
): Promise<ScannedTicket> {
  const imageUrl = imageBase64.startsWith("data:")
    ? imageBase64
    : `data:image/jpeg;base64,${imageBase64}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: SCAN_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Extrae los datos de este ticket o recibo. Devuelve solo JSON." },
            { type: "image_url", image_url: { url: imageUrl, detail: "low" } },
          ],
        },
      ],
      temperature: 0.2,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content || "";
  return parseScanResponse(content);
}

export function parseScanResponse(content: string): ScannedTicket {
  let text = content.trim();
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    text = text.slice(start, end + 1);
  }
  try {
    return JSON.parse(text) as ScannedTicket;
  } catch {
    return { rawText: content };
  }
}

const ASSISTANT_SYSTEM_PROMPT = `Eres Money Flow, un asesor financiero personal experto integrado en una app de control de gastos.
Respondes en español, de forma clara, concisa y útil.
Cuando respondas con cantidades, usa formato de pesos mexicanos (MXN).
Sé breve y directo.`;

export async function askAssistantWithOpenAI(
  question: string,
  contextText: string,
  apiKey: string
): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: ASSISTANT_SYSTEM_PROMPT },
        { role: "user", content: contextText },
        { role: "user", content: question },
      ],
      temperature: 0.5,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || "Lo siento, no pude procesar tu consulta.";
}

export async function generateInsightsWithOpenAI(
  contextText: string,
  apiKey: string
): Promise<{ summary: string; tips: string[] }> {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: ASSISTANT_SYSTEM_PROMPT },
          {
            role: "user",
            content: `${contextText}\n\nGenera un resumen conciso de las finanzas de este mes (máximo 3 oraciones) y 3 consejos de ahorro personalizados. Devuelve SOLO un JSON: {"summary": "texto", "tips": ["consejo1", "consejo2", "consejo3"]}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) return { summary: "", tips: [] };

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || "{}";
    let text = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end !== -1) text = text.slice(start, end + 1);

    const parsed = JSON.parse(text);
    return { summary: parsed.summary || "", tips: parsed.tips || [] };
  } catch {
    return { summary: "", tips: [] };
  }
}

// =============================================================================
// Clasificación de comercios con OpenAI
// =============================================================================

const CLASSIFY_OPENAI_PROMPT = `Eres un clasificador inteligente de gastos personales.
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
- Elige SIEMPRE una categoría principal (la más probable).
- NO incluyas texto fuera del JSON.`;

export interface OpenAIClassificationResult {
  categoryId: string;
  categoryName: string;
  confidence: number;
  alternatives: Array<{ categoryName: string; confidence: number }>;
}

/**
 * Clasifica un comercio en una categoría usando la API de OpenAI.
 * Devuelve null si no hay API key, si el input es inválido o si la API falla.
 */
export async function classifyWithOpenAI(
  merchantName: string,
  categories: Array<{ id: string; name: string }>,
  apiKey: string
): Promise<OpenAIClassificationResult | null> {
  if (!apiKey) return null;
  if (!merchantName || !merchantName.trim()) return null;
  if (!categories || categories.length === 0) return null;

  try {
    const catList = categories.map((c) => `- ${c.name}`).join("\n");
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: CLASSIFY_OPENAI_PROMPT },
          {
            role: "user",
            content: `Comercio a clasificar: "${merchantName}"\n\nCategorías disponibles:\n${catList}`,
          },
        ],
        temperature: 0.2,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      console.error(`classifyWithOpenAI API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || "";
    let text = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end !== -1) text = text.slice(start, end + 1);

    const parsed = JSON.parse(text);
    const matched = categories.find(
      (c) => c.name.toLowerCase() === String(parsed.category).toLowerCase()
    );
    if (!matched) return null;

    const alternatives = (parsed.alternatives || [])
      .map((a: { category: string; confidence: number }) => {
        const cat = categories.find(
          (c) => c.name.toLowerCase() === String(a.category).toLowerCase()
        );
        return cat ? { categoryName: cat.name, confidence: Number(a.confidence) || 0 } : null;
      })
      .filter(Boolean)
      .slice(0, 3) as Array<{ categoryName: string; confidence: number }>;

    return {
      categoryId: matched.id,
      categoryName: matched.name,
      confidence: Number(parsed.confidence) || 0.8,
      alternatives,
    };
  } catch (e) {
    console.error("classifyWithOpenAI error:", e);
    return null;
  }
}
