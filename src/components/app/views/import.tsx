"use client";

import { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCategories, useAccounts } from "../hooks";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  Upload,
  FileSpreadsheet,
  FileText,
  Download,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  Database,
  AlertTriangle,
  Sparkles,
  RotateCcw,
  FileUp,
} from "lucide-react";

// Campos de FinZeni a los que se pueden mapear columnas
const MAPPABLE_FIELDS: Array<{
  key: string;
  label: string;
  required?: boolean;
  type: "number" | "date" | "text";
}> = [
  { key: "amount", label: "Importe", required: true, type: "number" },
  { key: "date", label: "Fecha", required: true, type: "date" },
  { key: "categoryName", label: "Categoría", type: "text" },
  { key: "subcategoryName", label: "Subcategoría", type: "text" },
  { key: "merchantName", label: "Comercio", type: "text" },
  { key: "paymentMethod", label: "Método de pago", type: "text" },
  { key: "accountName", label: "Cuenta", type: "text" },
  { key: "notes", label: "Notas", type: "text" },
  { key: "tags", label: "Etiquetas", type: "text" },
];

const PAYMENT_METHOD_MAP: Record<string, string> = {
  efectivo: "cash",
  cash: "cash",
  credito: "credit",
  "crédito": "credit",
  "tarjeta de credito": "credit",
  "tarjeta de crédito": "credit",
  debito: "debit",
  "débito": "debit",
  "tarjeta de debito": "debit",
  "tarjeta de débito": "debit",
  transferencia: "transfer",
  transfer: "transfer",
  wallet: "wallet",
  billetera: "wallet",
  "mercado pago": "wallet",
};

interface ParsedRow {
  [key: string]: string | number;
}

interface MappedExpense {
  amount: number;
  date: string;
  categoryName?: string;
  subcategoryName?: string;
  merchantName?: string;
  paymentMethod?: string;
  accountName?: string;
  notes?: string;
  tags?: string[];
  _valid: boolean;
  _error?: string;
}

export function ImportView() {
  const { data: categories } = useCategories();
  const { data: accounts } = useAccounts();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [parsing, setParsing] = useState(false);

  // Mapeo: fieldKey -> columnName
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [defaultCategoryId, setDefaultCategoryId] = useState<string>("");
  const [defaultAccountId, setDefaultAccountId] = useState<string>("");

  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    created: number;
    failed: number;
    total: number;
    merchantsCreated: number;
  } | null>(null);

  const mappedExpenses = buildMappedExpenses(rows, mapping, defaultCategoryId);

  const validCount = mappedExpenses.filter((e) => e._valid).length;
  const invalidCount = mappedExpenses.length - validCount;

  const handleFile = useCallback(async (file: File) => {
    setParsing(true);
    setResult(null);
    setFileName(file.name);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array", cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json<ParsedRow>(sheet, {
        defval: "",
        raw: false,
      });

      if (json.length === 0) {
        toast.error("El archivo no tiene datos");
        setParsing(false);
        return;
      }

      const cols = Object.keys(json[0]);
      setHeaders(cols);
      setRows(json);

      // Auto-mapear columnas por nombre
      const autoMapping: Record<string, string> = {};
      for (const field of MAPPABLE_FIELDS) {
        const match = cols.find((c) => {
          const cl = c.toLowerCase().trim();
          if (field.key === "amount")
            return ["importe", "amount", "total", "monto", "valor"].includes(cl);
          if (field.key === "date")
            return ["fecha", "date", "día", "dia", "fecha de gasto"].includes(cl);
          if (field.key === "categoryName")
            return ["categoría", "categoria", "category", "categoría de gasto"].includes(cl);
          if (field.key === "subcategoryName")
            return ["subcategoría", "subcategoria", "subcategory", "sub"].includes(cl);
          if (field.key === "merchantName")
            return ["comercio", "merchant", "establecimiento", "tienda", "proveedor"].includes(cl);
          if (field.key === "paymentMethod")
            return ["método de pago", "metodo de pago", "payment method", "pago", "método"].includes(cl);
          if (field.key === "accountName")
            return ["cuenta", "account", "cuenta bancaria", "tarjeta"].includes(cl);
          if (field.key === "notes")
            return ["notas", "notes", "descripción", "descripcion", "detalle", "concepto"].includes(cl);
          if (field.key === "tags")
            return ["etiquetas", "tags", "etiqueta"].includes(cl);
          return false;
        });
        if (match) autoMapping[field.key] = match;
      }
      setMapping(autoMapping);

      toast.success(`${json.length} filas detectadas`, {
        description: `${cols.length} columnas · ${file.name}`,
      });
    } catch (e) {
      toast.error("No se pudo leer el archivo", {
        description: e instanceof Error ? e.message : "Formato no soportado",
      });
    } finally {
      setParsing(false);
    }
  }, []);

  function reset() {
    setFileName(null);
    setHeaders([]);
    setRows([]);
    setMapping({});
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function downloadTemplate() {
    const sampleData = [
      {
        Fecha: "2025-01-15",
        Importe: 250.5,
        Comercio: "OXXO",
        Categoria: "Conveniencia",
        Subcategoria: "",
        "Metodo de Pago": "Efectivo",
        Cuenta: "Efectivo",
        Notas: "Compra de snacks",
        Etiquetas: "hormiga",
      },
      {
        Fecha: "2025-01-16",
        Importe: 1200,
        Comercio: "Walmart",
        Categoria: "Despensa",
        Subcategoria: "Abarrotes",
        "Metodo de Pago": "Credito",
        Cuenta: "Tarjeta BBVA Oro",
        Notas: "",
        Etiquetas: "",
      },
      {
        Fecha: "2025-01-17",
        Importe: 219,
        Comercio: "Netflix",
        Categoria: "Streaming",
        Subcategoria: "",
        "Metodo de Pago": "Credito",
        Cuenta: "Tarjeta BBVA Oro",
        Notas: "Suscripción mensual",
        Etiquetas: "recurrente",
      },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    // Ajustar ancho de columnas
    ws["!cols"] = [
      { wch: 12 }, { wch: 10 }, { wch: 18 }, { wch: 16 }, { wch: 14 },
      { wch: 16 }, { wch: 20 }, { wch: 24 }, { wch: 12 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Gastos");
    XLSX.writeFile(wb, "plantilla-gastos-fizeni.xlsx");
    toast.success("Plantilla descargada", {
      description: "Llena el archivo y súbelo de vuelta",
    });
  }

  async function handleImport() {
    const valid = mappedExpenses.filter((e) => e._valid);
    if (valid.length === 0) {
      toast.error("No hay gastos válidos para importar");
      return;
    }
    setImporting(true);
    try {
      const payload = valid.map(({ _valid, _error, ...rest }) => {
        const r: Record<string, unknown> = { ...rest };
        if (defaultCategoryId && !r.categoryId) r.categoryId = defaultCategoryId;
        if (defaultAccountId && !r.accountId) r.accountId = defaultAccountId;
        return r;
      });
      const r = await fetch("/api/expenses/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expenses: payload }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Error");
      setResult({
        created: d.created,
        failed: d.failed,
        total: d.total,
        merchantsCreated: d.merchantsCreated,
      });
      toast.success(`${d.created} gastos importados`, {
        description: d.merchantsCreated > 0 ? `${d.merchantsCreated} comercios nuevos creados` : undefined,
      });
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["budgets"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
    } catch (e) {
      toast.error("Error en la importación", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setImporting(false);
    }
  }

  // ===== Render =====

  if (result) {
    return (
      <div className="space-y-5 max-w-3xl mx-auto">
        <ImportResult result={result} onReset={reset} />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileUp className="h-6 w-6 text-primary" />
            Importar gastos
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Sube un Excel o CSV con todos tus gastos. Los cargamos en segundos.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
          <Download className="h-4 w-4" />
          Descargar plantilla
        </Button>
      </div>

      {/* Upload zone */}
      {!fileName && (
        <Card className="border-dashed border-2">
          <CardContent className="p-0">
            <label
              className="flex flex-col items-center justify-center gap-3 p-12 cursor-pointer hover:bg-accent/30 transition-colors text-center"
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add("bg-accent/40");
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove("bg-accent/40");
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove("bg-accent/40");
                const f = e.dataTransfer.files?.[0];
                if (f) handleFile(f);
              }}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv,.tsv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                {parsing ? (
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                ) : (
                  <Upload className="h-8 w-8 text-primary" />
                )}
              </div>
              <div>
                <p className="font-semibold text-base">
                  {parsing ? "Leyendo archivo..." : "Arrastra tu archivo aquí"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  o haz clic para seleccionar · Excel (.xlsx), CSV, TSV
                </p>
              </div>
              <div className="flex gap-2 mt-2">
                <Badge variant="secondary" className="gap-1">
                  <FileSpreadsheet className="h-3 w-3" /> .xlsx
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <FileText className="h-3 w-3" /> .csv
                </Badge>
              </div>
            </label>
          </CardContent>
        </Card>
      )}

      {/* Tips when no file */}
      {!fileName && (
        <div className="grid sm:grid-cols-3 gap-3">
          <TipCard
            step="1"
            title="Descarga la plantilla"
            desc="O usa tu propio Excel con columnas: Fecha, Importe, Comercio, Categoría..."
            icon={<Download className="h-5 w-5" />}
          />
          <TipCard
            step="2"
            title="Sube tu archivo"
            desc="Arrastra el Excel o CSV. Lo parseamos automáticamente."
            icon={<Upload className="h-5 w-5" />}
          />
          <TipCard
            step="3"
            title="Mapea e importa"
            desc="Confirma el mapeo de columnas y carga todos los gastos a la vez."
            icon={<Database className="h-5 w-5" />}
          />
        </div>
      )}

      {/* File loaded: mapping + preview */}
      {fileName && (
        <>
          {/* File info bar */}
          <Card>
            <CardContent className="p-4 flex flex-wrap items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {rows.length} filas · {headers.length} columnas
                  {validCount > 0 && (
                    <span className="ml-2 text-emerald-600 dark:text-emerald-400">
                      · {validCount} válidas
                    </span>
                  )}
                  {invalidCount > 0 && (
                    <span className="ml-2 text-amber-600 dark:text-amber-400">
                      · {invalidCount} con errores
                    </span>
                  )}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={reset} className="gap-1.5">
                <RotateCcw className="h-4 w-4" />
                Cambiar archivo
              </Button>
            </CardContent>
          </Card>

          {/* Column mapping */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-primary" />
                Mapeo de columnas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">
                Asocia cada columna de tu archivo con el campo correspondiente en FinZeni.
                Hemos detectado algunas automáticamente.
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {MAPPABLE_FIELDS.map((field) => {
                  const mapped = mapping[field.key];
                  return (
                    <div key={field.key} className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1">
                        {field.label}
                        {field.required && (
                          <span className="text-destructive">*</span>
                        )}
                        {mapped && (
                          <CheckCircle2 className="h-3 w-3 text-emerald-500 ml-auto" />
                        )}
                      </Label>
                      <Select
                        value={mapped || "__none__"}
                        onValueChange={(v) =>
                          setMapping((m) => ({
                            ...m,
                            [field.key]: v === "__none__" ? "" : v,
                          }))
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="— Sin mapear —" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— Sin mapear —</SelectItem>
                          {headers.map((h) => (
                            <SelectItem key={h} value={h}>
                              {h}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>

              {/* Defaults for unmapped */}
              <div className="mt-4 pt-4 border-t grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Categoría por defecto (si no viene en el archivo)
                  </Label>
                  <Select value={defaultCategoryId || "__none__"} onValueChange={(v) => setDefaultCategoryId(v === "__none__" ? "" : v)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="— Ninguna —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Ninguna —</SelectItem>
                      {categories?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Cuenta por defecto (si no viene en el archivo)
                  </Label>
                  <Select value={defaultAccountId || "__none__"} onValueChange={(v) => setDefaultAccountId(v === "__none__" ? "" : v)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="— Ninguna —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Ninguna —</SelectItem>
                      {accounts?.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preview table */}
          <Card>
            <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Vista previa</CardTitle>
              <div className="flex items-center gap-2">
                {invalidCount > 0 && (
                  <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10 gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {invalidCount} filas con error
                  </Badge>
                )}
                <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10 gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {validCount} listas
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-auto scrollbar-thin rounded-b-xl">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Comercio</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-right">Importe</TableHead>
                      <TableHead className="w-8"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mappedExpenses.slice(0, 200).map((e, i) => (
                      <TableRow key={i} className={!e._valid ? "bg-amber-500/5" : ""}>
                        <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="text-sm">
                          {e.date ? formatDate(e.date) : "—"}
                        </TableCell>
                        <TableCell className="text-sm font-medium truncate max-w-32">
                          {e.merchantName || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground truncate max-w-28">
                          {e.categoryName || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-right font-semibold">
                          {e.amount ? formatCurrency(e.amount) : "—"}
                        </TableCell>
                        <TableCell>
                          {e._valid ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <span title={e._error}>
                              <XCircle className="h-4 w-4 text-amber-500" />
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {mappedExpenses.length > 200 && (
                <p className="text-xs text-muted-foreground text-center py-2 border-t">
                  Mostrando 200 de {mappedExpenses.length} filas
                </p>
              )}
            </CardContent>
          </Card>

          {/* Import action */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-5 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">
                    Listo para importar {validCount} gasto{validCount !== 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {invalidCount > 0
                      ? `${invalidCount} fila(s) se omitirán por errores`
                      : "Todas las filas son válidas"}
                  </p>
                </div>
              </div>
              <Button
                size="lg"
                onClick={handleImport}
                disabled={importing || validCount === 0}
                className="gap-2"
              >
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4" />
                    Importar {validCount} gastos
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function buildMappedExpenses(
  rows: ParsedRow[],
  mapping: Record<string, string>,
  defaultCategoryId: string
): MappedExpense[] {
  return rows.map((row) => {
    const get = (fieldKey: string) => {
      const col = mapping[fieldKey];
      if (!col) return "";
      const v = row[col];
      return v == null ? "" : String(v).trim();
    };

    const amountStr = get("amount").replace(/[^0-9.,-]/g, "").replace(/,/g, "");
    const amount = parseFloat(amountStr);
    const dateStr = get("date");
    let date = "";
    if (dateStr) {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) date = d.toISOString();
    }

    let paymentMethod = get("paymentMethod");
    if (paymentMethod) {
      const normalized = paymentMethod.toLowerCase().trim();
      paymentMethod = PAYMENT_METHOD_MAP[normalized] || paymentMethod.toLowerCase();
    }

    const tagsStr = get("tags");
    const tags = tagsStr
      ? tagsStr.split(/[,;|]/).map((t) => t.trim()).filter(Boolean)
      : [];

    let _valid = true;
    let _error: string | undefined;
    if (!amount || amount <= 0 || !isFinite(amount)) {
      _valid = false;
      _error = "Importe inválido";
    } else if (!date) {
      _valid = false;
      _error = "Fecha inválida";
    }

    return {
      amount,
      date,
      categoryName: get("categoryName") || undefined,
      subcategoryName: get("subcategoryName") || undefined,
      merchantName: get("merchantName") || undefined,
      paymentMethod: paymentMethod || undefined,
      accountName: get("accountName") || undefined,
      notes: get("notes") || undefined,
      tags: tags.length ? tags : undefined,
      categoryId: defaultCategoryId || undefined,
      _valid,
      _error,
    };
  });
}

function TipCard({
  step,
  title,
  desc,
  icon,
}: {
  step: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-primary bg-primary/10 rounded px-1.5 py-0.5">
                Paso {step}
              </span>
            </div>
            <p className="font-medium text-sm mt-1">{title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ImportResult({
  result,
  onReset,
}: {
  result: { created: number; failed: number; total: number; merchantsCreated: number };
  onReset: () => void;
}) {
  const pct = result.total > 0 ? (result.created / result.total) * 100 : 0;
  return (
    <>
      <Card className="border-0 text-white shadow-xl" style={{ background: "linear-gradient(135deg, var(--primary), color-mix(in oklch, var(--primary), #000 35%))" }}>
        <CardContent className="p-8 text-center">
          <div className="h-20 w-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-bold">¡Importación completada!</h2>
          <p className="text-white/80 mt-1">
            {result.created} de {result.total} gastos cargados correctamente
          </p>
          <Progress value={pct} className="mt-4 h-2 bg-white/20" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Creados" value={result.created} icon={<CheckCircle2 className="h-5 w-5" />} tone="success" />
        <StatCard label="Fallidos" value={result.failed} icon={<XCircle className="h-5 w-5" />} tone={result.failed > 0 ? "warning" : "muted"} />
        <StatCard label="Total" value={result.total} icon={<Database className="h-5 w-5" />} tone="muted" />
        <StatCard label="Comercios nuevos" value={result.merchantsCreated} icon={<Sparkles className="h-5 w-5" />} tone="primary" />
      </div>

      <div className="flex gap-2 justify-center">
        <Button variant="outline" onClick={onReset} className="gap-2">
          <Upload className="h-4 w-4" />
          Importar otro archivo
        </Button>
      </div>
    </>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "success" | "warning" | "muted" | "primary";
}) {
  const tones = {
    success: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
    warning: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
    muted: "text-muted-foreground bg-muted",
    primary: "text-primary bg-primary/10",
  };
  return (
    <Card>
      <CardContent className="p-4">
        <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center mb-2", tones[tone])}>
          {icon}
        </div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
