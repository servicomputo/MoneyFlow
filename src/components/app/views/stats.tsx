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
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";

import { useStatsForPeriod } from "../hooks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tabs,
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
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import { CategoryIcon } from "../category-icon";
import { colorClasses } from "@/lib/categories";
import { formatCurrency, monthKey } from "@/lib/format";
import { shiftPeriod, formatPeriodLabel, getPrevPeriodRange } from "@/lib/stats-utils";
import { cn } from "@/lib/utils";

type Period = "month" | "week" | "year";

const WEEK_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export function StatsView() {
  const [period, setPeriod] = React.useState<Period>("month");
  const [refDate, setRefDate] = React.useState<Date>(new Date());
  const { data: stats, isLoading } = useStatsForPeriod(period, refDate);

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

  if (isLoading || !stats) {
    return <StatsSkeleton />;
  }

  const s = stats.summary;
  const isCurrentPeriod = isNow(period, refDate);
  const periodLabelStr = formatPeriodLabel(period, refDate);
  const prevLabel = formatPeriodLabel(period, getPrevPeriodRange(period, refDate).start);

  // Labels para el eje X de la tendencia
  const trendLabels = period === "week" ? WEEK_LABELS : period === "year" ? MONTH_LABELS : undefined;

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
      </div>

      {/* Period navigation + exports */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={goPrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[140px] text-center">
            <p className="text-sm font-semibold capitalize">{periodLabelStr}</p>
            <p className="text-[11px] text-muted-foreground">
              {s.expenseCount + s.incomeCount > 0
                ? `${s.expenseCount + s.incomeCount} movimientos`
                : "Sin movimientos"}
            </p>
          </div>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={goNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isCurrentPeriod && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setRefDate(new Date())}
            >
              Hoy
            </Button>
          )}
        </div>
        <ExportButtons month={monthKey(refDate)} />
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
        <SummaryStat
          label="Total gastado"
          value={formatCurrency(s.totalSpent, "MXN", { compact: true })}
          icon={<ArrowDownLeft className="h-4 w-4" />}
          accent="text-rose-600 dark:text-rose-400"
        />
        <SummaryStat
          label="Ingresos"
          value={formatCurrency(s.totalIncome, "MXN", { compact: true })}
          icon={<ArrowUpRight className="h-4 w-4" />}
          accent="text-emerald-600 dark:text-emerald-400"
        />
        <SummaryStat
          label="Prom. diario"
          value={formatCurrency(s.avgDaily, "MXN", { compact: true })}
          icon={<CalendarDays className="h-4 w-4" />}
        />
        <SummaryStat
          label={period === "year" ? "Prom. mensual" : "Prom. semanal"}
          value={formatCurrency(period === "year" ? s.avgDaily * 30 : s.avgWeekly, "MXN", { compact: true })}
          icon={<CalendarDays className="h-4 w-4" />}
        />
        <SummaryStat
          label={period === "year" ? "Proyección año" : period === "week" ? "Proyección semana" : "Proyección mes"}
          value={formatCurrency(s.projectedMonth, "MXN", { compact: true })}
          icon={<Sparkles className="h-4 w-4" />}
          accent="text-primary"
        />
        <SummaryStat
          label="Movimientos"
          value={String(s.expenseCount + s.incomeCount)}
          subline={
            <>
              <span className="text-rose-600 dark:text-rose-400">
                {s.expenseCount} egresos
              </span>{" "}
              ·{" "}
              <span className="text-emerald-600 dark:text-emerald-400">
                {s.incomeCount} ingresos
              </span>
            </>
          }
          icon={<Receipt className="h-4 w-4" />}
        />
        <SummaryStat
          label="Balance"
          value={`${s.totalIncome - s.totalSpent >= 0 ? "+" : "-"}${formatCurrency(
            Math.abs(s.totalIncome - s.totalSpent),
            "MXN",
            { compact: true }
          )}`}
          icon={
            s.totalIncome - s.totalSpent >= 0 ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )
          }
          accent={
            s.totalIncome - s.totalSpent >= 0
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400"
          }
        />
      </div>

      {/* Charts grid */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">
              Tendencia {period === "week" ? "semanal" : period === "year" ? "anual" : "de gastos"}
            </CardTitle>
            <Badge variant="secondary" className="text-xs capitalize">
              {periodLabelStr}
            </Badge>
          </CardHeader>
          <CardContent>
            <TrendChartWithLabels data={stats.byDay} labels={trendLabels} period={period} />
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
          <CardTitle className="text-base">Comparativa {period === "week" ? "semana anterior" : period === "year" ? "año anterior" : "mes anterior"}</CardTitle>
          <Badge variant="secondary" className="text-xs capitalize">
            vs {prevLabel}
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Este periodo</TableHead>
                <TableHead className="text-right">Periodo anterior</TableHead>
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

// Verifica si refDate corresponde al periodo actual
function isNow(period: Period, refDate: Date): boolean {
  const now = new Date();
  if (period === "year") return refDate.getFullYear() === now.getFullYear();
  if (period === "month") return refDate.getMonth() === now.getMonth() && refDate.getFullYear() === now.getFullYear();
  // week: misma semana
  const startOfWeek = (d: Date) => {
    const r = new Date(d);
    const day = r.getDay();
    const diff = r.getDate() - day + (day === 0 ? -6 : 1);
    r.setDate(diff);
    r.setHours(0, 0, 0, 0);
    return r;
  };
  return startOfWeek(refDate).getTime() === startOfWeek(now).getTime();
}

// Componente wrapper que muestra la gráfica de tendencia con labels apropiados
function TrendChartWithLabels({
  data,
  labels,
  period,
}: {
  data: Array<{ day: number; total: number }>;
  labels?: string[];
  period: Period;
}) {
  // Para semana y año, usamos un BarChart con labels personalizados
  if (labels && labels.length > 0) {
    const chartData = data.map((d, i) => ({
      ...d,
      label: labels[i] || String(d.day),
    }));
    return (
      <ResponsiveContainerWithLabels data={chartData} />
    );
  }
  // Para mes, usamos el AreaChart estándar
  return <SpendingTrendChart data={data} />;
}

function ResponsiveContainerWithLabels({
  data,
}: {
  data: Array<{ day: number; total: number; label: string }>;
}) {
  return (
    <div className="w-full" style={{ height: 220 }}>
      <ResponsiveBarChartWithLabels data={data} />
    </div>
  );
}

const TREND_COLORS = ["#10b981", "#14b8a6", "#06b6d4", "#f59e0b", "#f97316", "#ec4899", "#8b5cf6"];

function ResponsiveBarChartWithLabels({
  data,
}: {
  data: Array<{ day: number; total: number; label: string }>;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatCurrency(v, "MXN", { compact: true })}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload || payload.length === 0) return null;
            return (
              <div className="rounded-lg border bg-popover px-3 py-2 shadow-md text-xs">
                <p className="font-medium mb-0.5">{label}</p>
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {formatCurrency(Number(payload[0].value), "MXN")}
                  </span>
                </p>
              </div>
            );
          }}
          cursor={{ fill: "var(--accent)", opacity: 0.3 }}
        />
        <Bar dataKey="total" radius={[6, 6, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={TREND_COLORS[i % TREND_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
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
  subline,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent?: string;
  subline?: React.ReactNode;
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
      {subline && (
        <p className="mt-1 text-[11px] text-muted-foreground">{subline}</p>
      )}
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
