"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
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

import { useSubscriptions, useCategories, useAccounts, mutations, type Subscription } from "../hooks";
import { CategoryIcon } from "../category-icon";
import { AmountInput } from "../amount-input";
import { useViewAddHandler } from "../use-view-add-handler";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  RECURRING_TYPES,
  getRecurringType,
  normalizeType,
  type TransactionType,
} from "@/lib/recurring-types";
import { colorClasses } from "@/lib/categories";
import { cn } from "@/lib/utils";

import {
  Plus,
  Pencil,
  Trash2,
  Receipt,
  CalendarClock,
  Sparkles,
  CreditCard,
  Repeat,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  ArrowRight,
  Calendar as CalIcon,
  Check,
  Loader2,
} from "lucide-react";

const PERIODS = [
  { value: "weekly", label: "Semanal", monthsFactor: 12 / 52 },
  { value: "biweekly", label: "Quincenal", monthsFactor: 12 / 24 },
  { value: "monthly", label: "Mensual", monthsFactor: 1 },
  { value: "yearly", label: "Anual", monthsFactor: 1 / 12 },
] as const;

function periodLabel(p: string) {
  return PERIODS.find((x) => x.value === p)?.label || p;
}

function periodBadge(p: string) {
  if (p === "biweekly") return "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400";
  if (p === "yearly") return "bg-purple-500/10 text-purple-600 dark:text-purple-400";
  if (p === "weekly") return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
  return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
}

function toMonthly(amount: number, period: string) {
  const factor = PERIODS.find((p) => p.value === period)?.monthsFactor ?? 1;
  return amount * factor;
}

function toInputDate(d: string) {
  const date = new Date(d);
  if (isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

// Icono por tipo de transacción
function TypeIcon({ type, className }: { type: TransactionType; className?: string }) {
  if (type === "income") return <ArrowUpRight className={className} />;
  if (type === "transfer") return <ArrowLeftRight className={className} />;
  return <ArrowDownLeft className={className} />;
}

export function SubscriptionsView() {
  const qc = useQueryClient();
  const { data: subscriptions, isLoading } = useSubscriptions();
  const { data: categories } = useCategories();
  const { data: accounts } = useAccounts();

  // Menu de selección de tipo (Gasto / Ingreso / Transferencia)
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [toDelete, setToDelete] = useState<Subscription | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [txnType, setTxnType] = useState<TransactionType>("expense");
  const [formName, setFormName] = useState("");
  const [formMerchant, setFormMerchant] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formPeriod, setFormPeriod] = useState<string>("monthly");
  const [formNextDate, setFormNextDate] = useState("");
  const [formCategory, setFormCategory] = useState<string>("");
  const [formAccount, setFormAccount] = useState<string>("");
  const [formDestAccount, setFormDestAccount] = useState<string>("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Filter state
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Categorías filtradas según el tipo de transacción
  const filteredCategories = useMemo(() => {
    if (txnType === "transfer") return [];
    return categories?.filter((c) => c.type === txnType) || [];
  }, [categories, txnType]);

  const sorted = useMemo(() => {
    if (!subscriptions) return [];
    let list = [...subscriptions].sort(
      (a, b) => new Date(a.nextDate).getTime() - new Date(b.nextDate).getTime()
    );
    if (typeFilter !== "all") {
      list = list.filter((s) => normalizeType(s.type) === typeFilter);
    }
    return list;
  }, [subscriptions, typeFilter]);

  const active = useMemo(() => sorted.filter((s) => s.active), [sorted]);

  const totals = useMemo(() => {
    // Para transferencias, el monto no cuenta como gasto ni ingreso neto
    const monthlyExpenses = active
      .filter((s) => normalizeType(s.type) === "expense")
      .reduce((sum, s) => sum + toMonthly(s.amount, s.period), 0);
    const monthlyIncome = active
      .filter((s) => normalizeType(s.type) === "income")
      .reduce((sum, s) => sum + toMonthly(s.amount, s.period), 0);
    const monthlyTransfers = active
      .filter((s) => normalizeType(s.type) === "transfer")
      .reduce((sum, s) => sum + toMonthly(s.amount, s.period), 0);
    return {
      // Neto mensual: gastos negativos, ingresos positivos, transferencias neutras
      monthly: monthlyIncome - monthlyExpenses,
      monthlyExpenses,
      monthlyIncome,
      monthlyTransfers,
      count: active.length,
      annual: (monthlyIncome - monthlyExpenses) * 12,
    };
  }, [active]);

  // Totales por tipo de transacción (3 categorías principales)
  const totalsByType = useMemo(() => {
    if (!subscriptions) return [];
    const byType: Record<TransactionType, { count: number; monthly: number }> = {
      expense: { count: 0, monthly: 0 },
      income: { count: 0, monthly: 0 },
      transfer: { count: 0, monthly: 0 },
    };
    for (const s of subscriptions.filter((s) => s.active)) {
      const t = normalizeType(s.type);
      byType[t].count += 1;
      byType[t].monthly += toMonthly(s.amount, s.period);
    }
    return (Object.entries(byType) as Array<[TransactionType, { count: number; monthly: number }]>).map(
      ([type, data]) => ({
        type,
        ...data,
        ...getRecurringType(type),
      })
    );
  }, [subscriptions]);

  function openTypeMenu() {
    setTypeMenuOpen(true);
  }

  // Botón "+" contextual: abre el menú de agregar recurrente
  useViewAddHandler(openTypeMenu);

  function openCreateForType(type: TransactionType) {
    setTypeMenuOpen(false);
    setEditing(null);
    setTxnType(type);
    setFormName("");
    setFormMerchant("");
    setFormAmount("");
    setFormPeriod("monthly");
    const today = new Date();
    today.setMonth(today.getMonth() + 1);
    setFormNextDate(toInputDate(today.toISOString()));
    setFormCategory("");
    setFormAccount(accounts?.find((a) => a.isDefault)?.id || accounts?.[0]?.id || "");
    setFormDestAccount(
      accounts?.find((a) => !a.isDefault && a.id !== (accounts?.find((x) => x.isDefault)?.id || ""))?.id ||
        accounts?.[0]?.id ||
        ""
    );
    // Pequeño retraso para que el menú se cierre antes de abrir el formulario
    requestAnimationFrame(() => setDialogOpen(true));
  }

  function openEdit(s: Subscription) {
    const t = normalizeType(s.type);
    setEditing(s);
    setTxnType(t);
    setFormName(s.name);
    setFormMerchant(s.merchantName || "");
    setFormAmount(String(s.amount));
    setFormPeriod(s.period);
    setFormNextDate(toInputDate(s.nextDate));
    setFormCategory(s.category?.id || "");
    setFormAccount(s.account?.id || accounts?.find((a) => a.isDefault)?.id || "");
    // Para transferencias: merchantName guarda el nombre de la cuenta destino
    if (t === "transfer") {
      const destAccount = accounts?.find((a) => a.name === s.merchantName);
      setFormDestAccount(destAccount?.id || accounts?.[0]?.id || "");
    } else {
      setFormDestAccount(
        accounts?.find((a) => !a.isDefault && a.id !== formAccount)?.id || accounts?.[0]?.id || ""
      );
    }
    setDialogOpen(true);
  }

  // Cuando cambia el tipo o las categorías, asegurar categoría válida
  useEffect(() => {
    if (txnType === "transfer") {
      setFormCategory("");
      return;
    }
    if (filteredCategories.length > 0 && !filteredCategories.find((c) => c.id === formCategory)) {
      setFormCategory(filteredCategories[0].id);
    }
  }, [txnType, filteredCategories, formCategory]);

  // Cuando cambia la cuenta origen en transferencia, asegurar destino distinto
  useEffect(() => {
    if (txnType !== "transfer") return;
    if (!formDestAccount || formDestAccount === formAccount) {
      const next = accounts?.find((a) => a.id !== formAccount);
      if (next) setFormDestAccount(next.id);
    }
  }, [formAccount, formDestAccount, txnType, accounts]);

  async function save() {
    const amount = parseFloat(formAmount);
    if (!formName.trim() || isNaN(amount) || amount <= 0 || !formNextDate) {
      toast.error("Completa nombre, monto y fecha del próximo pago");
      return;
    }
    if (txnType === "transfer") {
      if (!formAccount || !formDestAccount) {
        toast.error("Selecciona las cuentas de origen y destino");
        return;
      }
      if (formAccount === formDestAccount) {
        toast.error("Las cuentas de origen y destino deben ser diferentes");
        return;
      }
    }
    setSaving(true);
    try {
      const fromAccount = accounts?.find((a) => a.id === formAccount);
      const toAccount = accounts?.find((a) => a.id === formDestAccount);
      const name =
        txnType === "transfer" && fromAccount && toAccount
          ? formName.trim() || `Transferencia: ${fromAccount.name} → ${toAccount.name}`
          : formName.trim();

      const payload: Record<string, unknown> = {
        name,
        type: txnType,
        merchantName:
          txnType === "transfer"
            ? toAccount?.name || formMerchant.trim() || undefined
            : formMerchant.trim() || undefined,
        amount,
        currency: "MXN",
        period: formPeriod,
        nextDate: new Date(formNextDate).toISOString(),
        categoryId: txnType === "transfer" ? null : formCategory || undefined,
        accountId: formAccount || undefined,
        active: editing ? editing.active : true,
      };
      if (editing) {
        await mutations.updateSubscription(editing.id, payload);
        toast.success("Transacción recurrente actualizada");
      } else {
        await mutations.createSubscription(payload);
        toast.success(
          txnType === "expense"
            ? "Gasto recurrente creado"
            : txnType === "income"
            ? "Ingreso recurrente creado"
            : "Transferencia recurrente creada"
        );
      }
      qc.invalidateQueries({ queryKey: ["subscriptions"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      setDialogOpen(false);
    } catch {
      toast.error("No se pudo guardar la transacción recurrente");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(s: Subscription, value: boolean) {
    try {
      await mutations.updateSubscription(s.id, { active: value });
      qc.invalidateQueries({ queryKey: ["subscriptions"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      toast.success(value ? "Transacción activada" : "Transacción pausada");
    } catch {
      toast.error("No se pudo actualizar la transacción");
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await mutations.deleteSubscription(toDelete.id);
      toast.success("Transacción eliminada");
      qc.invalidateQueries({ queryKey: ["subscriptions"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      setToDelete(null);
    } catch {
      // Fallback: marcar inactiva
      try {
        await mutations.updateSubscription(toDelete.id, { active: false });
        qc.invalidateQueries({ queryKey: ["subscriptions"] });
        qc.invalidateQueries({ queryKey: ["stats"] });
        toast.success("Transacción cancelada");
        setToDelete(null);
      } catch {
        toast.error("No se pudo eliminar la transacción");
      }
    } finally {
      setDeleting(false);
    }
  }

  if (isLoading) return <SubscriptionsSkeleton />;

  // Datos para el resumen del formulario según el tipo
  const rt = getRecurringType(txnType);
  const accentColor =
    txnType === "income" ? "emerald" : txnType === "transfer" ? "violet" : "red";
  const accentTextClass =
    txnType === "income"
      ? "text-emerald-600 dark:text-emerald-400"
      : txnType === "transfer"
      ? "text-purple-600 dark:text-purple-400"
      : "text-red-600 dark:text-red-400";
  const accentBgClass =
    txnType === "income"
      ? "bg-emerald-500/5"
      : txnType === "transfer"
      ? "bg-purple-500/5"
      : "bg-red-500/5";
  const titleText =
    txnType === "income"
      ? "Nuevo ingreso recurrente"
      : txnType === "transfer"
      ? "Nueva transferencia recurrente"
      : "Nuevo gasto recurrente";
  const saveText = editing
    ? "Guardar cambios"
    : txnType === "income"
    ? "Crear ingreso"
    : txnType === "transfer"
    ? "Crear transferencia"
    : "Crear gasto";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Repeat className="h-5 w-5 text-primary" /> Transacciones Recurrentes
          </h2>
          <p className="text-sm text-muted-foreground">
            Gastos, ingresos y transferencias que se repiten automáticamente
          </p>
        </div>
        <Button onClick={openTypeMenu} className="gap-2">
          <Plus className="h-4 w-4" /> Agregar
        </Button>
      </div>

      {/* Summary card */}
      <Card className="overflow-hidden border-0 text-white shadow-xl" style={{ background: "linear-gradient(135deg, var(--primary), color-mix(in oklch, var(--primary), #000 35%))" }}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-emerald-50/90 text-sm font-medium">Balance recurrente mensual</p>
              <p className="text-3xl font-bold tracking-tight mt-1">
                {formatCurrency(totals.monthly)}
              </p>
              <p className="text-xs text-emerald-50/80 mt-1">
                {totals.count} {totals.count === 1 ? "cargo activo" : "cargos activos"}
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
              <Receipt className="h-6 w-6" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-white/10 backdrop-blur p-3">
              <div className="flex items-center gap-1 text-emerald-50/80 text-xs">
                <ArrowUpRight className="h-3.5 w-3.5" /> Ingresos/mes
              </div>
              <p className="text-lg font-bold mt-1">
                {formatCurrency(totals.monthlyIncome, "MXN", { compact: true })}
              </p>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur p-3">
              <div className="flex items-center gap-1 text-emerald-50/80 text-xs">
                <ArrowDownLeft className="h-3.5 w-3.5" /> Gastos/mes
              </div>
              <p className="text-lg font-bold mt-1">
                {formatCurrency(totals.monthlyExpenses, "MXN", { compact: true })}
              </p>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur p-3">
              <div className="flex items-center gap-1 text-emerald-50/80 text-xs">
                <ArrowLeftRight className="h-3.5 w-3.5" /> Transfer./mes
              </div>
              <p className="text-lg font-bold mt-1">
                {formatCurrency(totals.monthlyTransfers, "MXN", { compact: true })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumen por tipo (3 tarjetas principales) */}
      {totalsByType.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          {totalsByType.map((t) => {
            const cc = colorClasses(t.color);
            const LucideIcon = t.lucideIcon;
            return (
              <button
                key={t.type}
                onClick={() => setTypeFilter(typeFilter === t.type ? "all" : t.type)}
                className={cn(
                  "text-left rounded-xl border p-3 transition-all",
                  typeFilter === t.type
                    ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                    : "border-border hover:bg-accent/40"
                )}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", cc.soft, cc.text)}>
                    <LucideIcon className="h-4 w-4" />
                  </div>
                  <Badge variant="outline" className="text-[10px] h-5">
                    {t.count}
                  </Badge>
                </div>
                <p className="text-xs font-medium text-muted-foreground">{t.label}</p>
                <p className="text-sm font-bold mt-0.5">
                  {formatCurrency(t.monthly, "MXN", { compact: true })}
                </p>
              </button>
            );
          })}
        </div>
      )}

      {/* Filtros por tipo */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Filter className="h-3.5 w-3.5" /> Filtrar:
        </span>
        <TypeChip
          active={typeFilter === "all"}
          onClick={() => setTypeFilter("all")}
          label="Todos"
        />
        {RECURRING_TYPES.map((t) => {
          const count = subscriptions?.filter((s) => normalizeType(s.type) === t.value).length || 0;
          if (count === 0) return null;
          return (
            <TypeChip
              key={t.value}
              active={typeFilter === t.value}
              onClick={() => setTypeFilter(t.value)}
              label={t.label}
              color={t.color}
              icon={t.icon}
              count={count}
            />
          );
        })}
      </div>

      {/* Insight banner */}
      {active.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="text-sm">
              <p className="font-medium">Insight</p>
              <p className="text-muted-foreground">
                {totals.monthlyIncome > 0 && (
                  <>
                    Recibes{" "}
                    <strong className="text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(totals.monthlyIncome)}
                    </strong>{" "}
                    y gastas{" "}
                    <strong className="text-red-600 dark:text-red-400">
                      {formatCurrency(totals.monthlyExpenses)}
                    </strong>{" "}
                    al mes en transacciones recurrentes.{" "}
                  </>
                )}
                {totals.monthlyExpenses > 0 && totals.monthlyIncome === 0 && (
                  <>
                    Gastas{" "}
                    <strong className="text-foreground">{formatCurrency(totals.monthlyExpenses)}/mes</strong>{" "}
                    en transacciones recurrentes. Si cancelas las que no usas, ahorrarías hasta{" "}
                    <strong className="text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(totals.monthlyExpenses * 12)}
                    </strong>{" "}
                    al año.{" "}
                  </>
                )}
                {totals.monthlyTransfers > 0 && (
                  <>
                    Mueves{" "}
                    <strong className="text-purple-600 dark:text-purple-400">
                      {formatCurrency(totals.monthlyTransfers)}
                    </strong>{" "}
                    entre cuentas cada mes.
                  </>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscription list */}
      {sorted.length === 0 ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center justify-center text-center gap-3">
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
              <Receipt className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">Sin transacciones recurrentes</p>
              <p className="text-sm text-muted-foreground">
                Registra tus gastos, ingresos o transferencias que se repiten automáticamente.
              </p>
            </div>
            <Button onClick={openTypeMenu} className="gap-2 mt-1">
              <Plus className="h-4 w-4" /> Agregar
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((s) => (
            <SubscriptionCard
              key={s.id}
              sub={s}
              onEdit={() => openEdit(s)}
              onDelete={() => setToDelete(s)}
              onToggle={(v) => toggleActive(s, v)}
            />
          ))}
        </div>
      )}

      {/* Menú de selección de tipo (Gasto / Ingreso / Transferencia) */}
      <Dialog open={typeMenuOpen} onOpenChange={setTypeMenuOpen}>
        <DialogContent className="sm:max-w-sm p-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-2">
            <DialogTitle className="text-base">Agregar recurrente</DialogTitle>
            <DialogDescription className="text-xs">
              Elige el tipo de transacción que quieres repetir
            </DialogDescription>
          </DialogHeader>
          <div className="px-4 pb-4 space-y-2">
            {RECURRING_TYPES.map((t) => {
              const cc = colorClasses(t.color);
              const LucideIcon = t.lucideIcon;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => openCreateForType(t.value)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-accent transition-colors text-left border border-border"
                >
                  <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center shrink-0", cc.soft, cc.text)}>
                    <LucideIcon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-tight">{t.label}</p>
                    <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                      {t.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[92vh] overflow-y-auto scrollbar-thin gap-0 p-0">
          <DialogHeader className="px-6 pt-6 pb-3">
            <DialogTitle className="flex items-center gap-2">
              <TypeIcon type={txnType} className={cn("h-5 w-5", accentTextClass)} />
              {editing ? "Editar transacción recurrente" : titleText}
            </DialogTitle>
            <DialogDescription>
              {txnType === "transfer"
                ? "Repite una transferencia entre cuentas de forma automática."
                : txnType === "income"
                ? "Repite un ingreso que entra de forma periódica."
                : "Repite un gasto que se cobra de forma periódica."}
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-6 space-y-4">
            {/* Importe grande */}
            <div className={cn("rounded-2xl p-5 text-center transition-colors", accentBgClass)}>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-1.5">
                <TypeIcon type={txnType} className="h-3.5 w-3.5" />
                {txnType === "income" ? "Ingreso" : txnType === "transfer" ? "Transferencia" : "Gasto"}
              </Label>
              <div className="flex items-center justify-center gap-1 mt-1">
                <span className={cn("text-3xl font-bold", accentTextClass)}>$</span>
                <AmountInput
                  value={formAmount}
                  onValueChange={setFormAmount}
                  placeholder="0.00"
                  className={cn(
                    "border-0 bg-transparent text-4xl font-bold text-center h-auto p-0 w-40 focus-visible:ring-0 focus-visible:ring-offset-0",
                    accentTextClass
                  )}
                  autoFocus
                />
              </div>
            </div>

            {/* Tipo de transacción (badge informativo, no editable aquí) */}
            <div className="flex items-center gap-2">
              <Label className="text-xs">Tipo</Label>
              <Badge className={cn("ml-auto gap-1", colorClasses(rt.color).soft, colorClasses(rt.color).text)}>
                <TypeIcon type={txnType} className="h-3 w-3" />
                {rt.label}
              </Badge>
            </div>

            {/* Nombre */}
            <div className="space-y-1.5">
              <Label htmlFor="sub-name">Nombre</Label>
              <Input
                id="sub-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={
                  txnType === "transfer"
                    ? "Ej. Ahorro mensual, Pago de tarjeta…"
                    : txnType === "income"
                    ? "Ej. Nómina, Freelance, Renta recibida…"
                    : "Ej. Netflix, Renta, Luz, Spotify…"
                }
              />
            </div>

            {/* Comercio / Beneficiario (no para transferencia) */}
            {txnType !== "transfer" && (
              <div className="space-y-1.5">
                <Label htmlFor="sub-merchant">Comercio / Beneficiario</Label>
                <Input
                  id="sub-merchant"
                  value={formMerchant}
                  onChange={(e) => setFormMerchant(e.target.value)}
                  placeholder="Opcional"
                />
              </div>
            )}

            {/* Transferencia: cuentas origen y destino */}
            {txnType === "transfer" && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <ArrowRight className="h-3.5 w-3.5 rotate-180 text-red-500" />
                    De cuenta
                  </Label>
                  <Select value={formAccount} onValueChange={setFormAccount}>
                    <SelectTrigger>
                      <SelectValue placeholder="Cuenta de origen" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts?.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          <div className="flex items-center justify-between gap-2 w-full">
                            <span className="truncate">{a.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatCurrency(a.balance, "MXN", { compact: true })}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      const tmp = formAccount;
                      setFormAccount(formDestAccount);
                      setFormDestAccount(tmp);
                    }}
                    className="h-7 w-7 rounded-full"
                    title="Intercambiar cuentas"
                  >
                    <ArrowRight className="h-3.5 w-3.5 rotate-90" />
                  </Button>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <ArrowRight className="h-3.5 w-3.5 text-emerald-500" />
                    A cuenta
                  </Label>
                  <Select value={formDestAccount} onValueChange={setFormDestAccount}>
                    <SelectTrigger>
                      <SelectValue placeholder="Cuenta de destino" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts?.map((a) => (
                        <SelectItem key={a.id} value={a.id} disabled={a.id === formAccount}>
                          <div className="flex items-center justify-between gap-2 w-full">
                            <span className="truncate">{a.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatCurrency(a.balance, "MXN", { compact: true })}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formAccount && formDestAccount && formAccount === formDestAccount && (
                    <p className="text-xs text-red-600 dark:text-red-400">
                      Las cuentas deben ser diferentes.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Periodicidad y próximo pago */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sub-period">Periodicidad</Label>
                <Select value={formPeriod} onValueChange={setFormPeriod}>
                  <SelectTrigger id="sub-period">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIODS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sub-next" className="flex items-center gap-1.5">
                  <CalIcon className="h-3.5 w-3.5" /> Próximo pago
                </Label>
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      {formNextDate
                        ? new Date(formNextDate + "T00:00:00").toLocaleDateString("es-MX", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "Selecciona"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formNextDate ? new Date(formNextDate + "T00:00:00") : undefined}
                      onSelect={(d) => {
                        if (d) {
                          setFormNextDate(d.toISOString().slice(0, 10));
                          setDatePickerOpen(false);
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Categoría y cuenta (solo para gasto/ingreso) */}
            {txnType !== "transfer" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="sub-cat">Categoría</Label>
                  <Select value={formCategory} onValueChange={setFormCategory}>
                    <SelectTrigger id="sub-cat">
                      <SelectValue placeholder="Categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredCategories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          <div className="flex items-center gap-2">
                            <CategoryIcon icon={c.icon} color={c.color} size="sm" className="h-6 w-6" />
                            <span>{c.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                      {filteredCategories.length === 0 && (
                        <div className="px-2 py-1.5 text-xs text-muted-foreground">
                          No hay categorías de {txnType === "income" ? "ingreso" : "gasto"}
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sub-acc">Cuenta</Label>
                  <Select value={formAccount} onValueChange={setFormAccount}>
                    <SelectTrigger id="sub-acc">
                      <SelectValue placeholder="Cuenta" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts?.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

          </div>
          <DialogFooter className="gap-2 sm:gap-2 px-6 pb-6">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button
              onClick={save}
              disabled={saving}
              className={cn(
                "gap-2",
                txnType === "income"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : txnType === "transfer"
                  ? "bg-purple-600 hover:bg-purple-700 text-white"
                  : "bg-red-600 hover:bg-red-700 text-white"
              )}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {saveText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar transacción recurrente?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete && (
                <>
                  Se eliminará <strong>{toDelete.name}</strong>. Si solo quieres pausarla,
                  puedes desactivarla con el interruptor. Esta acción no se puede deshacer.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SubscriptionCard({
  sub,
  onEdit,
  onDelete,
  onToggle,
}: {
  sub: Subscription;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (v: boolean) => void;
}) {
  const nextDate = new Date(sub.nextDate);
  const daysUntil = Math.ceil(
    (nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  const overdue = daysUntil < 0;
  const txnType = normalizeType(sub.type);
  const rt = getRecurringType(txnType);
  const cc = colorClasses(rt.color);
  const LucideIcon = rt.lucideIcon;
  const isTransfer = txnType === "transfer";
  const isIncome = txnType === "income";

  return (
    <Card
      className={`overflow-hidden hover:shadow-md transition-shadow ${
        !sub.active ? "opacity-60" : ""
      }`}
    >
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", cc.soft, cc.text)}>
              <LucideIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold truncate">{sub.name}</p>
              {sub.merchantName && !isTransfer && (
                <p className="text-xs text-muted-foreground truncate">
                  {sub.merchantName}
                </p>
              )}
              {isTransfer && sub.merchantName && (
                <p className="text-xs text-muted-foreground truncate">
                  → {sub.merchantName}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1 items-end">
            <Badge className={cn("text-[10px]", cc.soft, cc.text)}>
              {rt.label}
            </Badge>
            <Badge className={`text-[10px] ${periodBadge(sub.period)}`}>
              {periodLabel(sub.period)}
            </Badge>
          </div>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <p
              className={cn(
                "text-xl font-bold",
                isIncome
                  ? "text-emerald-600 dark:text-emerald-400"
                  : isTransfer
                  ? "text-purple-600 dark:text-purple-400"
                  : "text-red-600 dark:text-red-400"
              )}
            >
              {isIncome ? "+" : isTransfer ? "" : "-"}
              {formatCurrency(sub.amount, sub.currency)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {formatCurrency(toMonthly(sub.amount, sub.period))}/mes
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Próximo pago</p>
            <p className="text-xs font-medium">
              {formatDate(sub.nextDate, "short")}
            </p>
            <p
              className={`text-[10px] mt-0.5 ${
                overdue
                  ? "text-red-600 dark:text-red-400"
                  : daysUntil <= 3
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-muted-foreground"
              }`}
            >
              {overdue
                ? `Hace ${Math.abs(daysUntil)} días`
                : daysUntil === 0
                ? "Hoy"
                : `En ${daysUntil} días`}
            </p>
          </div>
        </div>

        {(sub.account || sub.category) && (
          <div className="flex flex-wrap gap-2">
            {sub.account && (
              <Badge variant="outline" className="text-[10px] gap-1 font-normal">
                <CreditCard className="h-3 w-3" /> {sub.account.name}
              </Badge>
            )}
            {isTransfer && sub.merchantName && (
              <Badge variant="outline" className="text-[10px] gap-1 font-normal">
                <ArrowRight className="h-3 w-3" /> {sub.merchantName}
              </Badge>
            )}
            {sub.category && (
              <Badge variant="outline" className="text-[10px] font-normal">
                {sub.category.name}
              </Badge>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            <Switch checked={sub.active} onCheckedChange={onToggle} aria-label="Activar/pausar" />
            <span className="text-xs text-muted-foreground">
              {sub.active ? "Activa" : "Pausada"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit} aria-label="Editar">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-500/10"
              onClick={onDelete}
              aria-label="Eliminar"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SubscriptionsSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-44 rounded-2xl" />
      <Skeleton className="h-16 rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-56 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function TypeChip({
  active,
  onClick,
  label,
  color,
  icon,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  color?: string;
  icon?: string;
  count?: number;
}) {
  const cc = color ? colorClasses(color) : null;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background border-border hover:bg-accent text-foreground"
      )}
    >
      {icon && cc && (
        <CategoryIcon icon={icon} color={color || "slate"} size="sm" className="h-5 w-5 rounded-md" />
      )}
      {label}
      {count !== undefined && (
        <span className={cn(
          "text-[10px] rounded-full px-1.5",
          active ? "bg-white/20" : "bg-muted"
        )}>
          {count}
        </span>
      )}
    </button>
  );
}
