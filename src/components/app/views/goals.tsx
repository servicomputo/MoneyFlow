"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { CategoryIcon } from "../category-icon";
import { useGoals, mutations, type SavingsGoal } from "../hooks";
import {
  getCategoryIcon,
  colorClasses,
  COLOR_NAMES,
  CATEGORY_ICONS,
} from "@/lib/categories";
import { formatCurrency, formatDate } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Target,
  Plus,
  Pencil,
  Trash2,
  Trophy,
  Calendar,
  Loader2,
  PiggyBank,
  Check,
  Minus,
} from "lucide-react";

const ICON_CHOICES = Object.keys(CATEGORY_ICONS).slice(0, 18);

export function GoalsView() {
  const qc = useQueryClient();
  const { data: goals, isLoading } = useGoals();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SavingsGoal | null>(null);
  const [addFundsGoal, setAddFundsGoal] = useState<SavingsGoal | null>(null);
  const [deleteGoal, setDeleteGoal] = useState<SavingsGoal | null>(null);

  if (isLoading) return <GoalsSkeleton />;

  const list = goals ?? [];
  const totalSaved = list.reduce((s, g) => s + g.current, 0);
  const totalTarget = list.reduce((s, g) => s + g.target, 0);
  const overallPct =
    totalTarget > 0 ? Math.min(100, (totalSaved / totalTarget) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Header + Nueva meta */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Metas de Ahorro
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Visualiza tu progreso y mantén el rumbo
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
          size="sm"
          className="shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nueva meta</span>
        </Button>
      </div>

      {/* Summary */}
      <Card className="border-0 text-white shadow-xl" style={{ background: "linear-gradient(135deg, var(--primary), color-mix(in oklch, var(--primary), #000 35%))" }}>
        <CardContent className="p-5 relative overflow-hidden">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
          <div className="absolute -right-4 -bottom-10 h-24 w-24 rounded-full bg-white/5" />
          <div className="relative grid sm:grid-cols-3 gap-4 items-center">
            <div>
              <p className="text-emerald-50/80 text-xs font-medium flex items-center gap-1.5">
                <PiggyBank className="h-3.5 w-3.5" /> Total ahorrado
              </p>
              <p className="text-3xl font-bold tracking-tight mt-1">
                {formatCurrency(totalSaved)}
              </p>
              <p className="text-xs text-emerald-50/70 mt-0.5">
                de {formatCurrency(totalTarget)} objetivo
              </p>
            </div>
            <div className="flex flex-col items-center justify-center">
              <div className="relative">
                <CircularProgress
                  percentage={overallPct}
                  size={104}
                  stroke={10}
                  color="#ffffff"
                  trackColor="rgba(255,255,255,0.2)"
                  labelClassName="text-white"
                />
              </div>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-emerald-50/80">Metas activas</span>
                <span className="font-semibold">{list.length}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-emerald-50/80">Completadas</span>
                <span className="font-semibold">
                  {list.filter((g) => g.current >= g.target && g.target > 0).length}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-emerald-50/80">Por ahorrar</span>
                <span className="font-semibold">
                  {formatCurrency(Math.max(0, totalTarget - totalSaved), "MXN", {
                    compact: true,
                  })}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid of goals */}
      {list.length === 0 ? (
        <EmptyGoals
          onCreate={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              onAddFunds={() => setAddFundsGoal(g)}
              onEdit={() => {
                setEditing(g);
                setDialogOpen(true);
              }}
              onDelete={() => setDeleteGoal(g)}
            />
          ))}
        </div>
      )}

      {/* Create / Edit dialog */}
      <GoalDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSaved={() => {
          setDialogOpen(false);
          qc.invalidateQueries({ queryKey: ["goals"] });
        }}
      />

      {/* Add funds dialog */}
      <AddFundsDialog
        goal={addFundsGoal}
        onOpenChange={(o) => !o && setAddFundsGoal(null)}
        onSaved={() => {
          setAddFundsGoal(null);
          qc.invalidateQueries({ queryKey: ["goals"] });
        }}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteGoal}
        onOpenChange={(o) => !o && setDeleteGoal(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar meta?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará <strong>{deleteGoal?.name}</strong> y todo su progreso.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={async () => {
                if (!deleteGoal) return;
                try {
                  await mutations.deleteGoal(deleteGoal.id);
                  toast.success("Meta eliminada");
                  qc.invalidateQueries({ queryKey: ["goals"] });
                } catch {
                  toast.error("No se pudo eliminar la meta");
                } finally {
                  setDeleteGoal(null);
                }
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function GoalCard({
  goal,
  onAddFunds,
  onEdit,
  onDelete,
}: {
  goal: SavingsGoal;
  onAddFunds: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const cc = colorClasses(goal.color);
  const pct =
    goal.target > 0 ? Math.min(100, (goal.current / goal.target) * 100) : 0;
  const isComplete = goal.current >= goal.target && goal.target > 0;
  const remaining = Math.max(0, goal.target - goal.current);

  return (
    <Card className="overflow-hidden group transition-all hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <CircularProgress
            percentage={pct}
            size={92}
            stroke={9}
            color={cc.hex}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <CategoryIcon icon={goal.icon} color={goal.color} size="sm" />
              <h3 className="font-semibold truncate">{goal.name}</h3>
            </div>
            <div className="mt-1.5">
              <p className="text-xl font-bold">
                {formatCurrency(goal.current)}
                <span className="text-xs font-normal text-muted-foreground">
                  {" "}
                  / {formatCurrency(goal.target)}
                </span>
              </p>
              {!isComplete ? (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Faltan {formatCurrency(remaining, "MXN", { compact: true })}
                </p>
              ) : (
                <Badge className="mt-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10">
                  <Trophy className="h-3 w-3 mr-1" />
                  ¡Meta alcanzada! 🎉
                </Badge>
              )}
            </div>
            {goal.deadline && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(goal.deadline, "short")} ·{" "}
                {formatDate(goal.deadline, "relative")}
              </p>
            )}
            <Progress
              value={pct}
              className={cn("mt-2 h-1.5", cc.text)}
            />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button size="sm" className="flex-1 h-8" onClick={onAddFunds}>
            <Plus className="h-3.5 w-3.5" />
            Agregar fondos
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={onEdit}
            aria-label="Editar meta"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-500/10"
            onClick={onDelete}
            aria-label="Eliminar meta"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CircularProgress({
  percentage,
  size = 96,
  stroke = 8,
  color = "#10b981",
  trackColor,
  labelClassName,
}: {
  percentage: number;
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  labelClassName?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (percentage / 100) * c;
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        style={{ transform: "rotate(-90deg)" }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={trackColor || "currentColor"}
          strokeWidth={stroke}
          fill="none"
          className={trackColor ? "" : "text-muted/30"}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={cn(
            "text-sm font-bold",
            labelClassName || "text-foreground"
          )}
        >
          {percentage.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

function GoalDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: SavingsGoal | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [current, setCurrent] = useState("");
  const [deadline, setDeadline] = useState("");
  const [color, setColor] = useState("emerald");
  const [icon, setIcon] = useState("Target");
  const [saving, setSaving] = useState(false);

  // Initialize fields when dialog opens
  useInitFields(open, editing, {
    setName,
    setTarget,
    setCurrent,
    setDeadline,
    setColor,
    setIcon,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !target) {
      toast.error("Completa nombre y objetivo");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        target: Number(target),
        current: Number(current || 0),
        deadline: deadline || null,
        color,
        icon,
      };
      if (editing) {
        await mutations.updateGoal(editing.id, payload);
      } else {
        await mutations.createGoal(payload);
      }
      toast.success(editing ? "Meta actualizada" : "Meta creada");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Editar meta" : "Nueva meta de ahorro"}
          </DialogTitle>
          <DialogDescription>
            Define un objetivo claro para mantenerte motivado.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="goal-name">Nombre</Label>
            <Input
              id="goal-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Viaje a Japón"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="goal-target">Objetivo</Label>
              <Input
                id="goal-target"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="10000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-current">Ahorrado (opcional)</Label>
              <Input
                id="goal-current"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="goal-deadline">Fecha límite</Label>
            <Input
              id="goal-deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_NAMES.map((c) => {
                const ccl = colorClasses(c);
                const active = color === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      "h-8 w-8 rounded-full transition-all",
                      ccl.bg,
                      active
                        ? "ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110"
                        : "hover:scale-105"
                    )}
                    aria-label={`Color ${c}`}
                  />
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Icono</Label>
            <div className="grid grid-cols-9 gap-1.5">
              {ICON_CHOICES.map((ic) => {
                const Icon = getCategoryIcon(ic);
                const active = icon === ic;
                return (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setIcon(ic)}
                    className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center transition-all",
                      active
                        ? "bg-primary text-primary-foreground ring-2 ring-primary"
                        : "bg-muted hover:bg-muted/70"
                    )}
                    aria-label={`Icono ${ic}`}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {editing ? "Guardar" : "Crear meta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Hook to initialize fields when dialog opens
function useInitFields(
  open: boolean,
  editing: SavingsGoal | null,
  setters: {
    setName: (v: string) => void;
    setTarget: (v: string) => void;
    setCurrent: (v: string) => void;
    setDeadline: (v: string) => void;
    setColor: (v: string) => void;
    setIcon: (v: string) => void;
  }
) {
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setters.setName(editing.name);
      setters.setTarget(String(editing.target));
      setters.setCurrent(String(editing.current));
      setters.setDeadline(
        editing.deadline ? editing.deadline.slice(0, 10) : ""
      );
      setters.setColor(editing.color);
      setters.setIcon(editing.icon);
    } else {
      setters.setName("");
      setters.setTarget("");
      setters.setCurrent("");
      setters.setDeadline("");
      setters.setColor("emerald");
      setters.setIcon("Target");
    }
  }, [open, editing]);
}

function AddFundsDialog({
  goal,
  onOpenChange,
  onSaved,
}: {
  goal: SavingsGoal | null;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (goal) setAmount("");
  }, [goal]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!goal || !amount) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value === 0) {
      toast.error("Ingresa un monto válido");
      return;
    }
    setSaving(true);
    try {
      const newCurrent = Math.max(0, goal.current + value);
      await mutations.updateGoal(goal.id, { current: newCurrent });
      const wasComplete = goal.current >= goal.target;
      const isNowComplete = newCurrent >= goal.target;
      if (!wasComplete && isNowComplete) {
        toast.success("¡Felicidades! Has alcanzado tu meta 🎉");
      } else if (value > 0) {
        toast.success(`Agregaste ${formatCurrency(value)}`);
      } else {
        toast.success(`Retiraste ${formatCurrency(Math.abs(value))}`);
      }
      onSaved();
    } catch {
      toast.error("No se pudo actualizar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!goal} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar movimiento</DialogTitle>
          <DialogDescription>
            {goal?.name} · Ahorrado: {goal ? formatCurrency(goal.current) : ""}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="add-amount">Monto (positivo para agregar, negativo para retirar)</Label>
            <Input
              id="add-amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="500"
              autoFocus
            />
            {goal && amount && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Check className="h-3 w-3 text-emerald-500" />
                Nuevo total:{" "}
                <strong className="text-foreground">
                  {formatCurrency(goal.current + Number(amount))}
                </strong>
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {[100, 500, 1000].map((v) => (
              <Button
                key={v}
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setAmount(String(v))}
              >
                ${v}
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !amount}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Agregar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EmptyGoals({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-12 flex flex-col items-center text-center">
        <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
          <Target className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h3 className="font-semibold">Aún no tienes metas</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          Crea tu primera meta de ahorro y visualiza tu progreso hacia ella.
        </p>
        <Button onClick={onCreate} className="mt-4">
          <Plus className="h-4 w-4" />
          Crear primera meta
        </Button>
      </CardContent>
    </Card>
  );
}

function GoalsSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-9 w-28" />
      </div>
      <Skeleton className="h-40 rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
