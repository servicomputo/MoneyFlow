"use client";

import { useMemo } from "react";
import { useStats, useSubscriptions, useReminders, useProcessSubscriptionsOnMount } from "../hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CategoryIcon } from "../category-icon";
import { SpendingTrendChart, CategoryPieChart, CashFlowChart } from "@/components/charts";
import { formatCurrency, formatDate, monthLabel, monthKey } from "@/lib/format";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Stats } from "@/lib/data-provider";
import {
  ArrowDownLeft,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  Wallet,
  PiggyBank,
  Target,
  Sparkles,
  ChevronRight,
  Receipt,
  Bell,
  Plus,
  ScanLine,
  Bot,
  FileUp,
  AlertTriangle,
  CalendarDays,
  type LucideIcon,
} from "lucide-react";

type SpendingAlert = {
  id: string;
  severity: "warning" | "danger";
  icon: LucideIcon;
  title: string;
  message: string;
};

function computeAlerts(stats: Stats): SpendingAlert[] {
  const alerts: SpendingAlert[] = [];

  // 1. Budget alerts: budgetUsage where percentage >= 85
  for (const b of stats.budgetUsage) {
    if (b.percentage >= 85) {
      alerts.push({
        id: `budget-${b.id}`,
        severity: b.percentage >= 100 ? "danger" : "warning",
        icon: Target,
        title: "Presupuesto al límite",
        message: `Has utilizado el ${b.percentage.toFixed(0)}% de tu presupuesto en ${b.categoryName}.`,
      });
    }
  }

  // 2. Category increase alerts: categoryComparison where variation > 20
  for (const c of stats.categoryComparison) {
    if (c.variation > 20 && c.prev > 0) {
      alerts.push({
        id: `cat-${c.categoryId}`,
        severity: c.variation > 50 ? "danger" : "warning",
        icon: TrendingUp,
        title: "Aumento de gastos",
        message: `Tus gastos en ${c.name} aumentaron ${c.variation.toFixed(0)}% este mes.`,
      });
    }
  }

  // 3. Unusual expense: a single expense > 3x the average
  const avgExpense =
    stats.summary.expenseCount > 0
      ? stats.summary.totalSpent / stats.summary.expenseCount
      : 0;
  if (avgExpense > 0) {
    for (const e of stats.recentExpenses) {
      if (e.type !== "income" && e.amount > avgExpense * 3) {
        alerts.push({
          id: `unusual-${e.id}`,
          severity: "warning",
          icon: AlertTriangle,
          title: "Gasto inusual",
          message: `Detectamos un gasto inusual de ${formatCurrency(e.amount, "MXN")} en ${e.merchantName || e.category?.name || "un comercio"}.`,
        });
        break; // mostrar solo el más reciente
      }
    }
  }

  return alerts;
}

export function DashboardView() {
  const { setView, setAddOpen } = useAppStore();
  const month = monthKey();
  const { data: stats, isLoading } = useStats(month);
  const { data: subs } = useSubscriptions();
  const { data: reminders } = useReminders();
  // Procesar suscripciones al cargar (cobro automático + recordatorios)
  useProcessSubscriptionsOnMount();

  const alerts = useMemo(() => (stats ? computeAlerts(stats) : []), [stats]);

  if (isLoading || !stats) {
    return <DashboardSkeleton />;
  }

  const s = stats.summary;
  const variation = s.variation;

  return (
    <div className="space-y-5">
      {/* Hero: saldo del mes */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 overflow-hidden border-0 text-white shadow-xl" style={{ background: "linear-gradient(135deg, var(--primary), color-mix(in oklch, var(--primary), #000 35%))", boxShadow: "0 20px 40px -12px color-mix(in oklch, var(--primary) 40%, transparent)" }}>
          <CardContent className="p-6 relative">
            <div className="absolute inset-0 bg-grid opacity-10" />
            <div className="relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-50/90 text-sm font-medium">Saldo total</p>
                  <p className="text-4xl font-bold tracking-tight mt-1">
                    {formatCurrency(s.totalBalance, "MXN")}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
                  <Wallet className="h-6 w-6" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-6">
                <Metric
                  label="Ingresos"
                  value={formatCurrency(s.totalIncome, "MXN", { compact: true })}
                  icon={<ArrowUpRight className="h-3.5 w-3.5" />}
                />
                <Metric
                  label="Gastado"
                  value={formatCurrency(s.totalSpent, "MXN", { compact: true })}
                  icon={<ArrowDownLeft className="h-3.5 w-3.5" />}
                />
                <Metric
                  label="Ahorrado"
                  value={formatCurrency(s.totalSaved, "MXN", { compact: true })}
                  icon={<PiggyBank className="h-3.5 w-3.5" />}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA agregar + escanear */}
        <div className="grid gap-3">
          <Button
            onClick={() => setAddOpen(true)}
            className="h-full min-h-[88px] text-lg font-semibold justify-start gap-4 group"
            size="lg"
          >
            <div className="h-11 w-11 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Plus className="h-6 w-6" />
            </div>
            <div className="text-left">
              <div>Agregar movimiento</div>
              <div className="text-xs font-normal opacity-80">Gasto, ingreso o transferencia</div>
            </div>
          </Button>
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant="outline"
              className="h-20 flex-col gap-1.5"
              onClick={() => setView("scan")}
            >
              <ScanLine className="h-5 w-5 text-primary" />
              <span className="text-xs">Escanear</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col gap-1.5"
              onClick={() => setView("calendar")}
            >
              <CalendarDays className="h-5 w-5 text-primary" />
              <span className="text-xs">Calendario</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col gap-1.5"
              onClick={() => setView("assistant")}
            >
              <Bot className="h-5 w-5 text-primary" />
              <span className="text-xs">Asistente</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Comparación con mes anterior + presupuesto */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Gasto del mes</span>
              {variation <= 0 ? (
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  {Math.abs(variation).toFixed(0)}%
                </Badge>
              ) : (
                <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/10">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {variation.toFixed(0)}%
                </Badge>
              )}
            </div>
            <p className="text-2xl font-bold">{formatCurrency(s.totalSpent)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              vs {formatCurrency(s.prevTotalSpent, "MXN", { compact: true })} el mes pasado
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Presupuesto usado</span>
              <span className="text-xs font-medium">
                {s.budgetPercentage.toFixed(0)}%
              </span>
            </div>
            <p className="text-2xl font-bold">
              {formatCurrency(s.totalSpent, "MXN", { compact: true })}
              <span className="text-sm font-normal text-muted-foreground">
                {" "}/ {formatCurrency(s.totalBudget, "MXN", { compact: true })}
              </span>
            </p>
            <Progress value={s.budgetPercentage} className="mt-2 h-1.5" />
            <p className="text-xs text-muted-foreground mt-1.5">
              {formatCurrency(Math.max(0, s.budgetRemaining))} restante
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Proyección cierre</span>
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </div>
            <p className="text-2xl font-bold">{formatCurrency(s.projectedMonth)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Prom. diario: {formatCurrency(s.avgDaily, "MXN", { compact: true })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Flujo de caja: Ingresos vs Egresos */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" /> Flujo de caja
            </CardTitle>
            <Badge variant="secondary" className="text-xs">{monthLabel(month)}</Badge>
          </CardHeader>
          <CardContent>
            <CashFlowChart income={s.totalIncome} expenses={s.totalSpent} />
          </CardContent>
        </Card>

        {/* Mini KPIs del flujo */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Resumen del mes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <FlowKpi
              label="Tasa de ahorro"
              value={`${s.totalIncome > 0 ? Math.max(0, (s.totalSaved / s.totalIncome) * 100).toFixed(0) : 0}%`}
              hint={formatCurrency(s.totalSaved, "MXN", { compact: true })}
              icon={<PiggyBank className="h-3.5 w-3.5" />}
              tone="emerald"
            />
            <FlowKpi
              label="Ingreso promedio"
              value={formatCurrency(s.incomeCount > 0 ? s.totalIncome / s.incomeCount : 0, "MXN", { compact: true })}
              hint={`${s.incomeCount} ingresos`}
              icon={<ArrowUpRight className="h-3.5 w-3.5" />}
              tone="emerald"
            />
            <FlowKpi
              label="Gasto promedio"
              value={formatCurrency(s.expenseCount > 0 ? s.totalSpent / s.expenseCount : 0, "MXN", { compact: true })}
              hint={`${s.expenseCount} gastos`}
              icon={<ArrowDownLeft className="h-3.5 w-3.5" />}
              tone="red"
            />
          </CardContent>
        </Card>
      </div>

      {/* Alertas de gasto inusual */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold">Alertas</h3>
            <Badge variant="secondary" className="text-xs">{alerts.length}</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {alerts.map((alert) => {
              const Icon = alert.icon;
              const isDanger = alert.severity === "danger";
              return (
                <Card
                  key={alert.id}
                  className={cn(
                    "border-l-4 py-0 gap-0",
                    isDanger ? "border-l-red-500" : "border-l-amber-500"
                  )}
                >
                  <CardContent className="p-4 flex items-start gap-3">
                    <div
                      className={cn(
                        "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                        isDanger
                          ? "bg-red-500/10"
                          : "bg-amber-500/10"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4",
                          isDanger
                            ? "text-red-600 dark:text-red-400"
                            : "text-amber-600 dark:text-amber-400"
                        )}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">{alert.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-snug">
                        {alert.message}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Gráfica de tendencia + pie de categorías */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Tendencia de gastos</CardTitle>
            <Badge variant="secondary" className="text-xs">{monthLabel(month)}</Badge>
          </CardHeader>
          <CardContent>
            <SpendingTrendChart data={stats.byDay} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Por categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryPieChart data={stats.topCategories} />
            <div className="space-y-1.5 mt-3">
              {stats.topCategories.slice(0, 4).map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: `var(--chart-${(i % 5) + 1})` }}
                  />
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="font-medium">{formatCurrency(c.total, "MXN", { compact: true })}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top 5 categorías + últimos movimientos */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Top 5 categorías</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setView("stats")} className="text-xs h-7">
              Ver más <ChevronRight className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.topCategories.map((c, i) => {
              const max = stats.topCategories[0]?.total || 1;
              const pct = (c.total / max) * 100;
              return (
                <div key={i} className="flex items-center gap-3">
                  <CategoryIcon icon={c.icon} color={c.color} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium truncate">{c.name}</span>
                      <span className="text-sm font-semibold">{formatCurrency(c.total, "MXN", { compact: true })}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: `var(--chart-${(i % 5) + 1})` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Últimos movimientos</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setView("movements")} className="text-xs h-7">
              Ver todos <ChevronRight className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {stats.recentExpenses.map((e) => (
                <div key={e.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-accent/50 transition-colors">
                  <CategoryIcon icon={e.category.icon} color={e.category.color} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {e.merchantName || e.category.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(e.date, "relative")} · {e.category.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "text-sm font-semibold",
                      e.type === "income"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    )}>
                      {e.type === "income" ? "+" : "-"}{formatCurrency(e.amount, "MXN", { compact: true })}
                    </p>
                    {e.source === "scan" && (
                      <Badge variant="outline" className="text-[9px] h-4 px-1">
                        <ScanLine className="h-2.5 w-2.5 mr-0.5" /> Escaneado
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              {stats.recentExpenses.length === 0 && (
                <div className="px-5 py-12 text-center text-sm text-muted-foreground">
                  No hay movimientos este mes.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recurrentes + recordatorios */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" /> Recurrentes
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setView("subscriptions")} className="text-xs h-7">
              Ver todas <ChevronRight className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {subs?.slice(0, 4).map((sub) => (
              <div key={sub.id} className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Receipt className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{sub.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Próx. pago: {formatDate(sub.nextDate, "short")}
                  </p>
                </div>
                <span className="text-sm font-semibold">{formatCurrency(sub.amount)}</span>
              </div>
            ))}
            <div className="pt-2 border-t mt-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total mensual</span>
              <span className="font-semibold">{formatCurrency(s.subscriptionsTotal)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" /> Recordatorios
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setView("reminders")} className="text-xs h-7">
              Ver todos <ChevronRight className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {reminders?.filter((r) => !r.done).slice(0, 4).map((r) => (
              <div key={r.id} className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(r.dueDate, "relative")}
                  </p>
                </div>
              </div>
            ))}
            {(!reminders || reminders.filter((r) => !r.done).length === 0) && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No hay recordatorios pendientes 🎉
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1 text-emerald-50/80 text-xs">
        {icon}
        {label}
      </div>
      <p className="text-lg font-bold mt-0.5">{value}</p>
    </div>
  );
}

function FlowKpi({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
  tone: "emerald" | "red";
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <div
          className={cn(
            "h-7 w-7 rounded-lg flex items-center justify-center shrink-0",
            tone === "emerald"
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-red-500/10 text-red-600 dark:text-red-400"
          )}
        >
          {icon}
        </div>
        <span className="text-xs text-muted-foreground truncate">{label}</span>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold">{value}</p>
        <p className="text-[10px] text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="lg:col-span-2 h-44 rounded-2xl" />
        <Skeleton className="h-44 rounded-2xl" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <Skeleton className="lg:col-span-3 h-72 rounded-xl" />
        <Skeleton className="lg:col-span-2 h-72 rounded-xl" />
      </div>
    </div>
  );
}
