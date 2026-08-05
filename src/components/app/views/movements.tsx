"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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

import { useCategories, useAccounts, mutations, type Expense } from "../hooks";
import { dataProvider } from "@/lib/data-provider";
import { useDataModeStore } from "@/lib/data-mode";
import { CategoryIcon } from "../category-icon";
import {
  formatCurrency,
  formatDate,
  formatTime,
} from "@/lib/format";
import { colorClasses, PAYMENT_METHODS } from "@/lib/categories";
import {
  shiftPeriod,
  formatPeriodLabel,
  getPeriodRange,
} from "@/lib/stats-utils";
import { cn } from "@/lib/utils";

import {
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ScanLine,
  Receipt,
  Filter,
  Inbox,
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
} from "lucide-react";

const METHOD_LABEL: Record<string, string> = Object.fromEntries(
  PAYMENT_METHODS.map((m) => [m.value, m.label])
);

type Period = "month" | "week" | "year";

export function MovementsView() {
  const qc = useQueryClient();
  const dataMode = useDataModeStore((s) => s.mode);

  const { data: categories } = useCategories();
  const { data: accounts } = useAccounts();

  const [period, setPeriod] = useState<Period>("month");
  const [refDate, setRefDate] = useState<Date>(new Date());
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "expense" | "income">("all");
  const [toDelete, setToDelete] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Cargar gastos del periodo seleccionado
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const { start, end } = getPeriodRange(period, refDate);
    dataProvider
      .listExpensesRange(start.toISOString(), end.toISOString())
      .then((data) => {
        if (!cancelled) {
          setExpenses(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setExpenses([]);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [period, refDate, dataMode]);

  const periodLabelStr = formatPeriodLabel(period, refDate);

  function goPrev() {
    setRefDate((d) => shiftPeriod(period, d, -1));
  }
  function goNext() {
    setRefDate((d) => shiftPeriod(period, d, 1));
  }

  function handlePeriodChange(p: Period) {
    setPeriod(p);
    setRefDate(new Date());
  }

  const isCurrentPeriod = useMemo(() => {
    const now = new Date();
    if (period === "year") return refDate.getFullYear() === now.getFullYear();
    if (period === "month")
      return refDate.getMonth() === now.getMonth() && refDate.getFullYear() === now.getFullYear();
    // week
    const sow = (d: Date) => {
      const r = new Date(d);
      const day = r.getDay();
      const diff = r.getDate() - day + (day === 0 ? -6 : 1);
      r.setDate(diff);
      r.setHours(0, 0, 0, 0);
      return r;
    };
    return sow(refDate).getTime() === sow(now).getTime();
  }, [period, refDate]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let result = expenses.filter((e) => {
      if (categoryFilter !== "all" && e.categoryId !== categoryFilter) return false;
      if (accountFilter !== "all" && e.accountId !== accountFilter) return false;
      if (methodFilter !== "all" && e.paymentMethod !== methodFilter) return false;
      if (q) {
        const hay = [e.merchantName || "", e.notes || "", e.tags || "", e.category.name]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    if (typeFilter !== "all") result = result.filter((e) => e.type === typeFilter);
    return result;
  }, [expenses, query, categoryFilter, accountFilter, methodFilter, typeFilter]);

  const totalEgresos = filtered
    .filter((e) => e.type !== "income")
    .reduce((s, e) => s + e.amount, 0);
  const totalIngresos = filtered
    .filter((e) => e.type === "income")
    .reduce((s, e) => s + e.amount, 0);

  // Agrupar según el periodo
  const groups = useMemo(() => {
    // Usamos un mapa clave -> { expenses, sortKey }
    const map = new Map<string, { expenses: Expense[]; sortKey: number }>();
    for (const e of filtered) {
      const { label, sortKey } = getGroupInfo(e.date, period, refDate);
      const existing = map.get(label);
      if (existing) {
        existing.expenses.push(e);
      } else {
        map.set(label, { expenses: [e], sortKey });
      }
    }
    // Ordenar grupos cronológicamente inverso (más reciente primero)
    return Array.from(map.entries())
      .map(([label, { expenses, sortKey }]) => [label, expenses, sortKey] as const)
      .sort((a, b) => b[2] - a[2]);
  }, [filtered, period, refDate]);

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await mutations.deleteExpense(toDelete.id);
      toast.success("Movimiento eliminado");
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      // Recargar la lista del periodo actual
      const { start, end } = getPeriodRange(period, refDate);
      const data = await dataProvider.listExpensesRange(start.toISOString(), end.toISOString());
      setExpenses(data);
      setToDelete(null);
    } catch {
      toast.error("No se pudo eliminar el movimiento");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header: period tabs + navigation + summary */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <Tabs value={period} onValueChange={(v) => handlePeriodChange(v as Period)}>
            <TabsList>
              <TabsTrigger value="month" className="gap-1">
                <CalendarDays className="h-3.5 w-3.5" /> Mes
              </TabsTrigger>
              <TabsTrigger value="week" className="gap-1">
                Semana
              </TabsTrigger>
              <TabsTrigger value="year" className="gap-1">
                Año
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={goPrev} aria-label="Periodo anterior">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-[140px] text-center">
              <p className="text-sm font-semibold capitalize">{periodLabelStr}</p>
              <p className="text-xs text-muted-foreground">
                {filtered.length} {filtered.length === 1 ? "movimiento" : "movimientos"}
              </p>
            </div>
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={goNext} aria-label="Periodo siguiente">
              <ChevronRight className="h-4 w-4" />
            </Button>
            {!isCurrentPeriod && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-xs"
                onClick={() => setRefDate(new Date())}
              >
                Hoy
              </Button>
            )}
          </div>
        </div>

        <Card className="sm:w-auto w-full bg-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-3 sm:p-4 flex items-center gap-4 sm:gap-6">
            <div>
              <p className="text-xs text-muted-foreground">Movimientos</p>
              <p className="text-lg font-bold leading-none mt-1">{filtered.length}</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <p className="text-xs text-muted-foreground">Egresos</p>
              <p className="text-lg font-bold leading-none mt-1 text-red-600 dark:text-red-400">
                -{formatCurrency(totalEgresos)}
              </p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <p className="text-xs text-muted-foreground">Ingresos</p>
              <p className="text-lg font-bold leading-none mt-1 text-emerald-600 dark:text-emerald-400">
                +{formatCurrency(totalIngresos)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + filters */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por comercio, nota o etiqueta…"
              className="pl-9 h-10"
            />
          </div>

          {/* Type filter (Todos / Egresos / Ingresos) */}
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
            <TypeFilterButton
              active={typeFilter === "all"}
              onClick={() => setTypeFilter("all")}
              label="Todos"
            />
            <TypeFilterButton
              active={typeFilter === "expense"}
              onClick={() => setTypeFilter("expense")}
              label="Egresos"
              icon={<ArrowDownLeft className="h-3.5 w-3.5" />}
            />
            <TypeFilterButton
              active={typeFilter === "income"}
              onClick={() => setTypeFilter("income")}
              label="Ingresos"
              icon={<ArrowUpRight className="h-3.5 w-3.5" />}
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <Select value={accountFilter} onValueChange={setAccountFilter}>
              <SelectTrigger className="h-9 w-[150px] text-xs" size="sm">
                <SelectValue placeholder="Cuenta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las cuentas</SelectItem>
                {accounts?.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="h-9 w-[170px] text-xs" size="sm">
                <SelectValue placeholder="Método de pago" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los métodos</SelectItem>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(categoryFilter !== "all" ||
              accountFilter !== "all" ||
              methodFilter !== "all" ||
              typeFilter !== "all" ||
              query) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-xs"
                onClick={() => {
                  setQuery("");
                  setCategoryFilter("all");
                  setAccountFilter("all");
                  setMethodFilter("all");
                  setTypeFilter("all");
                }}
              >
                <Filter className="h-3.5 w-3.5" /> Limpiar
              </Button>
            )}
          </div>

          {/* Category chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
            <CategoryChip
              active={categoryFilter === "all"}
              onClick={() => setCategoryFilter("all")}
              label="Todas"
            />
            {categories?.map((c) => (
              <CategoryChip
                key={c.id}
                active={categoryFilter === c.id}
                onClick={() => setCategoryFilter(c.id)}
                label={c.name}
                icon={c.icon}
                color={c.color}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {loading ? (
        <MovementsSkeleton />
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center justify-center text-center gap-3">
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
              <Inbox className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">Sin movimientos</p>
              <p className="text-sm text-muted-foreground">
                No encontramos movimientos que coincidan con los filtros.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {groups.map(([label, items]) => (
            <div key={label}>
              <div className="flex items-center justify-between mb-2 px-1">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {label}
                </h3>
                <span className="text-xs text-muted-foreground">
                  {items.length} {items.length === 1 ? "mov." : "movs."}
                </span>
              </div>
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {items.map((e) => (
                      <ExpenseRow
                        key={e.id}
                        expense={e}
                        onDelete={() => setToDelete(e)}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar movimiento?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete && (
                <>
                  Se eliminará <strong>{toDelete.merchantName || toDelete.category.name}</strong> por{" "}
                  <strong>{formatCurrency(toDelete.amount)}</strong>. Esta acción no se puede deshacer.
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

// =============================================================================
// Helpers de agrupación según el periodo
// =============================================================================

function getGroupInfo(
  dateStr: string,
  period: Period,
  refDate: Date
): { label: string; sortKey: number } {
  const d = new Date(dateStr);
  if (period === "week") {
    // Agrupar por día de la semana: "Lunes 3 ago"
    const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const dayName = days[d.getDay()];
    const dayNum = d.getDate();
    const monthShort = d.toLocaleDateString("es-MX", { month: "short" });
    return {
      label: `${dayName} ${dayNum} ${monthShort}`,
      sortKey: new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(),
    };
  }
  if (period === "year") {
    // Agrupar por mes: "Enero de 2026"
    const monthName = d.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
    return {
      label: monthName.charAt(0).toUpperCase() + monthName.slice(1),
      sortKey: new Date(d.getFullYear(), d.getMonth(), 1).getTime(),
    };
  }
  // month: agrupar por día con formato relativo (Hoy, Ayer, Hace X días, o fecha)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expenseDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor((today.getTime() - expenseDate.getTime()) / 86400000);
  let label: string;
  if (diffDays === 0) label = "Hoy";
  else if (diffDays === 1) label = "Ayer";
  else if (diffDays > 1 && diffDays < 7) label = `Hace ${diffDays} días`;
  else label = d.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
  return {
    label,
    sortKey: expenseDate.getTime(),
  };
}

function CategoryChip({
  active,
  onClick,
  label,
  icon,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: string;
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background border-border hover:bg-accent text-foreground"
      }`}
    >
      {icon && color && (
        <CategoryIcon icon={icon} color={color} size="sm" className="h-5 w-5 rounded-md" />
      )}
      {label}
    </button>
  );
}

function ExpenseRow({
  expense,
  onDelete,
}: {
  expense: Expense;
  onDelete: () => void;
}) {
  const [hover, setHover] = useState(false);
  const cc = colorClasses(expense.category.color);
  const method = expense.paymentMethod
    ? METHOD_LABEL[expense.paymentMethod] || expense.paymentMethod
    : null;

  return (
    <div
      className="group flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <CategoryIcon
        icon={expense.category.icon}
        color={expense.category.color}
        size="sm"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">
            {expense.merchantName || expense.category.name}
          </p>
          {expense.source === "scan" && (
            <Badge variant="outline" className="text-[10px] h-4 px-1 gap-0.5 shrink-0">
              <ScanLine className="h-2.5 w-2.5" /> Scan
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="truncate">
            {expense.subcategory?.name || expense.category.name}
          </span>
          <span className="text-muted-foreground/50">·</span>
          <span className="shrink-0">{formatTime(expense.date)}</span>
          {method && (
            <>
              <span className="text-muted-foreground/50">·</span>
              <Badge
                variant="secondary"
                className={`text-[10px] h-4 px-1.5 gap-0.5 ${cc.soft} ${cc.text} hover:${cc.soft}`}
              >
                {method}
              </Badge>
            </>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p
          className={cn(
            "text-sm font-semibold",
            expense.type === "income"
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-red-600 dark:text-red-400"
          )}
        >
          {expense.type === "income" ? "+" : "-"}
          {formatCurrency(expense.amount, expense.currency)}
        </p>
        {expense.account && (
          <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">
            {expense.account.name}
          </p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className={`h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-500/10 transition-opacity ${
          hover ? "opacity-100" : "opacity-0 sm:opacity-0"
        }`}
        onClick={onDelete}
        aria-label="Eliminar movimiento"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function TypeFilterButton({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "bg-background shadow-sm text-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function MovementsSkeleton() {
  return (
    <div className="space-y-5">
      {[0, 1, 2].map((g) => (
        <div key={g}>
          <Skeleton className="h-4 w-24 mb-2" />
          <Card>
            <CardContent className="p-0">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 border-b last:border-0">
                  <Skeleton className="h-8 w-8 rounded-xl" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <Skeleton className="h-3.5 w-16" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ))}
      <div className="text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
        <Receipt className="h-3.5 w-3.5" /> Cargando movimientos…
      </div>
    </div>
  );
}
