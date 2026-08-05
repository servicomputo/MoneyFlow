import { getAI } from "./client";

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
}

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

export async function scanTicket(imageBase64: string): Promise<ScannedTicket> {
  const ai = await getAI();

  const response = await ai.chat.completions.createVision({
    model: "glm-4.5v",
    messages: [
      {
        role: "system",
        content: SCAN_PROMPT,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Extrae los datos de este ticket o recibo. Devuelve solo JSON.",
          },
          {
            type: "image_url",
            image_url: { url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}` },
          },
        ],
      },
    ],
  });

  const content = response?.choices?.[0]?.message?.content || "";
  return parseScanResponse(content);
}

export function parseScanResponse(content: string): ScannedTicket {
  // Intentar extraer JSON de la respuesta
  let text = content.trim();
  // Quitar markdown code fences si los hay
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

  // Buscar el primer { y el último }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    text = text.slice(start, end + 1);
  }

  try {
    const parsed = JSON.parse(text);
    return parsed as ScannedTicket;
  } catch {
    return { rawText: content };
  }
}
