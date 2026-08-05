"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Receipt,
  CalendarDays,
  Download,
  FileText,
  FileSpreadsheet,
  FileJson,
  FileDown,
  Sparkles,
  Minus,
} from "lucide-react";

import { useStats } from "../hooks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  SpendingTrendChart,
  CategoryPieChart,
  MerchantBarChart,
  MethodPieChart,
  CategoryBarChart,
} from "@/components/charts";
import { CategoryIcon } from "../category-icon";
import { colorClasses } from "@/lib/categories";
import { formatCurrency, monthKey, monthLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

export function StatsView() {
  const [month, setMonth] = React.useState<string>(monthKey());
  const { data: stats, isLoading } = useStats(month);

  function goPrev() {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    setMonth(monthKey(d));
  }
  function goNext() {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m, 1);
    setMonth(monthKey(d));
  }

  if (isLoading || !stats) {
    return <StatsSkeleton />;
  }

  const s = stats.summary;
  const variation = s.variation;

  return (
    <div className="space-y-6">
      {/* Header + period selector */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Estadísticas avanzadas</h2>
          <p className="text-sm text-muted-foreground">
            Analiza tus gastos con gráficas, comparativas y exportación.
          </p>
        </div>
        <Tabs defaultValue="month" className="w-auto">
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
          <TabsContent value="week" className="mt-2">
            <p className="text-xs text-muted-foreground">
              Vista semanal próximamente — mostrando datos del mes.
            </p>
          </TabsContent>
          <TabsContent value="year" className="mt-2">
            <p className="text-xs text-muted-foreground">
              Vista anual próximamente — mostrando datos del mes.
            </p>
          </TabsContent>
        </Tabs>
      </div>

      {/* Month navigation + exports */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={goPrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[140px] text-center">
            <p className="text-sm font-semibold capitalize">{monthLabel(month)}</p>
            <p className="text-[11px] text-muted-foreground">
              {stats.recentExpenses.length + (s.expenseCount - stats.recentExpenses.length) > 0
                ? `${s.expenseCount} movimientos`
                : "Sin movimientos"}
            </p>
          </div>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={goNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {month !== monthKey() && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setMonth(monthKey())}
            >
              Hoy
            </Button>
          )}
        </div>
        <ExportButtons month={month} />
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <SummaryStat
          label="Total gastado"
          value={formatCurrency(s.totalSpent, "MXN", { compact: true })}
          icon={<Receipt className="h-4 w-4" />}
          accent="text-rose-600 dark:text-rose-400"
        />
        <SummaryStat
          label="Prom. diario"
          value={formatCurrency(s.avgDaily, "MXN", { compact: true })}
          icon={<CalendarDays className="h-4 w-4" />}
        />
        <SummaryStat
          label="Prom. semanal"
          value={formatCurrency(s.avgWeekly, "MXN", { compact: true })}
          icon={<CalendarDays className="h-4 w-4" />}
        />
        <SummaryStat
          label="Proyección mes"
          value={formatCurrency(s.projectedMonth, "MXN", { compact: true })}
          icon={<Sparkles className="h-4 w-4" />}
          accent="text-primary"
        />
        <SummaryStat
          label="Movimientos"
          value={String(s.expenseCount)}
          icon={<Receipt className="h-4 w-4" />}
        />
        <SummaryStat
          label="Variación"
          value={`${variation >= 0 ? "+" : ""}${variation.toFixed(0)}%`}
          icon={
            variation > 0 ? (
              <TrendingUp className="h-4 w-4" />
            ) : variation < 0 ? (
              <TrendingDown className="h-4 w-4" />
            ) : (
              <Minus className="h-4 w-4" />
            )
          }
          accent={
            variation > 0
              ? "text-rose-600 dark:text-rose-400"
              : variation < 0
              ? "text-emerald-600 dark:text-emerald-400"
              : undefined
          }
        />
      </div>

      {/* Charts grid */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Tendencia de gastos</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {monthLabel(month)}
            </Badge>
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
              {stats.topCategories.slice(0, 5).map((c, i) => {
                const cc = colorClasses(c.color);
                return (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: cc.hex }}
                    />
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="font-medium">
                      {formatCurrency(c.total, "MXN", { compact: true })}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top comercios</CardTitle>
          </CardHeader>
          <CardContent>
            <MerchantBarChart data={stats.topMerchants} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Método de pago</CardTitle>
          </CardHeader>
          <CardContent>
            <MethodPieChart data={stats.byMethod} />
            <div className="grid grid-cols-2 gap-1.5 mt-3 text-xs">
              {stats.byMethod.slice(0, 4).map((m, i) => {
                const labels: Record<string, string> = {
                  cash: "Efectivo",
                  credit: "Crédito",
                  debit: "Débito",
                  transfer: "Transferencia",
                  wallet: "Billetera",
                };
                return (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground truncate">
                      {labels[m.method] ?? m.method}
                    </span>
                    <span className="font-medium">
                      {formatCurrency(m.total, "MXN", { compact: true })}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">
              Comparativa por categoría
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {stats.categoryComparison.length} categorías
            </Badge>
          </CardHeader>
          <CardContent>
            <CategoryBarChart
              data={stats.categoryComparison.map((c) => ({
                name: c.name,
                total: c.total,
                color: c.color,
              }))}
            />
          </CardContent>
        </Card>
      </div>

      {/* Comparison table */}
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Comparativa mes anterior</CardTitle>
          <Badge variant="secondary" className="text-xs">
            vs {monthLabel(prevMonthKey(month))}
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Este mes</TableHead>
                <TableHead className="text-right">Mes anterior</TableHead>
                <TableHead className="text-right">Variación</TableHead>
                <TableHead className="text-right hidden sm:table-cell">
                  Tendencia
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.categoryComparison.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground py-8"
                  >
                    No hay datos suficientes para comparar.
                  </TableCell>
                </TableRow>
              )}
              {stats.categoryComparison.map((c) => {
                const cc = colorClasses(c.color);
                const positive = c.variation > 0;
                const negative = c.variation < 0;
                return (
                  <TableRow key={c.categoryId}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <CategoryIcon
                          icon={c.icon}
                          color={c.color}
                          size="sm"
                        />
                        <div>
                          <p className="font-medium">{c.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {c.count} mov.
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(c.total, "MXN", { compact: true })}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(c.prev, "MXN", { compact: true })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "gap-1",
                          positive &&
                            "bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10",
                          negative &&
                            "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10",
                          !positive &&
                            !negative &&
                            "bg-muted text-muted-foreground"
                        )}
                      >
                        {positive && <TrendingUp className="h-3 w-3" />}
                        {negative && <TrendingDown className="h-3 w-3" />}
                        {!positive && !negative && <Minus className="h-3 w-3" />}
                        {c.variation >= 0 ? "+" : ""}
                        {c.variation.toFixed(0)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right hidden sm:table-cell">
                      <Sparkline
                        color={cc.hex}
                        current={c.total}
                        previous={c.prev}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Budget usage mini cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stats.budgetUsage.slice(0, 6).map((b) => (
          <BudgetMini key={b.id} b={b} />
        ))}
      </div>
    </div>
  );
}

function ExportButtons({ month }: { month: string }) {
  const items = [
    {
      format: "csv",
      label: "CSV",
      icon: FileText,
    },
    {
      format: "json",
      label: "JSON",
      icon: FileJson,
    },
    {
      format: "excel",
      label: "Excel",
      icon: FileSpreadsheet,
    },
    {
      format: "pdf",
      label: "PDF",
      icon: FileDown,
    },
  ];
  return (
    <div className="flex items-center gap-1.5">
      <span className="hidden sm:inline-flex items-center gap-1 text-xs text-muted-foreground mr-1">
        <Download className="h-3.5 w-3.5" />
        Exportar:
      </span>
      {items.map((it) => (
        <Button
          key={it.format}
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 px-2 text-xs"
          asChild
        >
          <a
            href={`/api/export?format=${it.format}&month=${month}`}
            download
            target="_blank"
            rel="noreferrer"
          >
            {renderIcon(it.icon, "h-3.5 w-3.5")}
            <span className="hidden sm:inline">{it.label}</span>
          </a>
        </Button>
      ))}
    </div>
  );
}

function renderIcon(
  Icon: React.ComponentType<{ className?: string }>,
  className: string
) {
  return React.createElement(Icon, { className });
}

function SummaryStat({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <span
          className={cn(
            "h-7 w-7 rounded-lg bg-muted/60 flex items-center justify-center text-muted-foreground",
            accent
          )}
        >
          {icon}
        </span>
      </div>
      <p className={cn("mt-2 text-xl font-bold", accent)}>{value}</p>
    </div>
  );
}

function Sparkline({
  color,
  current,
  previous,
}: {
  color: string;
  current: number;
  previous: number;
}) {
  const max = Math.max(current, previous, 1);
  const curW = (current / max) * 100;
  const prevW = (previous / max) * 100;
  return (
    <div className="flex flex-col items-end gap-1 w-32 ml-auto">
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${curW}%`, backgroundColor: color }}
        />
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full opacity-40"
          style={{ width: `${prevW}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function BudgetMini({
  b,
}: {
  b: {
    id: string;
    categoryName: string;
    categoryColor: string;
    categoryIcon: string;
    amount: number;
    spent: number;
    remaining: number;
    percentage: number;
  };
}) {
  const cc = colorClasses(b.categoryColor);
  const over = b.percentage > 100;
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2.5 mb-3">
        <CategoryIcon icon={b.categoryIcon} color={b.categoryColor} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{b.categoryName}</p>
          <p className="text-[11px] text-muted-foreground">
            {formatCurrency(b.spent, "MXN", { compact: true })} /{" "}
            {formatCurrency(b.amount, "MXN", { compact: true })}
          </p>
        </div>
        <Badge
          variant="secondary"
          className={cn(
            "text-xs",
            over
              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
              : cc.soft + " " + cc.text
          )}
        >
          {b.percentage.toFixed(0)}%
        </Badge>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.min(100, b.percentage)}%`,
            backgroundColor: over ? "#ef4444" : cc.hex,
          }}
        />
      </div>
      <p className="text-[11px] text-muted-foreground mt-1.5">
        {over
          ? `Excedido por ${formatCurrency(Math.abs(b.remaining), "MXN", {
              compact: true,
            })}`
          : `${formatCurrency(b.remaining, "MXN", { compact: true })} restante`}
      </p>
    </div>
  );
}

function prevMonthKey(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return monthKey(d);
}

function StatsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-9 w-72" />
      </div>
      <Skeleton className="h-16 rounded-xl" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <Skeleton className="lg:col-span-3 h-72 rounded-xl" />
        <Skeleton className="lg:col-span-2 h-72 rounded-xl" />
        <Skeleton className="lg:col-span-3 h-80 rounded-xl" />
        <Skeleton className="lg:col-span-2 h-80 rounded-xl" />
        <Skeleton className="lg:col-span-5 h-80 rounded-xl" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}
