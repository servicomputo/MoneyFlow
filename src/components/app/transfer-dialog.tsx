"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useAppStore } from "@/lib/store";
import { useCategories, useAccounts, mutations } from "./hooks";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";
import {
  Calendar as CalIcon,
  Check,
  Loader2,
  ArrowLeftRight,
  ArrowRight,
  Repeat,
  Wallet,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const PERIODS = [
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensual" },
  { value: "yearly", label: "Anual" },
] as const;

function advanceDate(date: Date, period: string): Date {
  const d = new Date(date);
  if (period === "yearly") {
    d.setFullYear(d.getFullYear() + 1);
  } else if (period === "weekly") {
    d.setDate(d.getDate() + 7);
  } else {
    d.setMonth(d.getMonth() + 1);
  }
  return d;
}

export function TransferDialog() {
  const { addType, setAddType } = useAppStore();
  const qc = useQueryClient();
  const { data: categories } = useCategories();
  const { data: accounts } = useAccounts();

  const open = addType === "transfer";

  const [amount, setAmount] = useState("");
  const [fromAccountId, setFromAccountId] = useState<string>("");
  const [toAccountId, setToAccountId] = useState<string>("");
  const [date, setDate] = useState<Date>(new Date());
  const [concept, setConcept] = useState("");
  const [recurrente, setRecurrente] = useState(false);
  const [periodicidad, setPeriodicidad] = useState<string>("monthly");
  const [saving, setSaving] = useState(false);

  // Reset al abrir
  useEffect(() => {
    if (open) {
      setAmount("");
      setFromAccountId(accounts?.find((a) => a.isDefault)?.id || "");
      setToAccountId(
        accounts?.find((a) => !a.isDefault)?.id ||
        accounts?.[0]?.id ||
        ""
      );
      setDate(new Date());
      setConcept("");
      setRecurrente(false);
      setPeriodicidad("monthly");
    }
  }, [open, accounts]);

  const fromAccount = accounts?.find((a) => a.id === fromAccountId);
  const toAccount = accounts?.find((a) => a.id === toAccountId);

  function swapAccounts() {
    setFromAccountId(toAccountId);
    setToAccountId(fromAccountId);
  }

  async function handleSave() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast.error("Ingresa un importe válido");
      return;
    }
    if (!fromAccountId) {
      toast.error("Selecciona la cuenta de origen");
      return;
    }
    if (!toAccountId) {
      toast.error("Selecciona la cuenta de destino");
      return;
    }
    if (fromAccountId === toAccountId) {
      toast.error("Selecciona cuentas diferentes");
      return;
    }

    setSaving(true);
    try {
      // Buscar categoría "Transferencia" o "Otros" para el egreso
      const expenseCategories = categories?.filter((c) => c.type === "expense") || [];
      const transferCat =
        expenseCategories.find((c) => c.name === "Transferencia") ||
        expenseCategories.find((c) => c.name === "Otros") ||
        expenseCategories[0];
      const incomeCategories = categories?.filter((c) => c.type === "income") || [];
      const incomeTransferCat =
        incomeCategories.find((c) => c.name === "Transferencia") ||
        incomeCategories.find((c) => c.name === "Otros ingresos") ||
        incomeCategories.find((c) => c.name === "Otros") ||
        incomeCategories[0];

      if (!transferCat) {
        toast.error("No hay categorías de gasto disponibles");
        setSaving(false);
        return;
      }
      if (!incomeTransferCat) {
        toast.error("No hay categorías de ingreso disponibles");
        setSaving(false);
        return;
      }

      const conceptText = concept.trim() || `Transferencia ${fromAccount?.name} → ${toAccount?.name}`;

      // 1. Crear gasto (egreso) desde la cuenta origen
      await mutations.createExpense({
        amount: amt,
        type: "expense",
        date: date.toISOString(),
        categoryId: transferCat?.id || "",
        merchantName: conceptText,
        paymentMethod: "transfer",
        accountId: fromAccountId,
        notes: `Transferencia a ${toAccount?.name || "otra cuenta"}`,
        tags: ["transferencia"],
        source: "transfer",
      });

      // 2. Crear ingreso a la cuenta destino
      await mutations.createExpense({
        amount: amt,
        type: "income",
        date: date.toISOString(),
        categoryId: incomeTransferCat?.id || "",
        merchantName: conceptText,
        paymentMethod: "transfer",
        accountId: toAccountId,
        notes: `Transferencia desde ${fromAccount?.name || "otra cuenta"}`,
        tags: ["transferencia"],
        source: "transfer",
      });

      // 3. Si es recurrente, crear Suscripción tipo "transfer"
      if (recurrente) {
        const nextDate = advanceDate(date, periodicidad);
        await mutations.createSubscription({
          name: `Transferencia: ${fromAccount?.name} → ${toAccount?.name}`,
          type: "transfer",
          merchantName: conceptText,
          amount: amt,
          currency: "MXN",
          period: periodicidad,
          nextDate: nextDate.toISOString(),
          categoryId: transferCat?.id || null,
          accountId: fromAccountId,
          active: true,
        });
      }

      toast.success("Transferencia realizada", {
        description: `${formatCurrency(amt)} · ${fromAccount?.name} → ${toAccount?.name}` +
          (recurrente ? ` · Recurrente ${PERIODS.find((p) => p.value === periodicidad)?.label.toLowerCase()}` : ""),
      });

      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      qc.invalidateQueries({ queryKey: ["subscriptions"] });

      setAddType(null);
    } catch (e) {
      console.error(e);
      toast.error("No se pudo realizar la transferencia");
    } finally {
      setSaving(false);
    }
  }

  function handleOpenChange(v: boolean) {
    if (!v) setAddType(null);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[92vh] overflow-y-auto scrollbar-thin gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            Transferencia entre cuentas
          </DialogTitle>
          <DialogDescription>
            Mueve dinero de una cuenta a otra. Se registran dos movimientos: un egreso y un ingreso.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-4">
          {/* Monto */}
          <div className="rounded-2xl p-5 text-center bg-purple-500/5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              Monto a transferir
            </Label>
            <div className="flex items-center justify-center gap-1 mt-1">
              <span className="text-3xl font-bold text-purple-600 dark:text-purple-400">$</span>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="border-0 bg-transparent text-4xl font-bold text-center h-auto p-0 w-40 focus-visible:ring-0 focus-visible:ring-offset-0 text-purple-600 dark:text-purple-400"
                autoFocus
              />
            </div>
          </div>

          {/* De cuenta / A cuenta */}
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-2 sm:gap-2 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <ArrowRight className="h-3.5 w-3.5 rotate-180 text-red-500" />
                De cuenta
              </Label>
              <Select value={fromAccountId} onValueChange={setFromAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Origen" />
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
              {fromAccount && (
                <p className="text-[11px] text-muted-foreground">
                  Saldo: {formatCurrency(fromAccount.balance)}
                </p>
              )}
            </div>

            <div className="flex justify-center pb-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={swapAccounts}
                className="h-8 w-8 rounded-full shrink-0"
                title="Intercambiar cuentas"
              >
                <ArrowRight className="h-3.5 w-3.5 sm:rotate-90" />
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <ArrowRight className="h-3.5 w-3.5 text-emerald-500" />
                A cuenta
              </Label>
              <Select value={toAccountId} onValueChange={setToAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Destino" />
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
              {toAccount && (
                <p className="text-[11px] text-muted-foreground">
                  Saldo: {formatCurrency(toAccount.balance)}
                </p>
              )}
            </div>
          </div>

          {/* Validación visual de cuentas iguales */}
          {fromAccountId && toAccountId && fromAccountId === toAccountId && (
            <p className="text-xs text-red-600 dark:text-red-400 -mt-2">
              Las cuentas de origen y destino deben ser diferentes.
            </p>
          )}

          {/* Fecha */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              <CalIcon className="h-3.5 w-3.5" /> Fecha
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  {date.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Concepto */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5" /> Concepto
            </Label>
            <Input
              placeholder="Ej. Pago de tarjeta, ahorro mensual..."
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
            />
          </div>

          {/* ¿Es recurrente? */}
          <div className="rounded-xl border bg-muted/30 p-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <Repeat className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight">¿Es recurrente?</p>
                  <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                    Repite esta transferencia automáticamente
                  </p>
                </div>
              </div>
              <Switch
                checked={recurrente}
                onCheckedChange={setRecurrente}
                aria-label="¿Es recurrente?"
              />
            </div>
            {recurrente && (
              <div className="space-y-1.5 pt-1 border-t">
                <Label className="text-xs">Periodicidad</Label>
                <Select value={periodicidad} onValueChange={setPeriodicidad}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIODS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Próxima transferencia: {advanceDate(date, periodicidad).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
              </div>
            )}
          </div>

          {/* Resumen visual */}
          {fromAccount && toAccount && (
            <div className="rounded-xl border bg-card p-3">
              <div className="flex items-center gap-2 text-xs">
                <div className="flex-1 min-w-0">
                  <p className="text-muted-foreground">Sale de</p>
                  <p className="font-medium truncate">{fromAccount.name}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0 text-right">
                  <p className="text-muted-foreground">Entra a</p>
                  <p className="font-medium truncate">{toAccount.name}</p>
                </div>
              </div>
              {amount && parseFloat(amount) > 0 && (
                <div className="mt-2 pt-2 border-t flex justify-between text-xs">
                  <span className="text-muted-foreground">Importe</span>
                  <span className="font-semibold text-purple-600 dark:text-purple-400">
                    {formatCurrency(parseFloat(amount) || 0)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Acciones */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setAddType(null)} className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 gap-2 bg-purple-600 hover:bg-purple-700 text-white"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Transferir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
