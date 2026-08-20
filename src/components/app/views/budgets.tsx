"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
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

import { useStats, useCategories, mutations } from "../hooks";
import { CategoryIcon } from "../category-icon";
import { AmountInput } from "../amount-input";
import { ModalContainer } from "../bottom-sheet";
import { useViewAddHandler } from "../use-view-add-handler";
import { useAppStore } from "@/lib/store";
import { formatCurrency, monthLabel, monthKey as toMonthKey } from "@/lib/format";
import { colorClasses } from "@/lib/categories";

import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  Target,
  Wallet,
  PiggyBank,
  TrendingUp,
  AlertTriangle,
  CircleDollarSign,
} from "lucide-react";

type BudgetUsage = {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  amount: number;
  spent: number;
  remaining: number;
  percentage: number;
};

export function BudgetsView() {
  const { selectedMonth, setSelectedMonth } = useAppStore();
  const qc = useQueryClient();
  const { data: stats, isLoading } = useStats(selectedMonth);
  const { data: categories } = useCategories();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BudgetUsage | null>(null);
  const [toDelete, setToDelete] = useState<BudgetUsage | null>(null);
  const [formCat, setFormCat] = useState<string>("");
  const [formAmount, setFormAmount] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function shiftMonth(delta: number) {
    const [y, m] = selectedMonth.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setSelectedMonth(toMonthKey(d));
  }

  const budgets = useMemo<BudgetUsage[]>(() => stats?.budgetUsage ?? [], [stats]);

  const totals = useMemo(() => {
    const total = budgets.reduce((s, b) => s + b.amount, 0);
    const spent = budgets.reduce((s, b) => s + b.spent, 0);
    const remaining = total - spent;
    const pct = total > 0 ? (spent / total) * 100 : 0;
    return { total, spent, remaining, pct };
  }, [budgets]);

  function openCreate() {
    setEditing(null);
    const usedIds = new Set(budgets.map((b) => b.categoryId));
    const firstAvailable =
      categories?.find((c) => !usedIds.has(c.id))?.id || "";
    setFormCat(firstAvailable);
    setFormAmount("");
    setDialogOpen(true);
  }

  // Botón "+" contextual: abre el diálogo de crear presupuesto
  useViewAddHandler(openCreate);

  function openEdit(b: BudgetUsage) {
    setEditing(b);
    setFormCat(b.categoryId);
    setFormAmount(String(b.amount));
    setDialogOpen(true);
  }

  async function save() {
    const amount = parseFloat(formAmount);
    if (!formCat || isNaN(amount) || amount <= 0) {
      toast.error("Selecciona una categoría y un monto válido");
      return;
    }
    setSaving(true);
    try {
      await mutations.createBudget({
        categoryId: formCat,
        amount,
        month: selectedMonth,
      });
      toast.success(editing ? "Presupuesto actualizado" : "Presupuesto creado");
      qc.invalidateQueries({ queryKey: ["budgets"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      setDialogOpen(false);
    } catch {
      toast.error("No se pudo guardar el presupuesto");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await mutations.deleteBudget(toDelete.id);
      toast.success("Presupuesto eliminado");
      qc.invalidateQueries({ queryKey: ["budgets"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      setToDelete(null);
    } catch {
      toast.error("No se pudo eliminar el presupuesto");
    } finally {
      setDeleting(false);
    }
  }

  if (isLoading || !stats) return <BudgetsSkeleton />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => shiftMonth(-1)} aria-label="Mes anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[160px] text-center">
            <p className="text-sm font-semibold capitalize">{monthLabel(selectedMonth)}</p>
            <p className="text-xs text-muted-foreground">Presupuestos</p>
          </div>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => shiftMonth(1)} aria-label="Mes siguiente">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Agregar presupuesto
        </Button>
      </div>

      {/* Summary card */}
      <Card className="overflow-hidden border-0 text-white shadow-xl" style={{ background: "linear-gradient(135deg, var(--primary), color-mix(in oklch, var(--primary), #000 35%))" }}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-emerald-50/90 text-sm font-medium">Resumen del mes</p>
              <p className="text-3xl font-bold tracking-tight mt-1">
                {formatCurrency(totals.spent)}{" "}
                <span className="text-base font-normal opacity-80">
                  / {formatCurrency(totals.total)}
                </span>
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
              <Target className="h-6 w-6" />
            </div>
          </div>

          <div className="h-2.5 rounded-full bg-white/20 overflow-hidden">
            <div
              className="h-full rounded-full bg-white transition-all"
              style={{ width: `${Math.min(100, totals.pct)}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-xs">
            <span className="text-emerald-50/90">{totals.pct.toFixed(0)}% usado</span>
            <span className="text-emerald-50/90">
              {formatCurrency(Math.max(0, totals.remaining))} restante
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-6">
            <SummaryMetric
              icon={<Wallet className="h-3.5 w-3.5" />}
              label="Presupuesto"
              value={formatCurrency(totals.total, "MXN", { compact: true })}
            />
            <SummaryMetric
              icon={<TrendingUp className="h-3.5 w-3.5" />}
              label="Gastado"
              value={formatCurrency(totals.spent, "MXN", { compact: true })}
            />
            <SummaryMetric
              icon={<PiggyBank className="h-3.5 w-3.5" />}
              label="Restante"
              value={formatCurrency(totals.remaining, "MXN", { compact: true })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Budget cards */}
      {budgets.length === 0 ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center justify-center text-center gap-3">
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
              <CircleDollarSign className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">No hay presupuestos</p>
              <p className="text-sm text-muted-foreground">
                Crea un presupuesto por categoría para controlar tus gastos.
              </p>
            </div>
            <Button onClick={openCreate} className="gap-2 mt-1">
              <Plus className="h-4 w-4" /> Crear primer presupuesto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {budgets.map((b) => (
            <BudgetCard
              key={b.id}
              budget={b}
              onEdit={() => openEdit(b)}
              onDelete={() => setToDelete(b)}
            />
          ))}
        </div>
      )}

      {/* Create / Edit dialog */}
      <ModalContainer open={dialogOpen} onOpenChange={setDialogOpen}>
        <div className="px-6 pt-6 pb-3 shrink-0">
          <h2 className="text-base font-semibold">
            {editing ? "Editar presupuesto" : "Nuevo presupuesto"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Define un límite mensual para una categoría.
          </p>
        </div>
        <div className="px-6 pb-6 space-y-4 overflow-y-auto scrollbar-thin">
          <div className="space-y-2">
            <Label htmlFor="budget-cat">Categoría</Label>
            <Select value={formCat} onValueChange={setFormCat}>
              <SelectTrigger id="budget-cat">
                <SelectValue placeholder="Selecciona una categoría" />
              </SelectTrigger>
              <SelectContent>
                {categories
                  ?.filter((c) => {
                    if (editing) return true;
                    return !budgets.some((b) => b.categoryId === c.id);
                  })
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="budget-amount">Monto mensual (MXN)</Label>
            <AmountInput
              id="budget-amount"
              value={formAmount}
              onValueChange={setFormAmount}
              placeholder="0.00"
            />
          </div>
        </div>
        <div className="flex gap-2 px-6 pb-6 pt-2 shrink-0 border-t mt-2">
          <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear"}
          </Button>
        </div>
      </ModalContainer>

      {/* Delete confirmation */}
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar presupuesto?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete && (
                <>
                  Se eliminará el presupuesto de{" "}
                  <strong>{toDelete.categoryName}</strong>. Esta acción no se puede deshacer.
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

function SummaryMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-white/10 backdrop-blur p-3">
      <div className="flex items-center gap-1 text-emerald-50/80 text-xs">
        {icon}
        {label}
      </div>
      <p className="text-lg font-bold mt-1">{value}</p>
    </div>
  );
}

function statusColor(pct: number) {
  if (pct >= 100) return "bg-red-500";
  if (pct >= 90) return "bg-red-500";
  if (pct >= 70) return "bg-amber-500";
  return "bg-emerald-500";
}

function BudgetCard({
  budget,
  onEdit,
  onDelete,
}: {
  budget: BudgetUsage;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const cc = colorClasses(budget.categoryColor);
  const pct = budget.percentage;
  const exceeded = pct >= 100;
  const nearLimit = pct >= 85 && pct < 100;

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <CategoryIcon
              icon={budget.categoryIcon}
              color={budget.categoryColor}
              size="md"
            />
            <div className="min-w-0">
              <p className="font-semibold truncate">{budget.categoryName}</p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(budget.spent)} de {formatCurrency(budget.amount)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit} aria-label="Editar">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-500/10" onClick={onDelete} aria-label="Eliminar">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{pct.toFixed(0)}% usado</span>
            {exceeded ? (
              <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/10">
                Excedido
              </Badge>
            ) : nearLimit ? (
              <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 gap-0.5">
                <AlertTriangle className="h-3 w-3" /> Cerca del límite
              </Badge>
            ) : (
              <span className={`font-medium ${cc.text}`}>
                {formatCurrency(Math.max(0, budget.remaining))} restante
              </span>
            )}
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${statusColor(pct)}`}
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BudgetsSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-44" />
      </div>
      <Skeleton className="h-44 rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-44 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
