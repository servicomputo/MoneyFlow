"use client";

import { useMemo, useState } from "react";
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
import { formatCurrency, formatDate } from "@/lib/format";
import { RECURRING_TYPES, getRecurringType } from "@/lib/recurring-types";
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
} from "lucide-react";

const PERIODS = [
  { value: "weekly", label: "Semanal", monthsFactor: 12 / 52 },
  { value: "monthly", label: "Mensual", monthsFactor: 1 },
  { value: "yearly", label: "Anual", monthsFactor: 1 / 12 },
] as const;

function periodLabel(p: string) {
  return PERIODS.find((x) => x.value === p)?.label || p;
}

function periodBadge(p: string) {
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

export function SubscriptionsView() {
  const qc = useQueryClient();
  const { data: subscriptions, isLoading } = useSubscriptions();
  const { data: categories } = useCategories();
  const { data: accounts } = useAccounts();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [toDelete, setToDelete] = useState<Subscription | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<string>("subscription");
  const [formMerchant, setFormMerchant] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formPeriod, setFormPeriod] = useState<string>("monthly");
  const [formNextDate, setFormNextDate] = useState("");
  const [formCategory, setFormCategory] = useState<string>("");
  const [formAccount, setFormAccount] = useState<string>("");

  // Filter state
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const sorted = useMemo(() => {
    if (!subscriptions) return [];
    let list = [...subscriptions].sort(
      (a, b) => new Date(a.nextDate).getTime() - new Date(b.nextDate).getTime()
    );
    if (typeFilter !== "all") {
      list = list.filter((s) => (s.type || "subscription") === typeFilter);
    }
    return list;
  }, [subscriptions, typeFilter]);

  const active = useMemo(() => sorted.filter((s) => s.active), [sorted]);

  const totals = useMemo(() => {
    const monthly = active.reduce(
      (s, sub) => s + toMonthly(sub.amount, sub.period),
      0
    );
    return {
      monthly,
      count: active.length,
      annual: monthly * 12,
    };
  }, [active]);

  // Totales por tipo
  const totalsByType = useMemo(() => {
    if (!subscriptions) return [];
    const byType: Record<string, { count: number; monthly: number }> = {};
    for (const s of subscriptions.filter((s) => s.active)) {
      const t = s.type || "subscription";
      if (!byType[t]) byType[t] = { count: 0, monthly: 0 };
      byType[t].count += 1;
      byType[t].monthly += toMonthly(s.amount, s.period);
    }
    return Object.entries(byType).map(([type, data]) => ({
      type,
      ...data,
      ...getRecurringType(type),
    }));
  }, [subscriptions]);

  function openCreate() {
    setEditing(null);
    setFormName("");
    setFormType("subscription");
    setFormMerchant("");
    setFormAmount("");
    setFormPeriod("monthly");
    const today = new Date();
    today.setMonth(today.getMonth() + 1);
    setFormNextDate(toInputDate(today.toISOString()));
    setFormCategory(categories?.[0]?.id || "");
    setFormAccount(accounts?.find((a) => a.isDefault)?.id || accounts?.[0]?.id || "");
    setDialogOpen(true);
  }

  function openEdit(s: Subscription) {
    setEditing(s);
    setFormName(s.name);
    setFormType(s.type || "subscription");
    setFormMerchant(s.merchantName || "");
    setFormAmount(String(s.amount));
    setFormPeriod(s.period);
    setFormNextDate(toInputDate(s.nextDate));
    setFormCategory(s.category?.id || categories?.[0]?.id || "");
    setFormAccount(s.account?.id || accounts?.find((a) => a.isDefault)?.id || "");
    setDialogOpen(true);
  }

  async function save() {
    const amount = parseFloat(formAmount);
    if (!formName.trim() || isNaN(amount) || amount <= 0 || !formNextDate) {
      toast.error("Completa nombre, monto y fecha del próximo pago");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: formName.trim(),
        type: formType,
        merchantName: formMerchant.trim() || undefined,
        amount,
        currency: "MXN",
        period: formPeriod,
        nextDate: new Date(formNextDate).toISOString(),
        categoryId: formCategory || undefined,
        accountId: formAccount || undefined,
        active: editing ? editing.active : true,
      };
      if (editing) {
        await mutations.updateSubscription(editing.id, payload);
        toast.success("Cargo recurrente actualizado");
      } else {
        await mutations.createSubscription(payload);
        toast.success("Cargo recurrente creado");
      }
      qc.invalidateQueries({ queryKey: ["subscriptions"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      setDialogOpen(false);
    } catch {
      toast.error("No se pudo guardar la suscripción");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(s: Subscription, value: boolean) {
    try {
      await mutations.updateSubscription(s.id, { active: value });
      qc.invalidateQueries({ queryKey: ["subscriptions"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      toast.success(value ? "Suscripción activada" : "Suscripción pausada");
    } catch {
      toast.error("No se pudo actualizar la suscripción");
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await mutations.deleteSubscription(toDelete.id);
      toast.success("Suscripción eliminada");
      qc.invalidateQueries({ queryKey: ["subscriptions"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      setToDelete(null);
    } catch {
      // Fallback: marcar inactiva
      try {
        await mutations.updateSubscription(toDelete.id, { active: false });
        qc.invalidateQueries({ queryKey: ["subscriptions"] });
        qc.invalidateQueries({ queryKey: ["stats"] });
        toast.success("Suscripción cancelada");
        setToDelete(null);
      } catch {
        toast.error("No se pudo eliminar la suscripción");
      }
    } finally {
      setDeleting(false);
    }
  }

  if (isLoading) return <SubscriptionsSkeleton />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Repeat className="h-5 w-5 text-primary" /> Cargos recurrentes
          </h2>
          <p className="text-sm text-muted-foreground">
            Suscripciones, renta, servicios, nómina y más — se cobran solos
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Agregar
        </Button>
      </div>

      {/* Summary card */}
      <Card className="overflow-hidden border-0 text-white shadow-xl" style={{ background: "linear-gradient(135deg, var(--primary), color-mix(in oklch, var(--primary), #000 35%))" }}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-emerald-50/90 text-sm font-medium">Costo mensual total</p>
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
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/10 backdrop-blur p-3">
              <div className="flex items-center gap-1 text-emerald-50/80 text-xs">
                <CalendarClock className="h-3.5 w-3.5" /> Proyección anual
              </div>
              <p className="text-lg font-bold mt-1">
                {formatCurrency(totals.annual, "MXN", { compact: true })}
              </p>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur p-3">
              <div className="flex items-center gap-1 text-emerald-50/80 text-xs">
                <Sparkles className="h-3.5 w-3.5" /> Promedio diario
              </div>
              <p className="text-lg font-bold mt-1">
                {formatCurrency(totals.monthly / 30, "MXN", { compact: true })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumen por tipo */}
      {totalsByType.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {totalsByType.map((t) => {
            const rt = getRecurringType(t.type);
            const cc = colorClasses(rt.color);
            const LucideIcon = rt.lucideIcon;
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
                <p className="text-xs font-medium text-muted-foreground">{rt.label}</p>
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
          const count = subscriptions?.filter((s) => (s.type || "subscription") === t.value).length || 0;
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
                Estás gastando{" "}
                <strong className="text-foreground">{formatCurrency(totals.monthly)}/mes</strong> en
                cargos recurrentes. Si cancelas los que no usas, ahorrarías hasta{" "}
                <strong className="text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(totals.annual)}
                </strong>{" "}
                al año.
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
              <p className="font-medium">Sin suscripciones</p>
              <p className="text-sm text-muted-foreground">
                Registra tus gastos recurrentes para controlarlos en un solo lugar.
              </p>
            </div>
            <Button onClick={openCreate} className="gap-2 mt-1">
              <Plus className="h-4 w-4" /> Agregar suscripción
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

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar cargo recurrente" : "Nuevo cargo recurrente"}
            </DialogTitle>
            <DialogDescription>
              Suscripciones, renta, servicios, nómina, préstamos y más.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label htmlFor="sub-name">Nombre</Label>
              <Input
                id="sub-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Netflix, Renta, Nómina empleado…"
              />
            </div>
            {/* Selector de tipo */}
            <div className="space-y-2">
              <Label>Tipo de cargo</Label>
              <div className="grid grid-cols-3 gap-2">
                {RECURRING_TYPES.map((t) => {
                  const active = formType === t.value;
                  const cc = colorClasses(t.color);
                  const LucideIcon = t.lucideIcon;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setFormType(t.value)}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-lg border p-2.5 text-xs font-medium transition-all",
                        active
                          ? cn("border-current", cc.soft, cc.text)
                          : "border-border text-muted-foreground hover:bg-accent"
                      )}
                      title={t.description}
                    >
                      <LucideIcon className="h-4 w-4" />
                      {t.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {getRecurringType(formType).description}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sub-merchant">Comercio / Beneficiario</Label>
              <Input
                id="sub-merchant"
                value={formMerchant}
                onChange={(e) => setFormMerchant(e.target.value)}
                placeholder="Opcional"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="sub-amount">Monto (MXN)</Label>
                <Input
                  id="sub-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  placeholder="0.00"
                  inputMode="decimal"
                />
              </div>
              <div className="space-y-2">
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="sub-next">Próximo pago</Label>
              <Input
                id="sub-next"
                type="date"
                value={formNextDate}
                onChange={(e) => setFormNextDate(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="sub-cat">Categoría</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger id="sub-cat">
                    <SelectValue placeholder="Categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cargo recurrente?</AlertDialogTitle>
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
  const rt = getRecurringType(sub.type || "subscription");
  const cc = colorClasses(rt.color);
  const LucideIcon = rt.lucideIcon;

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
              {sub.merchantName && (
                <p className="text-xs text-muted-foreground truncate">
                  {sub.merchantName}
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
            <p className="text-xl font-bold">{formatCurrency(sub.amount, sub.currency)}</p>
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
