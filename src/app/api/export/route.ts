import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { monthKey } from "@/lib/format";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") || "csv";
  const month = searchParams.get("month") || monthKey();
  const [y, m] = month.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0, 23, 59, 59, 999);

  const expenses = await db.expense.findMany({
    where: { date: { gte: start, lte: end } },
    include: { category: true, subcategory: true, merchant: true, account: true },
    orderBy: { date: "desc" },
  });

  const rows = expenses.map((e) => ({
    fecha: e.date.toISOString().slice(0, 10),
    importe: e.amount,
    moneda: e.currency,
    categoria: e.category.name,
    subcategoria: e.subcategory?.name || "",
    comercio: e.merchantName || "",
    metodo_pago: e.paymentMethod || "",
    cuenta: e.account?.name || "",
    notas: e.notes || "",
    etiquetas: e.tags,
    ticket: e.ticketNumber || "",
    rfc: e.rfc || "",
    subtotal: e.subtotal || "",
    iva: e.tax || "",
    fuente: e.source,
  }));

  const filename = `gastos-${month}`;

  if (format === "csv") {
    const headers = Object.keys(rows[0] || { fecha: "" });
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        headers.map((h) => {
          const v = (r as Record<string, unknown>)[h];
          if (v == null) return "";
          const s = String(v);
          return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
        }).join(",")
      ),
    ].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.csv"`,
      },
    });
  }

  if (format === "json") {
    return NextResponse.json(
      { month, count: rows.length, expenses: rows },
      {
        headers: {
          "Content-Disposition": `attachment; filename="${filename}.json"`,
        },
      }
    );
  }

  if (format === "tsv" || format === "excel") {
    // Excel-friendly: TSV with BOM so Excel opens it correctly
    const headers = Object.keys(rows[0] || { fecha: "" });
    const tsv = [
      headers.join("\t"),
      ...rows.map((r) =>
        headers.map((h) => {
          const v = (r as Record<string, unknown>)[h];
          return v == null ? "" : String(v).replace(/\t/g, " ");
        }).join("\t")
      ),
    ].join("\n");
    return new NextResponse("\uFEFF" + tsv, {
      headers: {
        "Content-Type": "text/tab-separated-values; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.xls"`,
      },
    });
  }

  if (format === "pdf") {
    // Generar un PDF simple en texto plano estructurado (HTML imprimible)
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Gastos ${month}</title>
<style>
body{font-family:Arial,sans-serif;padding:24px;color:#1a1a1a}
h1{color:#059669}
table{width:100%;border-collapse:collapse;font-size:11px;margin-top:12px}
th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}
th{background:#059669;color:#fff}
.total{margin-top:16px;font-size:16px;font-weight:bold;color:#059669}
</style></head><body>
<h1>Reporte de Gastos - ${month}</h1>
<p>Total de movimientos: ${rows.length}</p>
<table>
<thead><tr><th>Fecha</th><th>Comercio</th><th>Categoría</th><th>Método</th><th>Cuenta</th><th>Importe</th></tr></thead>
<tbody>
${expenses
  .map(
    (e) => `<tr>
<td>${e.date.toISOString().slice(0, 10)}</td>
<td>${e.merchantName || "-"}</td>
<td>${e.category.name}</td>
<td>${e.paymentMethod || "-"}</td>
<td>${e.account?.name || "-"}</td>
<td style="text-align:right">$${e.amount.toFixed(2)}</td>
</tr>`
  )
  .join("")}
</tbody>
</table>
<p class="total">Total: $${expenses.reduce((s, e) => s + e.amount, 0).toFixed(2)} MXN</p>
</body></html>`;
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.html"`,
      },
    });
  }

  return NextResponse.json({ error: "Formato no soportado" }, { status: 400 });
}
