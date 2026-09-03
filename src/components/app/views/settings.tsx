"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAppStore, type ViewKey } from "@/lib/store";
import { monthKey, formatCurrency } from "@/lib/format";
import { usePaletteStore } from "@/lib/palette-store";
import { useProfileStore } from "@/lib/profile-store";
import { PALETTES } from "@/lib/palettes";
import { useOpenAIStore } from "@/lib/openai-store";
import { useSecurityStore } from "@/lib/security-store";
import { PinSetupDialog } from "../pin-lock";
import { dataProvider } from "@/lib/data-provider";
import { downloadOrShareFile } from "@/lib/export-file";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  User,
  Palette,
  DollarSign,
  Shield,
  Database,
  Info,
  Moon,
  Sun,
  Monitor,
  Download,
  Cloud,
  RotateCcw,
  Check,
  Sparkles,
  ScanLine,
  Brain,
  TrendingUp,
  Copy,
  Lock,
  Save,
  Wallet,
  Key,
  AlertCircle,
  Building2,
  FileUp,
  FileText,
  Loader2,
} from "lucide-react";

const PREMIUM_FEATURES = [
  {
    icon: ScanLine,
    title: "Escaneo masivo",
    desc: "Procesa decenas de tickets en lote",
  },
  {
    icon: Copy,
    title: "Detección de duplicados",
    desc: "IA que encuentra gastos repetidos",
  },
  {
    icon: Brain,
    title: "Chat IA avanzado",
    desc: "Análisis predictivo y respuestas proactivas",
  },
  {
    icon: TrendingUp,
    title: "Predicciones",
    desc: "Pronóstico de gastos y ahorro a 12 meses",
  },
];

const APP_VERSION = "1.0.0";

export function SettingsView() {
  const { theme, setTheme } = useTheme();
  const qc = useQueryClient();
  const selectedMonth = useAppStore((s) => s.selectedMonth);
  const setView = useAppStore((s) => s.setView);
  const palette = usePaletteStore((s) => s.palette);
  const setPalette = usePaletteStore((s) => s.setPalette);
  const openaiApiKey = useOpenAIStore((s) => s.apiKey);
  const setOpenaiApiKey = useOpenAIStore((s) => s.setApiKey);
  const { pinEnabled, setPinEnabled } = useSecurityStore();

  const profileName = useProfileStore((s) => s.name);
  const profileEmail = useProfileStore((s) => s.email);
  const profileCurrency = useProfileStore((s) => s.currency);
  const setProfile = useProfileStore((s) => s.setProfile);

  const [name, setName] = useState(profileName);
  const [email, setEmail] = useState(profileEmail);
  const [currency, setCurrency] = useState(profileCurrency);
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<"json" | "csv">("json");
  const [exportOpen, setExportOpen] = useState(false);
  const [pinSetupOpen, setPinSetupOpen] = useState(false);

  const [resetOpen, setResetOpen] = useState(false);
  const [openaiKeyInput, setOpenaiKeyInput] = useState(openaiApiKey);

  function premiumToast() {
    toast.info("Función premium", {
      description: "Mejora a Premium para desbloquear esta función.",
    });
  }

  function handleSaveProfile() {
    if (!name.trim()) {
      toast.error("El nombre no puede estar vacío");
      return;
    }
    setProfile({ name: name.trim(), email: email.trim(), currency });
    toast.success("Perfil guardado", {
      description: "Tus datos se guardaron correctamente.",
    });
  }

  async function handleExport(format: "json" | "csv") {
    setExporting(true);
    try {
      const [expenses, accounts, budgets, subscriptions, goals, categories] = await Promise.all([
        dataProvider.listExpensesRange("2000-01-01", "2100-12-31"),
        dataProvider.listAccounts(),
        dataProvider.listBudgets(),
        dataProvider.listSubscriptions(),
        dataProvider.listGoals(),
        dataProvider.listCategories(),
      ]);

      const exportData = {
        exportedAt: new Date().toISOString(),
        app: "Money Flow",
        version: "1.0",
        profile: { name: profileName, email: profileEmail, currency: profileCurrency },
        expenses: expenses.map((e) => ({
          date: e.date,
          amount: e.amount,
          type: e.type,
          currency: e.currency,
          category: e.category?.name || null,
          subcategory: e.subcategory?.name || null,
          merchant: e.merchantName || null,
          paymentMethod: e.paymentMethod || null,
          account: e.account?.name || null,
          notes: e.notes || null,
          tags: e.tags || null,
          source: e.source || null,
        })),
        accounts: accounts.map((a) => ({
          name: a.name,
          type: a.type,
          balance: a.balance,
          currency: a.currency,
          bank: a.bank || null,
          last4: a.last4 || null,
        })),
        budgets: budgets.map((b) => ({
          category: b.category?.name || null,
          amount: b.amount,
          period: b.period,
          month: b.month || null,
        })),
        subscriptions: subscriptions.map((s) => ({
          name: s.name,
          type: s.type,
          amount: s.amount,
          period: s.period,
          nextDate: s.nextDate,
          active: s.active,
        })),
        goals: goals.map((g) => ({
          name: g.name,
          target: g.target,
          current: g.current,
          deadline: g.deadline || null,
        })),
        categories: categories.map((c) => ({
          name: c.name,
          icon: c.icon,
          color: c.color,
          type: c.type,
        })),
        summary: {
          totalExpenses: expenses.filter((e) => e.type !== "income").length,
          totalIncome: expenses.filter((e) => e.type === "income").length,
          totalAccounts: accounts.length,
          totalBudgets: budgets.length,
          totalSubscriptions: subscriptions.length,
          totalGoals: goals.length,
        },
      };

      const monthStr = selectedMonth || monthKey();
      const dateStr = new Date().toISOString().slice(0, 10);

      let fileName: string;
      let content: string;
      let mimeType: string;

      if (format === "json") {
        fileName = `moneyflow-${monthStr}-${dateStr}.json`;
        content = JSON.stringify(exportData, null, 2);
        mimeType = "application/json";
      } else {
        // CSV: gastos
        const headers = ["Fecha", "Tipo", "Monto", "Moneda", "Categoria", "Comercio", "Metodo", "Cuenta", "Notas"];
        const rows = expenses.map((e) => [
          new Date(e.date).toLocaleDateString("es-MX"),
          e.type === "income" ? "Ingreso" : "Gasto",
          e.amount,
          e.currency,
          e.category?.name || "",
          e.merchantName || "",
          e.paymentMethod || "",
          e.account?.name || "",
          (e.notes || "").replace(/[\n,]/g, " "),
        ]);
        const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
        fileName = `moneyflow-gastos-${dateStr}.csv`;
        content = `\uFEFF${csv}`;
        mimeType = "text/csv;charset=utf-8";
      }

      const ok = await downloadOrShareFile(content, fileName, mimeType);
      if (!ok) {
        throw new Error("No se pudo descargar ni compartir el archivo");
      }

      toast.success("Datos exportados", {
        description: `${expenses.length} movimientos · ${accounts.length} cuentas`,
      });
    } catch (e) {
      console.error(e);
      toast.error("No se pudo exportar", {
        description: e instanceof Error ? e.message : "Intenta de nuevo",
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          Configuración
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Personaliza Money Flow a tu medida
        </p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Perfil
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold shrink-0" style={{ background: "linear-gradient(135deg, var(--primary), #000)" }}>
              {name.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{name}</p>
              <p className="text-xs text-muted-foreground truncate">{email}</p>
              <Badge
                variant="outline"
                className="mt-1 text-[10px] h-5 bg-primary/10 text-primary border-primary/20"
              >
                Cuenta local
              </Badge>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="s-name">Nombre</Label>
              <Input
                id="s-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-email">Correo</Label>
              <Input
                id="s-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <Button size="sm" onClick={handleSaveProfile}>
            <Check className="h-4 w-4" />
            Guardar
          </Button>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" />
            Apariencia
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label className="text-xs text-muted-foreground">Tema</Label>
          <div className="grid grid-cols-3 gap-2">
            <ThemeCard
              active={theme === "light"}
              onClick={() => setTheme("light")}
              icon={<Sun className="h-4 w-4" />}
              label="Claro"
            />
            <ThemeCard
              active={theme === "dark"}
              onClick={() => setTheme("dark")}
              icon={<Moon className="h-4 w-4" />}
              label="Oscuro"
            />
            <ThemeCard
              active={theme === "system"}
              onClick={() => setTheme("system")}
              icon={<Monitor className="h-4 w-4" />}
              label="Sistema"
            />
          </div>

          <Separator className="my-1" />

          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">
              Color de acento
            </Label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {PALETTES.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => {
                    setPalette(p.key);
                    toast.success(`Paleta: ${p.name}`, {
                      description: p.description,
                    });
                  }}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border p-2.5 transition-all",
                    palette === p.key
                      ? "border-foreground/30 ring-2 ring-foreground/10 bg-accent"
                      : "border-border hover:bg-accent/50"
                  )}
                  title={p.description}
                >
                  <div
                    className="h-7 w-7 rounded-full shadow-sm ring-2 ring-background"
                    style={{ backgroundColor: p.swatch }}
                  />
                  <span className="text-[10px] font-medium leading-tight text-center">
                    {p.name}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Elige la paleta que más te guste. Se aplica a toda la app.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Currency */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            Moneda
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="s-currency" className="text-xs text-muted-foreground">
              Moneda predeterminada
            </Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger id="s-currency" className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MXN">🇲🇽 Peso Mexicano (MXN)</SelectItem>
                <SelectItem value="USD">🇺🇸 Dólar (USD)</SelectItem>
                <SelectItem value="EUR">🇪🇺 Euro (EUR)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Solo afecta la visualización en esta pantalla.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Seguridad
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <SecurityRow
            icon={<Lock className="h-4 w-4" />}
            title="Bloqueo con PIN"
            desc="Pide un PIN de 4 dígitos al abrir la app"
            checked={pinEnabled}
            onCheckedChange={(v) => {
              if (v) {
                setPinSetupOpen(true);
              } else {
                setPinEnabled(false);
                toast.success("Bloqueo con PIN desactivado");
              }
            }}
          />
          {pinEnabled && (
            <div className="px-4 py-2 text-xs text-muted-foreground bg-muted/30 rounded-lg mt-1 flex items-center gap-2">
              <Lock className="h-3 w-3 shrink-0" />
              <span>PIN activado. La app pedirá tu PIN al abrirla.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* IA — OpenAI API Key */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Inteligencia Artificial
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Configura tu API key de OpenAI para usar el escáner de tickets con IA (GPT-4o mini),
            clasificación automática y el asistente conversacional.
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="openai-key" className="text-xs">
              API Key de OpenAI
            </Label>
            <div className="flex gap-2">
              <Input
                id="openai-key"
                type="password"
                placeholder="sk-..."
                value={openaiKeyInput}
                onChange={(e) => setOpenaiKeyInput(e.target.value)}
              />
              <Button
                size="sm"
                onClick={() => {
                  const cleaned = openaiKeyInput.trim();
                  setOpenaiApiKey(cleaned);
                  if (cleaned) {
                    toast.success("API key de OpenAI guardada", {
                      description: "El escáner de tickets ya está disponible.",
                    });
                  } else {
                    toast.info("API key removida");
                  }
                }}
                className="gap-1.5 shrink-0"
              >
                <Save className="h-4 w-4" />
                Guardar
              </Button>
            </div>
            {openaiApiKey ? (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="h-3 w-3" />
                API key configurada — escáner de tickets activo
              </p>
            ) : (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Sin API key — el escáner no está disponible
              </p>
            )}
          </div>

          <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-xs text-muted-foreground">
            <p className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-primary" />
              <strong className="text-foreground">¿Cómo obtener una API key?</strong>
            </p>
            <ol className="list-decimal list-inside space-y-0.5 ml-1">
              <li>Visita <strong>platform.openai.com</strong></li>
              <li>Crea una cuenta o inicia sesión</li>
              <li>Ve a <strong>API Keys → Create new key</strong></li>
              <li>Copia la key (empieza con "sk-")</li>
              <li>Pégala aquí y guarda</li>
            </ol>
            <p className="mt-1.5">
              <strong className="text-foreground">Costo aproximado:</strong> ~$2.74 USD/año
              (50 tickets/día con GPT-4o mini)
            </p>
          </div>

          {/* Límite diario */}
          <div className="rounded-lg border p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Límite diario de escaneos</span>
              <Badge variant="secondary" className="text-xs">50 tickets/día</Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Se reinicia automáticamente a medianoche. El registro manual de gastos
              no tiene límite.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Data */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            Datos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <DataRow
            icon={<FileUp className="h-4 w-4" />}
            title="Importar gastos desde Excel"
            desc="Carga tus gastos masivamente desde un archivo .xlsx o .csv"
            actionLabel="Importar"
            onAction={() => setView("import")}
          />
          <Separator />
          <DataRow
            icon={<Download className="h-4 w-4" />}
            title="Exportar datos"
            desc="Descarga tus movimientos y cuentas en JSON o CSV"
            actionLabel="Exportar"
            onAction={() => setExportOpen(true)}
          />
          <Separator />
          <DataRow
            icon={<Cloud className="h-4 w-4" />}
            title="Backup en la nube"
            desc="Sincronización automática"
            actionLabel="Activar"
            onAction={() => premiumToast()}
          />
          <Separator />
          <DataRow
            icon={<RotateCcw className="h-4 w-4" />}
            title="Restablecer datos"
            desc="Elimina todos tus datos locales"
            actionLabel="Restablecer"
            onAction={() => setResetOpen(true)}
            danger
          />
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            Acerca de
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* App identity */}
          <div className="flex items-center gap-3">
            <div
              className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, var(--primary), #000)", border: "1px solid #D4AF37" }}
            >
              <Wallet className="h-6 w-6" style={{ color: "#D4AF37" }} />
            </div>
            <div>
              <p className="font-semibold text-base leading-tight">Money Flow</p>
              <p className="text-xs text-muted-foreground">
                Control de gastos con IA · v{APP_VERSION}
              </p>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Versión</span>
            <Badge variant="secondary" className="font-mono text-xs">
              v{APP_VERSION}
            </Badge>
          </div>
          <Separator />

          {/* Operador */}
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <img
              src="/jema-logo.svg"
              alt="Jema Digital Solutions"
              className="h-10 w-10 rounded-lg shrink-0"
            />
            <div>
              <p className="text-sm font-medium">Operado por</p>
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Jema Digital Solutions</span>
                {" · "}
                <button
                  onClick={() => toast.info("hola@jema.digital")}
                  className="text-primary hover:underline"
                >
                  hola@jema.digital
                </button>
              </p>
            </div>
          </div>

          <Separator />
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <button
              onClick={() => toast.info("Política de privacidad")}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacidad
            </button>
            <button
              onClick={() => toast.info("Términos de uso")}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Términos
            </button>
            <button
              onClick={() => toast.info("hola@jema.digital")}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Soporte
            </button>
          </div>
          <p className="text-xs text-muted-foreground pt-2 text-center">
            © {new Date().getFullYear()} <span className="font-medium text-foreground">Jema Digital Solutions</span>
            {" · "}
            Money Flow
          </p>
        </CardContent>
      </Card>

      {/* Export dialog */}
      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              Exportar datos
            </DialogTitle>
            <DialogDescription>
              Elige el formato en que quieres descargar tu información.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <button
              type="button"
              onClick={() => setExportFormat("json")}
              className={cn(
                "w-full flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                exportFormat === "json"
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border hover:bg-accent"
              )}
            >
              <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">JSON (completo)</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Todos los datos: gastos, cuentas, presupuestos, recurrentes, metas y categorías
                </p>
              </div>
              {exportFormat === "json" && <Check className="h-4 w-4 text-primary shrink-0 mt-1" />}
            </button>
            <button
              type="button"
              onClick={() => setExportFormat("csv")}
              className={cn(
                "w-full flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                exportFormat === "csv"
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border hover:bg-accent"
              )}
            >
              <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">CSV (movimientos)</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Solo movimientos en formato Excel, con columnas simples
                </p>
              </div>
              {exportFormat === "csv" && <Check className="h-4 w-4 text-primary shrink-0 mt-1" />}
            </button>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setExportOpen(false)} disabled={exporting}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                await handleExport(exportFormat);
                setExportOpen(false);
              }}
              disabled={exporting}
              className="gap-2"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {exporting ? "Exportando..." : "Descargar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PIN Setup */}
      <PinSetupDialog
        open={pinSetupOpen}
        onOpenChange={setPinSetupOpen}
        onSuccess={() => {
          setPinSetupOpen(false);
          toast.success("PIN activado", {
            description: "La app pedirá tu PIN al abrirla.",
          });
        }}
      />

      {/* Reset confirmation */}
      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ ¿Restablecer todos los datos?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará <strong>permanentemente</strong> todos tus
              movimientos, cuentas, comercios, presupuestos, cargos recurrentes,
              metas de ahorro, recordatorios e insights de IA.
              <br /><br />
              <strong>No se puede deshacer.</strong> Las categorías y la cuenta
              de Efectivo se recrearán automáticamente.
              <br /><br />
              ¿Estás seguro de que quieres continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={async () => {
                setResetOpen(false);
                try {
                  const { getLocalDB } = await import("@/lib/local-db");
                  const db = await getLocalDB();
                  // Borrar todas las tablas
                  await Promise.all([
                    db.expenses.clear(),
                    db.accounts.clear(),
                    db.merchants.clear(),
                    db.merchantHints.clear(),
                    db.budgets.clear(),
                    db.subscriptions.clear(),
                    db.reminders.clear(),
                    db.goals.clear(),
                    db.insights.clear(),
                    db.categories.clear(),
                  ]);
                  // Limpiar meta excepto la key 'seeded' para forzar re-seed
                  await db.meta.clear();
                  // Invalidar todas las queries
                  qc.invalidateQueries();
                  toast.success("Datos restablecidos", {
                    description: "La app ha vuelto a su estado inicial. Las categorías y cuenta de Efectivo se recrearán automáticamente.",
                  });
                  // Recargar la página para re-ejecutar ensureLocalSeed
                  setTimeout(() => window.location.reload(), 1500);
                } catch (e) {
                  toast.error("No se pudo restablecer", {
                    description: e instanceof Error ? e.message : undefined,
                  });
                }
              }}
            >
              Sí, restablecer todo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ModeCard({
  active,
  onClick,
  icon,
  title,
  subtitle,
  features,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  features: string[];
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative text-left rounded-xl border p-4 transition-all",
        active
          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
          : "border-border hover:bg-accent/40"
      )}
    >
      {badge && (
        <span
          className={cn(
            "absolute top-3 right-3 text-[9px] font-bold px-1.5 py-0.5 rounded",
            badge === "PREMIUM"
              ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
              : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
          )}
        >
          {badge}
        </span>
      )}
      <div className="flex items-center gap-2.5 mb-2">
        <div
          className={cn(
            "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
            active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}
        >
          {icon}
        </div>
        <div className="pr-12">
          <p className="text-sm font-semibold leading-tight">{title}</p>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <ul className="space-y-1">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Check className={cn("h-3 w-3", active ? "text-primary" : "text-muted-foreground/60")} />
            {f}
          </li>
        ))}
      </ul>
    </button>
  );
}

function ThemeCard({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 transition-all",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border hover:bg-accent/50 text-muted-foreground"
      )}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

function SecurityRow({
  icon,
  title,
  desc,
  checked,
  onCheckedChange,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function DataRow({
  icon,
  title,
  desc,
  actionLabel,
  actionHref,
  onAction,
  danger,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  actionLabel: string;
  actionHref?: string;
  onAction?: () => void;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div
        className={cn(
          "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
          danger
            ? "bg-red-500/10 text-red-600 dark:text-red-400"
            : "bg-muted text-muted-foreground"
        )}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      {actionHref ? (
        <Button asChild size="sm" variant="outline">
          <a href={actionHref} download>
            {actionLabel}
          </a>
        </Button>
      ) : (
        <Button
          size="sm"
          variant={danger ? "outline" : "outline"}
          className={danger ? "text-red-600 hover:text-red-700 hover:bg-red-500/10" : ""}
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
