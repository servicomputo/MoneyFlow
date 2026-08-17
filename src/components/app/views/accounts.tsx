"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Star,
  Pencil,
  Trash2,
  Wallet as WalletIcon,
  Check,
  ShieldCheck,
} from "lucide-react";

import { useAccounts, mutations, type Account } from "../hooks";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ACCOUNT_TYPES,
  COLOR_NAMES,
  colorClasses,
  getCategoryIcon,
} from "@/lib/categories";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const CURRENCIES = [
  { value: "MXN", label: "Peso mexicano (MXN)" },
  { value: "USD", label: "Dólar (USD)" },
  { value: "EUR", label: "Euro (EUR)" },
];

/** Genera un gradiente (135deg) más oscuro a partir del color base de la cuenta. */
function gradientFor(color: string): string {
  const cc = colorClasses(color);
  return `linear-gradient(135deg, ${cc.hex} 0%, ${darken(cc.hex, 0.28)} 100%)`;
}

function renderIcon(
  Icon: React.ComponentType<{ className?: string }>,
  className: string
) {
  return React.createElement(Icon, { className });
}

function darken(hex: string, amount: number): string {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.floor(((num >> 16) & 255) * (1 - amount)));
  const g = Math.max(0, Math.floor(((num >> 8) & 255) * (1 - amount)));
  const b = Math.max(0, Math.floor((num & 255) * (1 - amount)));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function accountTypeMeta(type: string) {
  return ACCOUNT_TYPES.find((t) => t.value === type) ?? ACCOUNT_TYPES[0];
}

export function AccountsView() {
  const { data: accounts, isLoading } = useAccounts();
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);

  const totalBalance = React.useMemo(
    () => (accounts ?? []).reduce((s, a) => s + a.balance, 0),
    [accounts]
  );

  async function handleCreate(payload: Record<string, unknown>) {
    try {
      await mutations.createAccount(payload);
      await queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Cuenta creada con éxito");
      setOpen(false);
    } catch {
      toast.error("No se pudo crear la cuenta");
    }
  }

  if (isLoading) return <AccountsSkeleton />;

  const list = accounts ?? [];

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2 overflow-hidden border-0 text-white shadow-lg" style={{ background: "linear-gradient(135deg, var(--primary), color-mix(in oklch, var(--primary), #000 35%))" }}>
          <div className="relative p-6">
            <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10 blur-xl" />
            <div className="absolute right-10 bottom-0 h-24 w-24 rounded-full bg-white/10 blur-xl" />
            <div className="relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-50/90 font-medium">
                    Saldo total
                  </p>
                  <p className="mt-1 text-4xl font-bold tracking-tight">
                    {formatCurrency(totalBalance, "MXN")}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
                  <WalletIcon className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-5 flex items-center gap-2 text-emerald-50/90 text-sm">
                <ShieldCheck className="h-4 w-4" />
                <span>
                  {list.length}{" "}
                  {list.length === 1 ? "cuenta vinculada" : "cuentas vinculadas"}
                </span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="flex flex-col justify-between p-6">
          <div>
            <p className="text-xs text-muted-foreground">Resumen</p>
            <p className="mt-1 text-lg font-semibold">Gestión de cuentas</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Agrega tus cuentas bancarias, tarjetas, efectivo y billeteras para
              tener una visión unificada.
            </p>
          </div>
          <AddAccountDialog
            open={open}
            onOpenChange={setOpen}
            onSubmit={handleCreate}
          />
        </Card>
      </div>

      {/* Cards grid */}
      {list.length === 0 ? (
        <EmptyState onAdd={() => setOpen(true)} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((a) => (
            <AccountCard key={a.id} account={a} onRefresh={() => queryClient.invalidateQueries({ queryKey: ["accounts"] })} />
          ))}
        </div>
      )}
    </div>
  );
}

function AccountCard({ account, onRefresh }: { account: Account; onRefresh: () => void }) {
  const meta = accountTypeMeta(account.type);
  const isCredit = account.type === "credit";
  const available = isCredit
    ? (account.creditLimit ?? 0) - Math.abs(account.balance)
    : account.balance;

  return (
    <div
      className={cn(
        "group relative rounded-2xl p-5 text-white shadow-lg overflow-hidden",
        "min-h-[200px] flex flex-col justify-between transition-transform hover:-translate-y-1"
      )}
      style={{ background: gradientFor(account.color) }}
    >
      {/* Decoración */}
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      <div className="absolute -left-10 -bottom-12 h-40 w-40 rounded-full bg-black/10 blur-2xl pointer-events-none" />

      {/* Top row */}
      <div className="relative flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
            {renderIcon(getCategoryIcon(meta.icon), "h-5 w-5")}
          </div>
          <div className="min-w-0">
            <p className="font-semibold leading-tight truncate">{account.name}</p>
            <span className="inline-flex items-center gap-1 mt-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
              {meta.label}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={async () => {
              try {
                if (account.isDefault) {
                  await mutations.updateAccount(account.id, { isDefault: false });
                  toast.success("Cuenta predeterminada quitada");
                } else {
                  await mutations.updateAccount(account.id, { isDefault: true });
                  toast.success(`"${account.name}" es ahora la cuenta predeterminada`);
                }
                onRefresh();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Error al cambiar");
              }
            }}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold backdrop-blur transition-all hover:scale-105",
              account.isDefault
                ? "bg-white/25"
                : "bg-white/10 opacity-60 hover:opacity-100"
            )}
            title={account.isDefault ? "Quitar como predeterminada" : "Hacer predeterminada"}
          >
            <Star className={cn("h-3 w-3", account.isDefault && "fill-current")} />
            {account.isDefault ? "Default" : "No default"}
          </button>
          <button
            type="button"
            className="opacity-90 hover:opacity-100 rounded-md p-1 transition-opacity"
            onClick={async () => {
              const newName = prompt("Nuevo nombre de la cuenta:", account.name);
              if (newName && newName.trim() && newName !== account.name) {
                try {
                  await mutations.updateAccount(account.id, { name: newName.trim() });
                  onRefresh();
                  toast.success("Cuenta actualizada");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Error al actualizar");
                }
              }
            }}
            aria-label="Editar cuenta"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="opacity-90 hover:opacity-100 rounded-md p-1 transition-opacity"
            onClick={async () => {
              if (confirm(`¿Eliminar la cuenta "${account.name}"?\n\nLos movimientos asociados se conservarán sin cuenta.`)) {
                try {
                  await mutations.deleteAccount(account.id);
                  onRefresh();
                  toast.success("Cuenta eliminada");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Error al eliminar");
                }
              }
            }}
            aria-label="Eliminar cuenta"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Balance */}
      <div className="relative mt-4">
        <p className="text-[11px] uppercase tracking-wider text-white/80">
          {isCredit ? "Deuda actual" : "Saldo disponible"}
        </p>
        <p className="mt-0.5 text-3xl font-bold tracking-tight">
          {formatCurrency(account.balance, account.currency)}
        </p>
      </div>

      {/* Footer */}
      <div className="relative mt-4 flex items-end justify-between gap-2 text-white/90 text-xs">
        <div className="min-w-0">
          {account.bank ? (
            <p className="font-medium truncate">{account.bank}</p>
          ) : (
            <p className="opacity-80">Sin banco</p>
          )}
          {account.last4 && (
            <p className="mt-0.5 font-mono tracking-wider">
              •••• {account.last4}
            </p>
          )}
        </div>
        {isCredit && (
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-white/70">
              Crédito
            </p>
            <p className="font-medium">
              {formatCurrency(account.creditLimit ?? 0, account.currency, {
                compact: true,
              })}
            </p>
            <p className="text-[10px] text-white/80 mt-0.5">
              Disp.{" "}
              {formatCurrency(Math.max(0, available), account.currency, {
                compact: true,
              })}
            </p>
            {account.dueDay ? (
              <p className="text-[10px] text-white/80 mt-0.5">
                Pago día {account.dueDay}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function AddAccountDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (payload: Record<string, unknown>) => void;
}) {
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<string>("cash");
  const [balance, setBalance] = React.useState("");
  const [currency, setCurrency] = React.useState("MXN");
  const [color, setColor] = React.useState("emerald");
  const [bank, setBank] = React.useState("");
  const [last4, setLast4] = React.useState("");
  const [creditLimit, setCreditLimit] = React.useState("");
  const [dueDay, setDueDay] = React.useState("");
  const [isDefault, setIsDefault] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const isCredit = type === "credit";

  function reset() {
    setName("");
    setType("cash");
    setBalance("");
    setCurrency("MXN");
    setColor("emerald");
    setBank("");
    setLast4("");
    setCreditLimit("");
    setDueDay("");
    setIsDefault(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    setSubmitting(true);
    await onSubmit({
      name: name.trim(),
      type,
      balance: Number(balance || 0),
      currency,
      color,
      bank: bank.trim() || null,
      last4: last4.trim() || null,
      creditLimit: creditLimit ? Number(creditLimit) : null,
      dueDay: dueDay ? Number(dueDay) : null,
      isDefault,
    });
    setSubmitting(false);
    reset();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="mt-4 gap-2 w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Agregar cuenta
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agregar cuenta</DialogTitle>
          <DialogDescription>
            Vincula una cuenta para llevar el control total de tu dinero.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="acc-name">Nombre</Label>
            <Input
              id="acc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Tarjeta Banamex Oro"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="acc-type">Tipo</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="acc-type" className="w-full">
                  <SelectValue placeholder="Tipo de cuenta" />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <span className="flex items-center gap-2">
                        {renderIcon(getCategoryIcon(t.icon), "h-4 w-4")}
                        {t.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-currency">Moneda</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="acc-currency" className="w-full">
                  <SelectValue placeholder="Moneda" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="acc-balance">
              {isCredit ? "Deuda actual" : "Saldo inicial"}
            </Label>
            <Input
              id="acc-balance"
              type="number"
              inputMode="decimal"
              step="0.01"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_NAMES.map((c) => {
                const cc = colorClasses(c);
                const active = c === color;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center transition-transform",
                      active && "ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110"
                    )}
                    style={{ backgroundColor: cc.hex }}
                    aria-label={`Color ${c}`}
                    title={c}
                  >
                    {active && <Check className="h-4 w-4 text-white" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="acc-bank">Banco (opcional)</Label>
              <Input
                id="acc-bank"
                value={bank}
                onChange={(e) => setBank(e.target.value)}
                placeholder="Ej. BBVA"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-last4">Últimos 4 dígitos</Label>
              <Input
                id="acc-last4"
                value={last4}
                onChange={(e) =>
                  setLast4(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                placeholder="1234"
                inputMode="numeric"
                maxLength={4}
              />
            </div>
          </div>

          {isCredit && (
            <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3">
              <div className="space-y-1.5">
                <Label htmlFor="acc-limit">Límite de crédito</Label>
                <Input
                  id="acc-limit"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="acc-due">Día de pago</Label>
                <Input
                  id="acc-due"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={31}
                  value={dueDay}
                  onChange={(e) =>
                    setDueDay(e.target.value.replace(/\D/g, "").slice(0, 2))
                  }
                  placeholder="Ej. 15"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="acc-default" className="cursor-pointer">
                Cuenta predeterminada
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Se usará para nuevos gastos por defecto.
              </p>
            </div>
            <Switch
              id="acc-default"
              checked={isDefault}
              onCheckedChange={setIsDefault}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Guardando…" : "Guardar cuenta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 border-2 border-dashed rounded-2xl">
      <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
        <WalletIcon className="h-7 w-7 text-primary" />
      </div>
      <p className="mt-4 font-semibold">Aún no tienes cuentas</p>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">
        Empieza vinculando tu efectivo, tarjetas o cuentas bancarias para ver
        todo tu dinero en un solo lugar.
      </p>
      <Button className="mt-4 gap-2" onClick={onAdd}>
        <Plus className="h-4 w-4" /> Agregar mi primera cuenta
      </Button>
    </div>
  );
}

function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card text-card-foreground shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

function AccountsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="md:col-span-2 h-40 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-[200px] rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
