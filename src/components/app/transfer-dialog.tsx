"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { BottomSheet, SheetOption } from "./bottom-sheet";
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
  X,
  ChevronRight,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { AmountInput } from "./amount-input";

const PERIODS = [
  { value: "weekly", label: "Semanal" },
  { value: "biweekly", label: "Quincenal" },
  { value: "monthly", label: "Mensual" },
  { value: "yearly", label: "Anual" },
] as const;

function advanceDate(date: Date, period: string): Date {
  const d = new Date(date);
  if (period === "yearly") {
    d.setFullYear(d.getFullYear() + 1);
  } else if (period === "weekly") {
    d.setDate(d.getDate() + 7);
  } else if (period === "biweekly") {
    d.setDate(d.getDate() + 15);
  } else {
    d.setMonth(d.getMonth() + 1);
  }
  return d;
}

// Fila de formulario estilo mobile-first
function FieldRow({
  icon,
  label,
  children,
  divider = true,
  selectedValue,
  placeholder,
  onClick,
  rightIcon,
}: {
  icon: React.ReactNode;
  label: string;
  children?: React.ReactNode;
  divider?: boolean;
  selectedValue?: string;
  placeholder?: string;
  onClick?: () => void;
  rightIcon?: React.ReactNode;
}) {
  const content = (
    <>
      <div className="h-9 w-9 rounded-lg bg-muted/60 flex items-center justify-center shrink-0 text-muted-foreground">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        {children ? (
          <div className="mt-0.5">{children}</div>
        ) : (
          <p className={cn(
            "text-base truncate mt-0.5",
            !selectedValue && "text-muted-foreground/60"
          )}>
            {selectedValue || placeholder || "Selecciona"}
          </p>
        )}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "w-full flex items-center gap-3 py-3.5 text-left transition-colors hover:bg-accent/40 px-2 -mx-2 rounded-lg",
          divider && "border-b border-border/60"
        )}
      >
        {content}
        {rightIcon !== null && (rightIcon || <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />)}
      </button>
    );
  }

  return (
    <div className={cn(
      "flex items-start gap-3 py-3 px-2 -mx-2 rounded-lg",
      divider && "border-b border-border/60"
    )}>
      {content}
    </div>
  );
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

  // Selectores con BottomSheet
  const [fromAccountSheetOpen, setFromAccountSheetOpen] = useState(false);
  const [toAccountSheetOpen, setToAccountSheetOpen] = useState(false);
  const [dateSheetOpen, setDateSheetOpen] = useState(false);

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
      const expenseCategories = categories?.filter((c) => c.type === "expense") || [];
      const incomeCategories = categories?.filter((c) => c.type === "income") || [];
      const transferCat =
        expenseCategories.find((c) => c.name === "Transferencia") ||
        expenseCategories.find((c) => c.name === "Otros") ||
        expenseCategories[0];
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

  const saveDisabled = !amount || parseFloat(amount) <= 0 || !fromAccountId || !toAccountId || fromAccountId === toAccountId || saving;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[440px] max-h-[100vh] sm:max-h-[92vh] h-full sm:h-auto overflow-y-auto scrollbar-thin gap-0 p-0 sm:rounded-2xl rounded-none">
          {/* Header compacto */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-purple-500/5 flex items-center justify-center">
                <ArrowLeftRight className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <h2 className="text-base font-semibold">Transferencia</h2>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setAddType(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Contenido scrolleable */}
          <div className="flex-1 overflow-y-auto scrollbar-thin pb-24">
            {/* Importe HERO grande */}
            <div className="px-6 py-8 text-center bg-purple-500/5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Monto a transferir
              </p>
              <div className="flex items-center justify-center gap-1 mt-2">
                <span className="text-3xl font-bold text-purple-600 dark:text-purple-400">$</span>
                <AmountInput
                  value={amount}
                  onValueChange={setAmount}
                  placeholder="0.00"
                  className="border-0 bg-transparent text-4xl font-bold text-center h-auto p-0 w-44 focus-visible:ring-0 focus-visible:ring-offset-0 text-purple-600 dark:text-purple-400"
                  autoFocus
                />
              </div>
            </div>

            {/* Formulario en columna única */}
            <div className="px-4 py-2 space-y-0">
              {/* De cuenta */}
              <FieldRow
                icon={<ArrowRight className="h-4 w-4 rotate-180 text-red-500" />}
                label="De cuenta"
                onClick={() => setFromAccountSheetOpen(true)}
                selectedValue={fromAccount ? `${fromAccount.name} · ${formatCurrency(fromAccount.balance, "MXN", { compact: true })}` : undefined}
                placeholder="Cuenta de origen"
              />

              {/* Botón intercambiar */}
              <div className="flex justify-center py-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={swapAccounts}
                  className="h-8 w-8 rounded-full bg-background border-2 shadow-sm"
                  title="Intercambiar cuentas"
                >
                  <ArrowRight className="h-3.5 w-3.5 rotate-90" />
                </Button>
              </div>

              {/* A cuenta */}
              <FieldRow
                icon={<ArrowRight className="h-4 w-4 text-emerald-500" />}
                label="A cuenta"
                onClick={() => setToAccountSheetOpen(true)}
                selectedValue={toAccount ? `${toAccount.name} · ${formatCurrency(toAccount.balance, "MXN", { compact: true })}` : undefined}
                placeholder="Cuenta de destino"
              />

              {/* Validación visual de cuentas iguales */}
              {fromAccountId && toAccountId && fromAccountId === toAccountId && (
                <p className="text-xs text-red-600 dark:text-red-400 px-2 pb-2">
                  Las cuentas deben ser diferentes.
                </p>
              )}

              {/* Fecha */}
              <FieldRow
                icon={<CalIcon className="h-4 w-4" />}
                label="Fecha"
                onClick={() => setDateSheetOpen(true)}
                selectedValue={date.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
              />

              {/* Concepto */}
              <FieldRow icon={<Wallet className="h-4 w-4" />} label="Concepto">
                <Input
                  placeholder="Ej. Pago de tarjeta, ahorro mensual..."
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  className="border-0 px-0 h-auto py-0 text-base focus-visible:ring-0 bg-transparent"
                />
              </FieldRow>

              {/* ¿Es recurrente? */}
              <div className={cn(
                "mt-2 rounded-xl border p-3 flex items-center justify-between gap-3",
                recurrente && "border-purple-500/30 bg-purple-500/5"
              )}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <Repeat className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight">¿Es recurrente?</p>
                    <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                      Repite esta transferencia
                    </p>
                  </div>
                </div>
                <Switch checked={recurrente} onCheckedChange={setRecurrente} aria-label="¿Es recurrente?" />
              </div>

              {recurrente && (
                <div className="rounded-xl border bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Periodicidad</span>
                    <Select value={periodicidad} onValueChange={setPeriodicidad}>
                      <SelectTrigger className="h-8 w-32 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PERIODS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Próxima transferencia: {advanceDate(date, periodicidad).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                </div>
              )}

              {/* Resumen visual */}
              {fromAccount && toAccount && (
                <div className="rounded-xl border bg-card p-3 mt-2">
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
            </div>
          </div>

          {/* Footer sticky con botón Transferir */}
          <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t p-4">
            <Button
              onClick={handleSave}
              disabled={saveDisabled}
              className="w-full h-12 gap-2 text-base font-semibold bg-purple-600 hover:bg-purple-700 text-white"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-5 w-5" />}
              Transferir
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ====== BottomSheets para selectores ====== */}

      {/* Cuenta origen */}
      <BottomSheet
        open={fromAccountSheetOpen}
        onOpenChange={setFromAccountSheetOpen}
        title="Cuenta de origen"
      >
        <div className="space-y-1">
          {accounts?.map((a) => (
            <SheetOption
              key={a.id}
              icon={<Wallet className="h-4 w-4" />}
              label={a.name}
              sublabel={formatCurrency(a.balance)}
              selected={fromAccountId === a.id}
              onClick={() => {
                setFromAccountId(a.id);
                setFromAccountSheetOpen(false);
              }}
            />
          ))}
        </div>
      </BottomSheet>

      {/* Cuenta destino */}
      <BottomSheet
        open={toAccountSheetOpen}
        onOpenChange={setToAccountSheetOpen}
        title="Cuenta de destino"
      >
        <div className="space-y-1">
          {accounts?.map((a) => (
            <SheetOption
              key={a.id}
              icon={<Wallet className="h-4 w-4" />}
              label={a.name}
              sublabel={formatCurrency(a.balance)}
              selected={toAccountId === a.id}
              onClick={() => {
                setToAccountId(a.id);
                setToAccountSheetOpen(false);
              }}
            />
          ))}
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
            selected={date}
            onSelect={(d) => {
              if (d) {
                setDate(d);
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
