"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useReminders, mutations, type Reminder } from "../hooks";
import {
  ModalContainer,
  BottomSheet,
  SheetOption,
  FieldRow,
  ModalHeader,
  ModalFooter,
} from "../bottom-sheet";
import { Calendar } from "@/components/ui/calendar";
import { useViewAddHandler } from "../use-view-add-handler";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Bell,
  Trash2,
  Plus,
  CreditCard,
  Zap,
  Wallet,
  Calendar as CalIcon,
  Clock,
  CheckCircle2,
  ListChecks,
  Layers,
  FileText,
} from "lucide-react";

type ReminderType = "pay_card" | "pay_service" | "register_cash" | "register";

const TYPE_META: Record<
  ReminderType,
  { label: string; icon: typeof CreditCard; badgeClass: string }
> = {
  pay_card: {
    label: "Pagar tarjeta",
    icon: CreditCard,
    badgeClass:
      "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  },
  pay_service: {
    label: "Pagar servicio",
    icon: Zap,
    badgeClass:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  register_cash: {
    label: "Registrar efectivo",
    icon: Wallet,
    badgeClass:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  register: {
    label: "Registrar gasto",
    icon: Plus,
    badgeClass:
      "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
  },
};

function isOverdue(dueDate: string, done: boolean) {
  if (done) return false;
  return new Date(dueDate).getTime() < Date.now();
}

export function RemindersView() {
  const qc = useQueryClient();
  const { data: reminders, isLoading } = useReminders();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteReminder, setDeleteReminder] = useState<Reminder | null>(null);

  // Botón "+" contextual: abre el diálogo de crear recordatorio
  useViewAddHandler(() => setDialogOpen(true));

  if (isLoading) return <RemindersSkeleton />;

  const list = reminders ?? [];
  const pending = list.filter((r) => !r.done);
  const completed = list.filter((r) => r.done);
  const overdueCount = pending.filter((r) =>
    isOverdue(r.dueDate, r.done)
  ).length;

  async function toggleDone(r: Reminder, done: boolean) {
    // Optimistic update via invalidate after
    try {
      await mutations.updateReminder(r.id, { done });
      qc.invalidateQueries({ queryKey: ["reminders"] });
    } catch {
      toast.error("No se pudo actualizar el recordatorio");
    }
  }

  async function handleDelete(r: Reminder) {
    try {
      await mutations.deleteReminder(r.id);
      toast.success("Recordatorio eliminado");
      qc.invalidateQueries({ queryKey: ["reminders"] });
    } catch {
      toast.error("No se pudo eliminar");
    } finally {
      setDeleteReminder(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Recordatorios
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {pending.length} pendiente{pending.length === 1 ? "" : "s"}
            {overdueCount > 0 && (
              <span className="text-red-600 dark:text-red-400 font-medium">
                {" "}
                · {overdueCount} vencido{overdueCount === 1 ? "" : "s"}
              </span>
            )}
          </p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          size="sm"
          className="shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Agregar recordatorio</span>
        </Button>
      </div>

      {list.length === 0 ? (
        <EmptyReminders onCreate={() => setDialogOpen(true)} />
      ) : (
        <>
          {/* Pendientes */}
          <RemindersSection
            title="Pendientes"
            icon={<Clock className="h-4 w-4" />}
            count={pending.length}
          >
            {pending.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                No hay recordatorios pendientes 🎉
              </div>
            ) : (
              <div className="space-y-2">
                {pending.map((r) => (
                  <ReminderRow
                    key={r.id}
                    reminder={r}
                    onToggle={(done) => toggleDone(r, done)}
                    onDelete={() => setDeleteReminder(r)}
                  />
                ))}
              </div>
            )}
          </RemindersSection>

          {/* Completados */}
          {completed.length > 0 && (
            <RemindersSection
              title="Completados"
              icon={<CheckCircle2 className="h-4 w-4" />}
              count={completed.length}
              muted
            >
              <div className="space-y-2">
                {completed.map((r) => (
                  <ReminderRow
                    key={r.id}
                    reminder={r}
                    onToggle={(done) => toggleDone(r, done)}
                    onDelete={() => setDeleteReminder(r)}
                  />
                ))}
              </div>
            </RemindersSection>
          )}
        </>
      )}

      {/* Create dialog */}
      <ReminderDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={() => {
          setDialogOpen(false);
          qc.invalidateQueries({ queryKey: ["reminders"] });
        }}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteReminder}
        onOpenChange={(o) => !o && setDeleteReminder(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar recordatorio?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará <strong>{deleteReminder?.title}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteReminder && handleDelete(deleteReminder)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RemindersSection({
  title,
  icon,
  count,
  children,
  muted,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <span
            className={cn(
              "flex items-center gap-1.5 text-sm font-semibold",
              muted && "text-muted-foreground"
            )}
          >
            {icon}
            {title}
          </span>
          <Badge variant="secondary" className="text-xs h-5">
            {count}
          </Badge>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function ReminderRow({
  reminder,
  onToggle,
  onDelete,
}: {
  reminder: Reminder;
  onToggle: (done: boolean) => void;
  onDelete: () => void;
}) {
  const type = (TYPE_META[reminder.type as ReminderType] ||
    TYPE_META.register) as (typeof TYPE_META)[ReminderType];
  const TypeIcon = type.icon;
  const overdue = isOverdue(reminder.dueDate, reminder.done);

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border p-3 transition-colors",
        reminder.done
          ? "bg-muted/40 border-transparent"
          : overdue
            ? "bg-red-500/5 border-red-500/20"
            : "bg-background hover:bg-accent/50 border-border"
      )}
    >
      <Checkbox
        checked={reminder.done}
        onCheckedChange={(v) => onToggle(!!v)}
        className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p
            className={cn(
              "text-sm font-medium truncate",
              reminder.done && "line-through text-muted-foreground"
            )}
          >
            {reminder.title}
          </p>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] h-5 px-1.5 gap-1 shrink-0",
              reminder.done ? "text-muted-foreground" : type.badgeClass
            )}
          >
            <TypeIcon className="h-3 w-3" />
            {type.label}
          </Badge>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span
            className={cn(
              "text-xs flex items-center gap-1",
              overdue
                ? "text-red-600 dark:text-red-400 font-medium"
                : "text-muted-foreground"
            )}
          >
            <CalIcon className="h-3 w-3" />
            {formatDate(reminder.dueDate, "short")} ·{" "}
            {formatDate(reminder.dueDate, "relative")}
            {overdue && " · Vencido"}
          </span>
        </div>
        {reminder.notes && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {reminder.notes}
          </p>
        )}
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-500/10 shrink-0"
        onClick={onDelete}
        aria-label="Eliminar recordatorio"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function ReminderDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ReminderType>("pay_card");
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Selectores con BottomSheet (evita empalme de scrolls)
  const [typeSheetOpen, setTypeSheetOpen] = useState(false);
  const [dateSheetOpen, setDateSheetOpen] = useState(false);

  async function handleSubmit() {
    if (!title.trim() || !dueDate) {
      toast.error("Completa título y fecha");
      return;
    }
    setSaving(true);
    try {
      await mutations.createReminder({
        title: title.trim(),
        type,
        dueDate,
        notes: notes.trim() || null,
      });
      toast.success("Recordatorio creado");
      onSaved();
      // reset
      setTitle("");
      setType("pay_card");
      setNotes("");
      const d = new Date();
      d.setDate(d.getDate() + 3);
      setDueDate(d.toISOString().slice(0, 10));
    } catch {
      toast.error("No se pudo crear el recordatorio");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <ModalContainer open={open} onOpenChange={onOpenChange}>
        <ModalHeader
          icon={<Bell className="h-4 w-4" />}
          title="Nuevo recordatorio"
          onClose={() => onOpenChange(false)}
        />

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-2">
          {/* Título */}
          <FieldRow icon={<Bell className="h-4 w-4" />} label="Título">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Pagar tarjeta de crédito"
              autoFocus
              className="border-0 px-0 h-auto py-0 text-base focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
            />
          </FieldRow>

          {/* Tipo */}
          <FieldRow
            icon={<Layers className="h-4 w-4" />}
            label="Tipo"
            onClick={() => setTypeSheetOpen(true)}
            selectedValue={TYPE_META[type].label}
          />

          {/* Fecha límite */}
          <FieldRow
            icon={<CalIcon className="h-4 w-4" />}
            label="Fecha límite"
            onClick={() => setDateSheetOpen(true)}
            selectedValue={formatDate(dueDate, "short")}
          />

          {/* Notas */}
          <FieldRow
            icon={<FileText className="h-4 w-4" />}
            label="Notas (opcional)"
            divider={false}
          >
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalles adicionales..."
              rows={3}
              className="border-0 px-0 text-base focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent resize-none"
            />
          </FieldRow>
        </div>

        <ModalFooter
          onCancel={() => onOpenChange(false)}
          onSave={handleSubmit}
          saveLabel="Crear recordatorio"
          saveDisabled={!title.trim()}
          saving={saving}
        />
      </ModalContainer>

      {/* ====== BottomSheets para selectores (aislados, sin empalme de scroll) ====== */}

      {/* Tipo */}
      <BottomSheet
        open={typeSheetOpen}
        onOpenChange={setTypeSheetOpen}
        title="Selecciona tipo"
      >
        <div className="space-y-1">
          {(Object.keys(TYPE_META) as ReminderType[]).map((t) => {
            const M = TYPE_META[t];
            const Icon = M.icon;
            return (
              <SheetOption
                key={t}
                icon={<Icon className="h-4 w-4" />}
                label={M.label}
                selected={type === t}
                onClick={() => {
                  setType(t);
                  setTypeSheetOpen(false);
                }}
              />
            );
          })}
        </div>
      </BottomSheet>

      {/* Fecha */}
      <BottomSheet
        open={dateSheetOpen}
        onOpenChange={setDateSheetOpen}
        title="Selecciona fecha"
        maxWidth="sm:max-w-sm"
      >
        <div className="flex justify-center">
          <Calendar
            mode="single"
            selected={dueDate ? new Date(dueDate + "T00:00:00") : undefined}
            onSelect={(d) => {
              if (d) {
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, "0");
                const dd = String(d.getDate()).padStart(2, "0");
                setDueDate(`${yyyy}-${mm}-${dd}`);
                setDateSheetOpen(false);
              }
            }}
            initialFocus
          />
        </div>
      </BottomSheet>
    </>
  );
}

function EmptyReminders({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-12 flex flex-col items-center text-center">
        <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
          <ListChecks className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h3 className="font-semibold">Sin recordatorios</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          Crea recordatorios para pagar tarjetas, registrar efectivo o no
          olvidar ningún pendiente financiero.
        </p>
        <Button onClick={onCreate} className="mt-4">
          <Plus className="h-4 w-4" />
          Crear recordatorio
        </Button>
      </CardContent>
    </Card>
  );
}

function RemindersSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-44" />
        <Skeleton className="h-9 w-32" />
      </div>
      <Skeleton className="h-48 rounded-xl" />
      <Skeleton className="h-32 rounded-xl" />
    </div>
  );
}
