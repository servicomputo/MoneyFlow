"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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

import {
  useSubscriptions,
  useReminders,
  useAccounts,
  mutations,
  type Subscription,
  type Reminder,
  type Account,
  type Expense,
} from "../hooks";
import { dataProvider } from "@/lib/data-provider";
import { useDataModeStore } from "@/lib/data-mode";
import { formatCurrency, formatDate } from "@/lib/format";
import { normalizeType, getRecurringType } from "@/lib/recurring-types";
import { colorClasses } from "@/lib/categories";
import { CategoryIcon } from "../category-icon";
import { cn } from "@/lib/utils";

import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Receipt,
  Bell,
  CreditCard,
  Repeat,
  AlertCircle,
  CheckCircle2,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Plus,
  Trash2,
  Check,
} from "lucide-react";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// Tipos de evento del calendario
type EventKind = "recurring" | "cardDue" | "reminderOverdue" | "reminderUpcoming" | "activity";

interface CalendarEvent {
  kind: EventKind;
  date: Date;
  title: string;
  subtitle?: string;
  amount?: number;
  currency?: string;
  transactionType?: "expense" | "income" | "transfer";
  // Referencias para acciones
  subscriptionId?: string;
  reminderId?: string;
  accountId?: string;
  expenseCount?: number;
  expenseTotal?: number;
  expenseType?: "income" | "expense" | "transfer";
}

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// Color del punto/icono según tipo de evento
function eventVisual(kind: EventKind) {
  switch (kind) {
    case "recurring":
      return { dot: "bg-purple-500", soft: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400", icon: Repeat };
    case "cardDue":
      return { dot: "bg-amber-500", soft: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", icon: CreditCard };
    case "reminderOverdue":
      return { dot: "bg-red-500", soft: "bg-red-500/10", text: "text-red-600 dark:text-red-400", icon: AlertCircle };
    case "reminderUpcoming":
      return { dot: "bg-emerald-500", soft: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", icon: Bell };
    case "activity":
      return { dot: "bg-slate-400", soft: "bg-slate-500/10", text: "text-slate-600 dark:text-slate-400", icon: Receipt };
  }
}

export function CalendarView() {
  const qc = useQueryClient();
  const dataMode = useDataModeStore((s) => s.mode);

  const { data: subscriptions, isLoading: subsLoading } = useSubscriptions();
  const { data: reminders, isLoading: remindersLoading } = useReminders();
  const { data: accounts, isLoading: accountsLoading } = useAccounts();

  // Vista de mes actual (por defecto el mes de hoy)
  const [cursor, setCursor] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expensesLoading, setExpensesLoading] = useState(true);
  const [reminderToToggle, setReminderToToggle] = useState<Reminder | null>(null);
  const [reminderToDelete, setReminderToDelete] = useState<Reminder | null>(null);
  const [subscriptionToCharge, setSubscriptionToCharge] = useState<Subscription | null>(null);
  const [charging, setCharging] = useState(false);

  const today = startOfDay(new Date());
  const monthLabel = `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;

  // Cargar gastos del mes visible (para mostrar actividad)
  useEffect(() => {
    let cancelled = false;
    setExpensesLoading(true);
    const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59, 999);
    dataProvider
      .listExpensesRange(start.toISOString(), end.toISOString())
      .then((data) => {
        if (!cancelled) {
          setExpenses(data);
          setExpensesLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setExpenses([]);
          setExpensesLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [cursor, dataMode]);

  // Construir lista de eventos del mes visible
  const events: CalendarEvent[] = useMemo(() => {
    const list: CalendarEvent[] = [];
    const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59, 999);

    // 1. Pagos recurrentes (subscriptions activas con nextDate en el mes)
    for (const sub of subscriptions?.filter((s) => s.active) || []) {
      const next = new Date(sub.nextDate);
      if (next >= monthStart && next <= monthEnd) {
        const t = normalizeType(sub.type);
        list.push({
          kind: "recurring",
          date: startOfDay(next),
          title: sub.name,
          subtitle: sub.merchantName || undefined,
          amount: sub.amount,
          currency: sub.currency,
          transactionType: t,
          subscriptionId: sub.id,
        });
      }
    }

    // 2. Vencimientos de tarjeta de crédito (accounts con dueDay, type=credit)
    for (const acc of accounts?.filter((a) => a.type === "credit" && a.dueDay) || []) {
      const day = acc.dueDay!;
      // Asegurarse de que el día existe en el mes (ej. día 31 en febrero)
      const lastDayOfMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
      const safeDay = Math.min(day, lastDayOfMonth);
      const dueDate = new Date(cursor.getFullYear(), cursor.getMonth(), safeDay);
      list.push({
        kind: "cardDue",
        date: startOfDay(dueDate),
        title: `Pago de tarjeta`,
        subtitle: `${acc.name}${acc.bank ? ` · ${acc.bank}` : ""}${acc.last4 ? ` · ••${acc.last4}` : ""}`,
        accountId: acc.id,
      });
    }

    // 3. Recordatorios (todos los del mes, sin importar si están done)
    for (const rem of reminders || []) {
      const due = new Date(rem.dueDate);
      if (due >= monthStart && due <= monthEnd) {
        const isOverdue = !rem.done && due < today;
        list.push({
          kind: rem.done ? "reminderUpcoming" : isOverdue ? "reminderOverdue" : "reminderUpcoming",
          date: startOfDay(due),
          title: rem.title,
          subtitle: rem.notes || undefined,
          reminderId: rem.id,
        });
      }
    }

    // 4. Actividad de gastos del mes (un evento agregado por día con movimientos)
    const byDay = new Map<string, Expense[]>();
    for (const e of expenses) {
      const key = startOfDay(new Date(e.date)).toISOString();
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key)!.push(e);
    }
    for (const [key, items] of byDay.entries()) {
      // Solo agregar como "actividad" si no es ya un día con otros eventos
      // para no saturar; pero sí lo agregamos para que el día muestre el dot gris
      const date = new Date(key);
      const total = items.reduce((s, e) => s + (e.type === "income" ? e.amount : -e.amount), 0);
      list.push({
        kind: "activity",
        date,
        title: `${items.length} ${items.length === 1 ? "movimiento" : "movimientos"}`,
        subtitle: formatCurrency(Math.abs(total)),
        expenseCount: items.length,
        expenseTotal: total,
      });
    }

    return list;
  }, [subscriptions, reminders, accounts, expenses, cursor, today]);

  // Agrupar eventos por día
  const eventsByDay = useMemo(() => {
    const map = new Map<number, CalendarEvent[]>();
    for (const ev of events) {
      const day = ev.date.getDate();
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(ev);
    }
    // Ordenar cada día por tipo (recurring primero, luego cardDue, reminder, activity)
    const order: Record<EventKind, number> = {
      recurring: 0,
      cardDue: 1,
      reminderOverdue: 2,
      reminderUpcoming: 3,
      activity: 4,
    };
    for (const day of map.keys()) {
      map.get(day)!.sort((a, b) => order[a.kind] - order[b.kind]);
    }
    return map;
  }, [events]);

  // Construir las celdas del grid (incluyendo días vacíos al inicio y final)
  const cells = useMemo(() => {
    const firstDay = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    // 0=domingo, 1=lunes... convertimos a base lunes (0=lun, 6=dom)
    const firstDayWeekday = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const result: Array<{ day: number | null; date: Date | null }> = [];
    // Vacíos al inicio
    for (let i = 0; i < firstDayWeekday; i++) {
      result.push({ day: null, date: null });
    }
    // Días del mes
    for (let d = 1; d <= daysInMonth; d++) {
      result.push({
        day: d,
        date: new Date(cursor.getFullYear(), cursor.getMonth(), d),
      });
    }
    // Vacíos al final para completar la última semana
    while (result.length % 7 !== 0) {
      result.push({ day: null, date: null });
    }
    return result;
  }, [cursor]);

  // Stats del mes visible
  const stats = useMemo(() => {
    const recurring = events.filter((e) => e.kind === "recurring");
    const recurringTotal = recurring.reduce((s, e) => s + (e.amount || 0), 0);
    const cardDues = events.filter((e) => e.kind === "cardDue");
    const remindersList = events.filter(
      (e) => e.kind === "reminderOverdue" || e.kind === "reminderUpcoming"
    );
    const overdueCount = events.filter((e) => e.kind === "reminderOverdue").length;
    const activityDays = new Set(events.filter((e) => e.kind === "activity").map((e) => e.date.getDate())).size;
    return {
      recurringCount: recurring.length,
      recurringTotal,
      cardDueCount: cardDues.length,
      remindersCount: remindersList.length,
      overdueCount,
      activityDays,
    };
  }, [events]);

  // Eventos del día seleccionado
  const selectedEvents = useMemo(() => {
    if (!selectedDate) return [];
    return events
      .filter((e) => isSameDay(e.date, selectedDate))
      .sort((a, b) => {
        const order: Record<EventKind, number> = {
          recurring: 0,
          cardDue: 1,
          reminderOverdue: 2,
          reminderUpcoming: 3,
          activity: 4,
        };
        return order[a.kind] - order[b.kind];
      });
  }, [selectedDate, events]);

  function goPrev() {
    setCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }
  function goNext() {
    setCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }
  function goToday() {
    const now = new Date();
    setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(startOfDay(now));
  }

  async function toggleReminder(rem: Reminder) {
    try {
      await mutations.updateReminder(rem.id, { done: !rem.done });
      qc.invalidateQueries({ queryKey: ["reminders"] });
      toast.success(rem.done ? "Recordatorio reactivado" : "Recordatorio completado");
    } catch {
      toast.error("No se pudo actualizar el recordatorio");
    } finally {
      setReminderToToggle(null);
    }
  }

  async function deleteReminder(rem: Reminder) {
    try {
      await mutations.deleteReminder(rem.id);
      qc.invalidateQueries({ queryKey: ["reminders"] });
      toast.success("Recordatorio eliminado");
    } catch {
      toast.error("No se pudo eliminar el recordatorio");
    } finally {
      setReminderToDelete(null);
    }
  }

  async function confirmCharge() {
    if (!subscriptionToCharge) return;
    setCharging(true);
    try {
      const result = await mutations.chargeSubscription(subscriptionToCharge.id);
      if (!result.success) throw new Error(result.error || "Error");
      toast.success("Cobro procesado", {
        description: `${formatCurrency(subscriptionToCharge.amount)} · ${subscriptionToCharge.name}`,
      });
      qc.invalidateQueries({ queryKey: ["subscriptions"] });
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      setSubscriptionToCharge(null);
    } catch (e) {
      toast.error("No se pudo procesar el cobro");
    } finally {
      setCharging(false);
    }
  }

  const isLoading = subsLoading || remindersLoading || accountsLoading || expensesLoading;

  return (
    <div className="space-y-5">
      {/* Header con navegación de mes */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" /> Calendario
          </h2>
          <p className="text-sm text-muted-foreground">
            Pagos recurrentes, vencimientos de tarjeta y recordatorios
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={goPrev} aria-label="Mes anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[160px] text-center">
            <p className="text-sm font-semibold capitalize">{monthLabel}</p>
            <p className="text-xs text-muted-foreground">
              {stats.recurringCount + stats.cardDueCount + stats.remindersCount} eventos
            </p>
          </div>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={goNext} aria-label="Mes siguiente">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-9" onClick={goToday}>
            Hoy
          </Button>
        </div>
      </div>

      {/* Calendario grid */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          {/* Header días de la semana */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="text-center text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wide py-1"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Grid de días */}
          {isLoading ? (
            <CalendarSkeleton />
          ) : (
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {cells.map((cell, idx) => {
                if (cell.day === null || !cell.date) {
                  return (
                    <div
                      key={`empty-${idx}`}
                      className="min-h-[64px] sm:min-h-[110px] rounded-lg bg-muted/30"
                    />
                  );
                }
                const dayEvents = eventsByDay.get(cell.day) || [];
                const isToday = isSameDay(cell.date, today);
                const isSelected = selectedDate && isSameDay(cell.date, selectedDate);
                const hasOverdue = dayEvents.some((e) => e.kind === "reminderOverdue");
                return (
                  <button
                    key={cell.day}
                    type="button"
                    onClick={() => setSelectedDate(cell.date!)}
                    className={cn(
                      "min-h-[64px] sm:min-h-[110px] rounded-lg border p-1 sm:p-1.5 text-left transition-all flex flex-col gap-1",
                      "hover:border-primary/40 hover:bg-accent/40",
                      isToday && "border-primary ring-1 ring-primary/30 bg-primary/5",
                      isSelected && !isToday && "border-primary bg-primary/10",
                      !isToday && !isSelected && "border-border",
                      hasOverdue && !isToday && "bg-red-500/5"
                    )}
                  >
                    {/* Número del día */}
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "text-xs sm:text-sm font-medium",
                          isToday
                            ? "h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] sm:text-xs"
                            : "text-foreground"
                        )}
                      >
                        {cell.day}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="hidden sm:inline text-[9px] text-muted-foreground">
                          {dayEvents.length}
                        </span>
                      )}
                    </div>
                    {/* Eventos del día (máximo 3 visibles en desktop, solo dots en móvil) */}
                    {dayEvents.length > 0 && (
                      <div className="flex-1 space-y-0.5 overflow-hidden">
                        {/* Mobile: solo dots */}
                        <div className="sm:hidden flex flex-wrap gap-0.5 mt-1">
                          {dayEvents.slice(0, 4).map((ev, i) => {
                            const v = eventVisual(ev.kind);
                            return (
                              <span
                                key={i}
                                className={cn("h-1.5 w-1.5 rounded-full", v.dot)}
                              />
                            );
                          })}
                          {dayEvents.length > 4 && (
                            <span className="text-[9px] text-muted-foreground">+{dayEvents.length - 4}</span>
                          )}
                        </div>
                        {/* Desktop: hasta 3 eventos con texto */}
                        <div className="hidden sm:block space-y-0.5">
                          {dayEvents.slice(0, 3).map((ev, i) => {
                            const v = eventVisual(ev.kind);
                            const Icon = v.icon;
                            const isActivity = ev.kind === "activity";
                            return (
                              <div
                                key={i}
                                className={cn(
                                  "flex items-center gap-1 rounded px-1 py-0.5 text-[10px] truncate",
                                  v.soft,
                                  v.text
                                )}
                                title={`${ev.title}${ev.subtitle ? " · " + ev.subtitle : ""}`}
                              >
                                <Icon className="h-2.5 w-2.5 shrink-0" />
                                <span className="truncate">
                                  {isActivity
                                    ? `${ev.expenseCount} mov.`
                                    : ev.amount
                                    ? `${ev.title.slice(0, 12)}`
                                    : ev.title.slice(0, 14)}
                                </span>
                                {ev.amount && (
                                  <span className="ml-auto font-medium shrink-0">
                                    {formatCurrency(ev.amount, ev.currency, { compact: true })}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                          {dayEvents.length > 3 && (
                            <div className="text-[9px] text-muted-foreground px-1">
                              +{dayEvents.length - 3} más
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Leyenda */}
          <div className="mt-4 pt-3 border-t flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
            <LegendItem color="bg-purple-500" label="Pago recurrente" />
            <LegendItem color="bg-amber-500" label="Vencimiento tarjeta" />
            <LegendItem color="bg-emerald-500" label="Recordatorio" />
            <LegendItem color="bg-red-500" label="Vencido" />
            <LegendItem color="bg-slate-400" label="Actividad" />
          </div>
        </CardContent>
      </Card>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<Repeat className="h-4 w-4" />}
          label="Pagos recurrentes"
          value={stats.recurringCount.toString()}
          sub={formatCurrency(stats.recurringTotal, "MXN", { compact: true })}
          colorClass="bg-purple-500/10 text-purple-600 dark:text-purple-400"
        />
        <StatCard
          icon={<CreditCard className="h-4 w-4" />}
          label="Vencimientos tarjeta"
          value={stats.cardDueCount.toString()}
          sub={stats.cardDueCount === 0 ? "Sin vencimientos" : "Este mes"}
          colorClass="bg-amber-500/10 text-amber-600 dark:text-amber-400"
        />
        <StatCard
          icon={<Bell className="h-4 w-4" />}
          label="Recordatorios"
          value={stats.remindersCount.toString()}
          sub={
            stats.overdueCount > 0
              ? `${stats.overdueCount} vencido${stats.overdueCount === 1 ? "" : "s"}`
              : "Al día"
          }
          colorClass={
            stats.overdueCount > 0
              ? "bg-red-500/10 text-red-600 dark:text-red-400"
              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          }
        />
        <StatCard
          icon={<Receipt className="h-4 w-4" />}
          label="Días con actividad"
          value={stats.activityDays.toString()}
          sub="Con movimientos"
          colorClass="bg-slate-500/10 text-slate-600 dark:text-slate-400"
        />
      </div>

      {/* Sheet con detalle del día seleccionado */}
      <Sheet open={!!selectedDate} onOpenChange={(o) => !o && setSelectedDate(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 overflow-y-auto">
          <SheetHeader className="px-5 pt-5 pb-3 border-b">
            <SheetTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              {selectedDate && (
                <span className="capitalize">
                  {selectedDate.toLocaleDateString("es-MX", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              )}
            </SheetTitle>
            <SheetDescription>
              {selectedEvents.length === 0
                ? "No hay eventos este día"
                : `${selectedEvents.length} evento${selectedEvents.length === 1 ? "" : "s"}`}
            </SheetDescription>
          </SheetHeader>

          <div className="p-4 space-y-2">
            {selectedEvents.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <CalendarDays className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">Día libre</p>
                  <p className="text-xs text-muted-foreground">
                    No hay pagos ni recordatorios este día
                  </p>
                </div>
              </div>
            ) : (
              selectedEvents.map((ev, idx) => {
                const v = eventVisual(ev.kind);
                const Icon = v.icon;
                // Para recurrentes: mostrar botón Pagar si la fecha es hoy o ya venció
                const canCharge = ev.kind === "recurring" && ev.subscriptionId;
                return (
                  <EventRow
                    key={idx}
                    event={ev}
                    icon={<Icon className="h-4 w-4" />}
                    onToggleReminder={
                      ev.reminderId
                        ? () => {
                            const r = reminders?.find((x) => x.id === ev.reminderId);
                            if (r) setReminderToToggle(r);
                          }
                        : undefined
                    }
                    onDeleteReminder={
                      ev.reminderId
                        ? () => {
                            const r = reminders?.find((x) => x.id === ev.reminderId);
                            if (r) setReminderToDelete(r);
                          }
                        : undefined
                    }
                    reminderDone={
                      ev.reminderId
                        ? reminders?.find((x) => x.id === ev.reminderId)?.done
                        : undefined
                    }
                    onCharge={
                      canCharge
                        ? () => {
                            const sub = subscriptions?.find((s) => s.id === ev.subscriptionId);
                            if (sub) setSubscriptionToCharge(sub);
                          }
                        : undefined
                    }
                  />
                );
              })
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Confirmación marcar recordatorio */}
      <AlertDialog
        open={!!reminderToToggle}
        onOpenChange={(o) => !o && setReminderToToggle(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {reminderToToggle?.done ? "¿Reactivar recordatorio?" : "¿Marcar como completado?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {reminderToToggle && (
                <>
                  <strong>{reminderToToggle.title}</strong>
                  {reminderToToggle.dueDate && (
                    <>
                      {" · "}
                      {formatDate(reminderToToggle.dueDate, "long")}
                    </>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => reminderToToggle && toggleReminder(reminderToToggle)}>
              <Check className="h-4 w-4 mr-1" />
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmación eliminar recordatorio */}
      <AlertDialog
        open={!!reminderToDelete}
        onOpenChange={(o) => !o && setReminderToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar recordatorio?</AlertDialogTitle>
            <AlertDialogDescription>
              {reminderToDelete && (
                <>
                  Se eliminará <strong>{reminderToDelete.title}</strong>. Esta acción no se puede deshacer.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => reminderToDelete && deleteReminder(reminderToDelete)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Charge confirmation */}
      <AlertDialog open={!!subscriptionToCharge} onOpenChange={(o) => !o && setSubscriptionToCharge(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Pagar cobro recurrente?</AlertDialogTitle>
            <AlertDialogDescription>
              {subscriptionToCharge && (
                <>
                  Se procesará{" "}
                  <strong>{subscriptionToCharge.name}</strong> por{" "}
                  <strong>{formatCurrency(subscriptionToCharge.amount)}</strong>.
                  <br /><br />
                  La fecha del próximo pago se adelantará automáticamente.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={charging}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCharge}
              disabled={charging}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {charging ? "Procesando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  colorClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  colorClass: string;
}) {
  return (
    <Card>
      <CardContent className="p-3 sm:p-4 flex items-center gap-3">
        <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", colorClass)}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground truncate">{label}</p>
          <p className="text-lg font-bold leading-tight">{value}</p>
          <p className="text-[11px] text-muted-foreground truncate">{sub}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("h-2 w-2 rounded-full", color)} />
      <span>{label}</span>
    </div>
  );
}

function EventRow({
  event,
  icon,
  onToggleReminder,
  onDeleteReminder,
  reminderDone,
  onCharge,
}: {
  event: CalendarEvent;
  icon: React.ReactNode;
  onToggleReminder?: () => void;
  onDeleteReminder?: () => void;
  reminderDone?: boolean;
  onCharge?: () => void;
}) {
  const v = eventVisual(event.kind);
  const isActivity = event.kind === "activity";

  return (
    <div
      className={cn(
        "rounded-xl border p-3 flex items-start gap-3",
        v.soft,
        "border-border"
      )}
    >
      <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", v.soft, v.text)}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{event.title}</p>
            {event.subtitle && (
              <p className="text-xs text-muted-foreground truncate">{event.subtitle}</p>
            )}
          </div>
          {event.amount !== undefined && (
            <p className={cn("text-sm font-bold shrink-0", v.text)}>
              {event.transactionType === "income" ? "+" : event.transactionType === "transfer" ? "" : ""}
              {formatCurrency(event.amount, event.currency)}
            </p>
          )}
        </div>

        {/* Detalle para actividad */}
        {isActivity && event.expenseCount && (
          <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <ArrowDownLeft className="h-3 w-3 text-red-500" />
              {event.expenseCount} {event.expenseCount === 1 ? "movimiento" : "movimientos"}
            </span>
            {event.expenseTotal !== undefined && (
              <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                Neto: {formatCurrency(Math.abs(event.expenseTotal), "MXN", { compact: true })}
              </Badge>
            )}
          </div>
        )}

        {/* Badge de estado para recordatorios */}
        {event.kind === "reminderOverdue" && (
          <Badge className="mt-1.5 text-[10px] h-5 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/10">
            <AlertCircle className="h-3 w-3 mr-0.5" /> Vencido
          </Badge>
        )}
        {event.kind === "reminderUpcoming" && reminderDone && (
          <Badge className="mt-1.5 text-[10px] h-5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10">
            <CheckCircle2 className="h-3 w-3 mr-0.5" /> Completado
          </Badge>
        )}

        {/* Acciones para recordatorios */}
        {(onToggleReminder || onDeleteReminder) && (
          <div className="mt-2 flex items-center gap-1">
            {onToggleReminder && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={onToggleReminder}
              >
                <Check className="h-3 w-3" />
                {reminderDone ? "Reactivar" : "Completar"}
              </Button>
            )}
            {onDeleteReminder && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-500/10"
                onClick={onDeleteReminder}
                aria-label="Eliminar"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}

        {/* Botón Pagar para recurrentes vencidas o que vencen hoy */}
        {onCharge && (
          <div className="mt-2">
            <Button
              size="sm"
              className={cn(
                "h-7 text-xs gap-1",
                event.transactionType === "income"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : event.transactionType === "transfer"
                  ? "bg-purple-600 hover:bg-purple-700 text-white"
                  : "bg-red-600 hover:bg-red-700 text-white"
              )}
              onClick={onCharge}
            >
              <Check className="h-3 w-3" />
              {event.transactionType === "income" ? "Abonar" : "Pagar"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <div className="grid grid-cols-7 gap-1 sm:gap-2">
      {Array.from({ length: 35 }).map((_, i) => (
        <Skeleton key={i} className="min-h-[64px] sm:min-h-[110px] rounded-lg" />
      ))}
    </div>
  );
}
