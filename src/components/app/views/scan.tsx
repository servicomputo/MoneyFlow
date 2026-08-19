"use client";

import { useState, useRef, useEffect } from "react";
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
import { CategoryIcon } from "../category-icon";
import { AmountInput } from "../amount-input";
import { useCategories, useAccounts, mutations } from "../hooks";
import { useOpenAIStore } from "@/lib/openai-store";
import { scanTicketWithOpenAI } from "@/lib/ai/openai";
import { canScanMore, recordScan, getTodayScanCount, getMaxTicketsPerDay } from "@/lib/scan-limiter";
import { PAYMENT_METHODS } from "@/lib/categories";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  ScanLine,
  Upload,
  Camera,
  FileText,
  Check,
  Loader2,
  Sparkles,
  X,
  Key,
  ImageIcon,
  AlertCircle,
} from "lucide-react";

interface ScanResult {
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

export function ScanView() {
  const { data: categories } = useCategories();
  const { data: accounts } = useAccounts();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const { apiKey } = useOpenAIStore();

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [saving, setSaving] = useState(false);

  const [scanCount, setScanCount] = useState(0);
  const [scanLimit] = useState(getMaxTicketsPerDay());

  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [merchant, setMerchant] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");

  useEffect(() => {
    refreshScanCount();
  }, []);

  async function refreshScanCount() {
    const count = await getTodayScanCount();
    setScanCount(count);
  }

  const remainingScans = scanLimit - scanCount;
  const scanPercentage = (scanCount / scanLimit) * 100;

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      toast.error("Sube una imagen o PDF");
      return;
    }
    if (!apiKey) {
      toast.error("Necesitas una API key de OpenAI", {
        description: "Configúrala en Configuración → IA",
      });
      return;
    }
    const { canScan, used, limit } = await canScanMore();
    if (!canScan) {
      toast.error(`Límite diario alcanzado (${used}/${limit})`, {
        description: "Vuelve mañana o registra el gasto manualmente.",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setImagePreview(dataUrl);
      setImageBase64(dataUrl);
      setResult(null);
      scanImage(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  async function scanImage(base64: string) {
    setScanning(true);
    try {
      const d = await scanTicketWithOpenAI(base64, apiKey);
      if (d.error) throw new Error(d.error);
      // Registrar uso de IA inmediatamente después del escaneo exitoso
      // (la llamada a OpenAI ya se hizo, cuenta aunque el usuario no guarde el gasto)
      await recordScan(d.merchant, d.total);
      await refreshScanCount();
      setResult(d);
      if (d.total) setAmount(String(d.total));
      if (d.date) setDate(d.date.slice(0, 10));
      else setDate(new Date().toISOString().slice(0, 10));
      if (d.merchant) setMerchant(d.merchant);
      if (d.paymentMethod) setPaymentMethod(d.paymentMethod);
      if (accounts?.length) setAccountId(accounts.find((a) => a.isDefault)?.id || "");
      toast.success("Ticket analizado con IA", {
        description: d.merchant ? `Comercio: ${d.merchant}` : undefined,
      });
      // Aviso si quedan pocas consultas
      const newRemaining = (scanLimit) - (scanCount + 1);
      if (newRemaining <= 5 && newRemaining > 0) {
        toast.info(`Te quedan ${newRemaining} consultas de IA hoy`, {
          description: "Incluye escaneos y consultas al asistente.",
        });
      }
    } catch (e) {
      toast.error("No se pudo leer el ticket", {
        description: e instanceof Error ? e.message : "Intenta con otra imagen",
      });
    } finally {
      setScanning(false);
    }
  }

  function reset() {
    setImagePreview(null);
    setImageBase64(null);
    setResult(null);
    setAmount("");
    setDate("");
    setMerchant("");
    setCategoryId("");
    setAccountId("");
    setPaymentMethod("");
  }

  async function handleSave() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast.error("Importe no válido");
      return;
    }
    if (!categoryId) {
      toast.error("Selecciona una categoría", {
        description: "Es obligatorio para guardar el gasto.",
      });
      return;
    }
    if (!paymentMethod) {
      toast.error("Selecciona un método de pago", {
        description: "Es obligatorio para guardar el gasto.",
      });
      return;
    }
    setSaving(true);
    try {
      const expenseDate = date ? new Date(date + "T12:00:00").toISOString() : new Date().toISOString();
      await mutations.createExpense({
        amount: amt,
        type: "expense",
        date: expenseDate,
        categoryId,
        merchantName: merchant || null,
        paymentMethod: paymentMethod || null,
        accountId: accountId || null,
        subtotal: result?.subtotal,
        tax: result?.tax,
        ticketNumber: result?.ticketNumber,
        rfc: result?.rfc,
        source: "scan",
        rawText: result?.rawText,
        imageUrl: null, // No guardamos la imagen para no llenar la base de datos
      });
      // El uso de IA ya se registró al escanear, no se registra de nuevo
      toast.success("Gasto creado desde el ticket", {
        description: `${formatCurrency(amt)} · ${merchant || "Sin comercio"}`,
      });
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["budgets"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      reset();
    } catch (e) {
      toast.error("No se pudo guardar", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <ScanLine className="h-6 w-6 text-primary" />
          Escanear ticket
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Toma una foto o sube una imagen. La IA extrae automáticamente los datos del recibo.
        </p>
      </div>

      {/* Aviso de API key */}
      {!apiKey && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
              <Key className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">API key de OpenAI requerida</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Para escanear tickets necesitas configurar tu API key de OpenAI.
                Ve a Configuración → IA.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contador de escaneos */}
      {apiKey && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ScanLine className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Escaneos de hoy</span>
              </div>
              <Badge variant={remainingScans <= 5 ? "destructive" : "secondary"}>
                {scanCount} / {scanLimit}
              </Badge>
            </div>
            <Progress value={scanPercentage} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1.5">
              {remainingScans > 0
                ? `Te quedan ${remainingScans} escaneos hoy`
                : "Límite diario alcanzado — vuelve mañana"}
            </p>
          </CardContent>
        </Card>
      )}

      {!imagePreview ? (
        <Card className="border-dashed border-2">
          <CardContent className="p-0">
            <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x">
              <UploadZone icon={<Camera className="h-7 w-7" />} title="Tomar foto" desc="Usa la cámara" onClick={() => cameraRef.current?.click()} disabled={!apiKey || remainingScans <= 0} />
              <UploadZone icon={<ImageIcon className="h-7 w-7" />} title="Subir imagen" desc="Galería o archivo" onClick={() => fileRef.current?.click()} disabled={!apiKey || remainingScans <= 0} />
              <UploadZone icon={<FileText className="h-7 w-7" />} title="Subir PDF" desc="Factura o recibo" onClick={() => fileRef.current?.click()} disabled={!apiKey || remainingScans <= 0} />
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2 flex-row items-center justify-between">
              <CardTitle className="text-sm">Ticket</CardTitle>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={reset}><X className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent>
              <div className="relative rounded-xl overflow-hidden bg-muted aspect-[3/4] flex items-center justify-center">
                {imagePreview.startsWith("data:application/pdf") ? (
                  <iframe src={imagePreview} className="w-full h-full" title="PDF preview" />
                ) : (
                  <img src={imagePreview} alt="Ticket" className="w-full h-full object-contain" />
                )}
                {scanning && (
                  <div className="absolute inset-0 bg-background/80 backdrop-blur flex flex-col items-center justify-center gap-3">
                    <div className="relative">
                      <ScanLine className="h-10 w-10 text-primary animate-pulse" />
                      <div className="absolute inset-x-0 top-0 h-0.5 bg-primary animate-pulse" />
                    </div>
                    <p className="text-sm font-medium">Analizando con IA...</p>
                    <p className="text-xs text-muted-foreground">GPT-4o mini extrayendo datos</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Datos extraídos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {scanning ? (
                <div className="space-y-2">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-9 w-full bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Importe</Label>
                    <AmountInput value={amount} onValueChange={setAmount} placeholder="0.00" className="text-lg font-semibold" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Fecha</Label>
                      <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Comercio</Label>
                      <Input value={merchant} onChange={(e) => setMerchant(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">
                      Categoría <span className="text-red-500">*</span>
                      <span className="text-muted-foreground font-normal"> (obligatorio)</span>
                    </Label>
                    <Select value={categoryId} onValueChange={setCategoryId}>
                      <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                      <SelectContent>
                        {categories?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            <div className="flex items-center gap-2">
                              <CategoryIcon icon={c.icon} color={c.color} size="sm" className="h-6 w-6" />
                              <span>{c.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">
                        Método <span className="text-red-500">*</span>
                        <span className="text-muted-foreground font-normal"> (obligatorio)</span>
                      </Label>
                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          {PAYMENT_METHODS.map((m) => (
                            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Cuenta</Label>
                      <Select value={accountId} onValueChange={setAccountId}>
                        <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          {accounts?.map((a) => (
                            <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {(result?.subtotal || result?.tax || result?.ticketNumber || result?.rfc) && (
                    <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-xs">
                      <p className="font-medium text-muted-foreground mb-1">Detalles del ticket</p>
                      {result.subtotal && (<div className="flex justify-between"><span>Subtotal</span><span className="font-medium">{formatCurrency(result.subtotal)}</span></div>)}
                      {result.tax && (<div className="flex justify-between"><span>IVA</span><span className="font-medium">{formatCurrency(result.tax)}</span></div>)}
                      {result.ticketNumber && (<div className="flex justify-between"><span>Folio</span><span className="font-medium">{result.ticketNumber}</span></div>)}
                      {result.rfc && (<div className="flex justify-between"><span>RFC</span><span className="font-medium">{result.rfc}</span></div>)}
                    </div>
                  )}

                  {result?.products && result.products.length > 0 && (
                    <details className="rounded-lg bg-muted/50 p-3 text-xs">
                      <summary className="font-medium cursor-pointer">
                        Productos detectados ({result.products.length})
                      </summary>
                      <ul className="mt-2 space-y-1">
                        {result.products.map((p, i) => (
                          <li key={i} className="flex justify-between">
                            <span className="truncate">{p.name}{p.qty ? ` x${p.qty}` : ""}</span>
                            {p.price && <span className="font-medium">{formatCurrency(p.price)}</span>}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}

                  {/* Aviso de campos obligatorios */}
                  {(!categoryId || !paymentMethod) && (
                    <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-2.5 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        Para guardar el gasto, selecciona{" "}
                        <strong>categoría</strong> y <strong>método de pago</strong>.
                      </p>
                    </div>
                  )}

                  <Button
                    onClick={handleSave}
                    disabled={saving || !categoryId || !paymentMethod}
                    className="w-full gap-2"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Crear gasto
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />

      {!imagePreview && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Cómo funciona</p>
                <ul className="text-xs text-muted-foreground mt-1.5 space-y-1">
                  <li>• La IA (GPT-4o mini) lee fecha, comercio, total, IVA, productos y más</li>
                  <li>• Clasifica automáticamente el gasto en la categoría correcta</li>
                  <li>• Aprende de tus correcciones para futuros escaneos</li>
                  <li>• Funciona con tickets de supermercado, restaurantes, farmacias, etc.</li>
                  <li>• Límite: {getMaxTicketsPerDay()} tickets por día — se reinicia a medianoche</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function UploadZone({ icon, title, desc, onClick, disabled }: { icon: React.ReactNode; title: string; desc: string; onClick: () => void; disabled?: boolean; }) {
  return (
    <button onClick={onClick} disabled={disabled} className="flex flex-col items-center justify-center gap-2 p-8 hover:bg-accent/50 transition-colors text-center disabled:opacity-50 disabled:cursor-not-allowed">
      <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">{icon}</div>
      <div><p className="font-medium text-sm">{title}</p><p className="text-xs text-muted-foreground">{desc}</p></div>
    </button>
  );
}
