"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
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
import { useAppStore } from "@/lib/store";
import { monthKey } from "@/lib/format";
import { usePaletteStore } from "@/lib/palette-store";
import { PALETTES } from "@/lib/palettes";
import { useDataModeStore } from "@/lib/data-mode";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  User,
  Palette,
  DollarSign,
  Shield,
  Crown,
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
  Smartphone,
  Server,
  Wifi,
  WifiOff,
  Save,
  HardDrive,
  Wallet,
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
  const selectedMonth = useAppStore((s) => s.selectedMonth);
  const palette = usePaletteStore((s) => s.palette);
  const setPalette = usePaletteStore((s) => s.setPalette);
  const dataMode = useDataModeStore((s) => s.mode);
  const setDataMode = useDataModeStore((s) => s.setMode);
  const iaServerUrl = useDataModeStore((s) => s.iaServerUrl);
  const setIaServerUrl = useDataModeStore((s) => s.setIaServerUrl);

  const [name, setName] = useState("Usuario Money Flow");
  const [email, setEmail] = useState("hola@moneyflow.app");
  const [currency, setCurrency] = useState("MXN");

  const [pinLock, setPinLock] = useState(false);
  const [biometric, setBiometric] = useState(false);
  const [encryption, setEncryption] = useState(false);

  const [resetOpen, setResetOpen] = useState(false);
  const [iaUrlInput, setIaUrlInput] = useState(iaServerUrl);

  function premiumToast() {
    toast.info("Función premium", {
      description: "Mejora a Premium para desbloquear esta función.",
    });
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
            <div className="h-16 w-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold shrink-0" style={{ background: "linear-gradient(135deg, var(--primary), color-mix(in oklch, var(--primary), #000 30%))" }}>
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
          <Button
            size="sm"
            onClick={() =>
              toast.info("Próximamente: sincronización en la nube", {
                description: "Tus datos se guardan localmente por ahora.",
              })
            }
          >
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
            desc="Pide un PIN al abrir la app"
            checked={pinLock}
            onCheckedChange={(v) => {
              setPinLock(v);
              if (v) premiumToast();
            }}
          />
          <Separator />
          <SecurityRow
            icon={<Shield className="h-4 w-4" />}
            title="Huella dactilar / Face ID"
            desc="Desbloqueo biométrico"
            checked={biometric}
            onCheckedChange={(v) => {
              setBiometric(v);
              if (v) premiumToast();
            }}
          />
          <Separator />
          <SecurityRow
            icon={<Database className="h-4 w-4" />}
            title="Cifrado de datos"
            desc="Cifrado local de extremo a extremo"
            checked={encryption}
            onCheckedChange={(v) => {
              setEncryption(v);
              if (v) premiumToast();
            }}
          />
        </CardContent>
      </Card>

      {/* Modo de datos — la sección clave */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            Modo de datos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Elige dónde guardar tus datos. Puedes usar Money Flow solo en tu celular
            sin servidor, o sincronizar con un servidor para multi-dispositivo.
          </p>

          {/* Selector de modo */}
          <div className="grid sm:grid-cols-2 gap-3">
            <ModeCard
              active={dataMode === "local"}
              onClick={() => {
                setDataMode("local");
                toast.success("Modo local activado", {
                  description: "Tus datos se guardan solo en este dispositivo. Funciona sin servidor.",
                });
              }}
              icon={<Smartphone className="h-5 w-5" />}
              title="Solo este dispositivo"
              subtitle="Gratis · Sin servidor"
              features={["Datos en tu celular", "Funciona offline", "100% privado", "Sin sincronización"]}
              badge="GRATIS"
            />
            <ModeCard
              active={dataMode === "server"}
              onClick={() => {
                setDataMode("server");
                toast.success("Modo servidor activado", {
                  description: "Tus datos se sincronizan con el servidor.",
                });
              }}
              icon={<Server className="h-5 w-5" />}
              title="Sincronizar con servidor"
              subtitle="Premium · Multi-dispositivo"
              features={["Sincronización en la nube", "Acceso desde cualquier dispositivo", "Backup automático", "IA completa (escaneo + asistente)"]}
              badge="PREMIUM"
            />
          </div>

          {/* Configuración de servidor IA (solo modo local) */}
          {dataMode === "local" && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Funciones de IA en modo local</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    El escaneo de tickets y el asistente IA requieren un servidor.
                    Si tienes un servidor Money Flow (tuyo o de un servicio Premium),
                    ingrésalo aquí para usar IA sin cambiar de modo.
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ia-url" className="text-xs">
                  URL del servidor IA (opcional)
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="ia-url"
                    placeholder="https://moneyflow.tudominio.com"
                    value={iaUrlInput}
                    onChange={(e) => setIaUrlInput(e.target.value)}
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      const cleaned = iaUrlInput.trim().replace(/\/$/, "");
                      setIaServerUrl(cleaned);
                      setIaUrlInput(cleaned);
                      if (cleaned) {
                        toast.success("Servidor IA configurado", {
                          description: "Escaneo y asistente usarán este servidor.",
                        });
                      } else {
                        toast.info("Servidor IA desactivado");
                      }
                    }}
                    className="gap-1.5 shrink-0"
                  >
                    <Save className="h-4 w-4" />
                    Guardar
                  </Button>
                </div>
                {iaServerUrl && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Wifi className="h-3 w-3" />
                    Conectado a: {iaServerUrl}
                  </p>
                )}
                {!iaServerUrl && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <WifiOff className="h-3 w-3" />
                    Sin servidor IA · Escaneo y asistente no disponibles
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Info de almacenamiento */}
          <div className="rounded-lg bg-muted/50 p-3 flex items-start gap-2">
            <HardDrive className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground">
              {dataMode === "local" ? (
                <>
                  <strong className="text-foreground">Almacenamiento local:</strong> tus datos se guardan
                  en el almacenamiento del navegador (IndexedDB). Limpia los datos del navegador
                  para borrarlos. Recomendado: exporta un respaldo periódicamente.
                </>
              ) : (
                <>
                  <strong className="text-foreground">Almacenamiento en servidor:</strong> tus datos
                  se guardan en la base de datos del servidor. Accesibles desde cualquier
                  dispositivo conectado al mismo servidor.
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Premium */}
      <Card className="border-0 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-rose-500/10 border-amber-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Crown className="h-4 w-4 text-amber-500" />
            Money Flow Premium
            <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20">
              PRO
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            {PREMIUM_FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="flex items-start gap-3 rounded-lg bg-background/60 backdrop-blur p-3 border border-amber-500/10"
                >
                  <div className="h-9 w-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{f.title}</p>
                    <p className="text-xs text-muted-foreground">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <Button
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
            onClick={() => toast.info("Próximamente", {
              description: "Premium se lanzará muy pronto. ¡Mantente atento!",
            })}
          >
            <Crown className="h-4 w-4" />
            Mejorar a Premium
          </Button>
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
            icon={<Download className="h-4 w-4" />}
            title="Exportar todos los datos"
            desc="Descarga tus gastos en JSON"
            actionLabel="Exportar"
            actionHref={`/api/export?format=json&month=${selectedMonth || monthKey()}`}
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
              style={{ background: "linear-gradient(135deg, #0A0A0A, #1a1a1a)", border: "1px solid #D4AF37" }}
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

      {/* Reset confirmation */}
      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Restablecer todos los datos?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente todos tus gastos, metas,
              recordatorios y configuraciones. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                setResetOpen(false);
                toast.info("Función de restablecimiento", {
                  description:
                    "Para reiniciar tus datos, exporta un respaldo y elimina la base local.",
                });
              }}
            >
              Restablecer
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
