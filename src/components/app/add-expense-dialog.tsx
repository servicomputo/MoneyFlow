"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Badge } from "@/components/ui/badge";
import { CategoryIcon } from "./category-icon";
import { useAppStore } from "@/lib/store";
import { useCategories, useAccounts, mutations, type Merchant } from "./hooks";
import { dataProvider, isIaAvailable, getIaBaseUrl } from "@/lib/data-provider";
import { PAYMENT_METHODS } from "@/lib/categories";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";
import {
  Calendar as CalIcon,
  Tag,
  Sparkles,
  Check,
  X,
  Plus,
  Loader2,
  Store,
  ArrowDownLeft,
  ArrowUpRight,
  Repeat,
  CreditCard,
  Wallet,
  FileText,
  Layers,
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

// =============================================================================
// FieldRow: fila de formulario estilo mobile-first (icono + label + valor + divisor)
// =============================================================================

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
  // Si hay onClick, es un botón (selector)
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "w-full flex items-center gap-3 py-3.5 px-1 text-left transition-colors hover:bg-accent/40 -mx-1 px-4 rounded-lg",
          divider && "border-b border-border/60"
        )}
      >
        <div className="h-9 w-9 rounded-lg bg-muted/60 flex items-center justify-center shrink-0 text-muted-foreground">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className={cn(
            "text-base truncate mt-0.5",
            !selectedValue && "text-muted-foreground/60"
          )}>
            {selectedValue || placeholder || "Selecciona"}
          </p>
        </div>
        {rightIcon || <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>
    );
  }

  // Si no hay onClick, es un campo de input nativo
  return (
    <div className={cn(
      "flex items-start gap-3 py-1 px-1",
      divider && "border-b border-border/60 pb-3"
    )}>
      <div className="h-9 w-9 rounded-lg bg-muted/60 flex items-center justify-center shrink-0 text-muted-foreground mt-1">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
          {label}
        </p>
        {children}
      </div>
    </div>
  );
}

// Selector de categoría compacto (chips con icono + color)
function CategorySelector({
  categories,
  value,
  onChange,
  type,
}: {
  categories: Array<{ id: string; name: string; icon: string; color: string }>;
  value: string;
  onChange: (id: string) => void;
  type: "expense" | "income";
}) {
  const [open, setOpen] = useState(false);
  const selected = categories.find((c) => c.id === value);

  return (
    <>
      <FieldRow
        icon={<Layers className="h-4 w-4" />}
        label="Categoría"
        onClick={() => setOpen(true)}
        selectedValue={selected ? selected.name : undefined}
        placeholder="Selecciona categoría"
        rightIcon={selected ? (
          <CategoryIcon icon={selected.icon} color={selected.color} size="sm" className="h-6 w-6" />
        ) : undefined}
      />
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-background w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[80vh] overflow-y-auto scrollbar-thin p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold">Selecciona categoría</h3>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onChange(c.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all",
                    value === c.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-border hover:bg-accent/40"
                  )}
                >
                  <CategoryIcon icon={c.icon} color={c.color} size="sm" className="h-8 w-8" />
                  <span className="text-sm font-medium truncate">{c.name}</span>
                  {value === c.id && <Check className="h-4 w-4 text-primary ml-auto shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function AddExpenseDialog() {
  const { addType, setAddType } = useAppStore();
  const qc = useQueryClient();
  const { data: categories } = useCategories();
  const { data: accounts } = useAccounts();

  const open = addType === "expense" || addType === "income";
  const type: "expense" | "income" = addType === "income" ? "income" : "expense";

  const [amount, setAmount] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [categoryId, setCategoryId] = useState<string>("");
  const [subcategoryId, setSubcategoryId] = useState<string>("");
  const [merchantName, setMerchantName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [accountId, setAccountId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);

  // Recurrente
  const [recurrente, setRecurrente] = useState(false);
  const [periodicidad, setPeriodicidad] = useState<string>("monthly");

  // Selectores compactos
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [methodPickerOpen, setMethodPickerOpen] = useState(false);
  const [accountPickerOpen, setAccountPickerOpen] = useState(false);

  const filteredCategories = categories?.filter((c) => c.type === type) || [];

  // Autocompletado de comercios
  const [merchantQuery, setMerchantQuery] = useState("");
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [merchantOpen, setMerchantOpen] = useState(false);
  const [classifyLoading, setClassifyLoading] = useState(false);
  const [suggestedCategory, setSuggestedCategory] = useState<{
    categoryId: string;
    confidence: number;
    source: string;
    alternatives?: Array<{ categoryName: string; confidence: number }>;
  } | null>(null);

  useEffect(() => {
    if (open) {
      setAmount("");
      setDate(new Date());
      setCategoryId("");
      setSubcategoryId("");
      setMerchantName("");
      setPaymentMethod("");
      setAccountId(accounts?.find((a) => a.isDefault)?.id || "");
      setNotes("");
      setTags([]);
      setSuggestedCategory(null);
      setMerchantQuery("");
      setRecurrente(false);
      setPeriodicidad("monthly");
    }
  }, [open, accounts, addType]);

  useEffect(() => {
    if (!merchantQuery.trim()) {
      setMerchants([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const result = await dataProvider.listMerchants(merchantQuery);
        setMerchants(result || []);
      } catch {
        setMerchants([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [merchantQuery]);

  useEffect(() => {
    if (!merchantName.trim() || categoryId) return;
    const t = setTimeout(async () => {
      if (!isIaAvailable()) {
        try {
          const ms = await dataProvider.listMerchants(merchantName);
          const m = ms[0];
          if (m?.defaultCategory) {
            setSuggestedCategory({
              categoryId: m.defaultCategory.id,
              confidence: 0.7,
              source: "learning",
              alternatives: m.suggestedCategories?.slice(1, 3).map((s) => ({ categoryName: s.category.name, confidence: 0.5 })),
            });
          }
        } catch {}
        return;
      }
      setClassifyLoading(true);
      try {
        const iaBase = getIaBaseUrl();
        const url = iaBase ? `${iaBase}/api/classify` : "/api/classify";
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ merchantName }),
        });
        const d = await r.json();
        if (d.categoryId) {
          setSuggestedCategory({
            categoryId: d.categoryId,
            confidence: d.confidence,
            source: d.source,
            alternatives: d.alternatives,
          });
          if (d.confidence >= 0.85 && !categoryId) {
            setCategoryId(d.categoryId);
          }
        }
      } catch {} finally {
        setClassifyLoading(false);
      }
    }, 600);
    return () => clearTimeout(t);
  }, [merchantName, categoryId]);

  const selectedCategory = filteredCategories.find((c) => c.id === categoryId);
  const subcategories = selectedCategory?.subcategories || [];
  const selectedAccount = accounts?.find((a) => a.id === accountId);
  const selectedMethod = PAYMENT_METHODS.find((m) => m.value === paymentMethod);

  function addTag() {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
      setTagInput("");
    }
  }

  async function handleSave() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast.error("Ingresa un importe válido");
      return;
    }
    if (!categoryId) {
      toast.error("Selecciona una categoría");
      return;
    }
    setSaving(true);
    try {
      const source = "manual";
      await mutations.createExpense({
        amount: amt,
        type,
        date: date.toISOString(),
        categoryId,
        subcategoryId: subcategoryId || null,
        merchantName: merchantName || null,
        paymentMethod: paymentMethod || null,
        accountId: accountId || null,
        notes: notes || null,
        tags,
        source,
        isRecurring: recurrente,
        recurringName: recurrente ? (merchantName || selectedCategory?.name || null) : null,
      });

      if (recurrente) {
        const subName = merchantName || selectedCategory?.name || (type === "income" ? "Ingreso recurrente" : "Gasto recurrente");
        const subType = type === "income" ? "other" : "subscription";
        const nextDate = advanceDate(date, periodicidad);
        await mutations.createSubscription({
          name: subName,
          type: subType,
          merchantName: merchantName || null,
          amount: amt,
          currency: "MXN",
          period: periodicidad,
          nextDate: nextDate.toISOString(),
          categoryId: categoryId || null,
          accountId: accountId || null,
          active: true,
        });
      }

      toast.success(type === "income" ? "Ingreso registrado" : "Gasto registrado", {
        description: recurrente
          ? `${formatCurrency(amt)} · ${selectedCategory?.name} · Recurrente ${PERIODS.find((p) => p.value === periodicidad)?.label.toLowerCase()}`
          : `${formatCurrency(amt)} · ${selectedCategory?.name}`,
      });

      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["budgets"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      qc.invalidateQueries({ queryKey: ["subscriptions"] });
      setAddType(null);
    } catch (e) {
      console.error(e);
      toast.error("No se pudo guardar el movimiento");
    } finally {
      setSaving(false);
    }
  }

  function handleOpenChange(v: boolean) {
    if (!v) setAddType(null);
  }

  const titleText = type === "income" ? "Agregar ingreso" : "Agregar gasto";
  const saveText = type === "income" ? "Guardar ingreso" : "Guardar gasto";
  const accentColor = type === "income" ? "emerald" : "red";
  const accentTextClass =
    type === "income"
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-red-600 dark:text-red-400";
  const accentBgClass =
    type === "income" ? "bg-emerald-500/5" : "bg-red-500/5";
  const Icon = type === "income" ? ArrowUpRight : ArrowDownLeft;
  const saveDisabled = !amount || parseFloat(amount) <= 0 || !categoryId || saving;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[440px] max-h-[100vh] sm:max-h-[92vh] h-full sm:h-auto overflow-y-auto scrollbar-thin gap-0 p-0 sm:rounded-2xl rounded-none">
        {/* Header compacto */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", accentBgClass)}>
              <Icon className={cn("h-4 w-4", accentTextClass)} />
            </div>
            <h2 className="text-base font-semibold">{titleText}</h2>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setAddType(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {/* Importe HERO grande */}
          <div className={cn("px-6 py-8 text-center transition-colors", accentBgClass)}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {type === "income" ? "Ingreso" : "Gasto"}
            </p>
            <div className="flex items-center justify-center gap-1 mt-2">
              <span className={cn("text-3xl font-bold", accentTextClass)}>$</span>
              <AmountInput
                value={amount}
                onValueChange={setAmount}
                placeholder="0.00"
                className={cn(
                  "border-0 bg-transparent text-4xl font-bold text-center h-auto p-0 w-44 focus-visible:ring-0 focus-visible:ring-offset-0",
                  accentTextClass
                )}
                autoFocus
              />
            </div>
          </div>

          {/* Formulario en columna única */}
          <div className="px-4 py-2 space-y-0">
            {/* Comercio */}
            <FieldRow
              icon={<Store className="h-4 w-4" />}
              label="Comercio"
            >
              <div className="relative">
                <Input
                  placeholder="OXXO, Starbucks, Netflix..."
                  value={merchantName}
                  onChange={(e) => {
                    setMerchantName(e.target.value);
                    setMerchantQuery(e.target.value);
                    setMerchantOpen(true);
                    setSuggestedCategory(null);
                  }}
                  onFocus={() => {
                    if (merchants.length > 0) setMerchantOpen(true);
                  }}
                  onBlur={() => {
                    setTimeout(() => setMerchantOpen(false), 150);
                  }}
                  autoComplete="off"
                  className="border-0 px-0 h-auto py-0 text-base focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
                />
                {merchantOpen && merchants.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-lg border bg-popover shadow-md max-h-64 overflow-y-auto scrollbar-thin">
                    {merchants.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setMerchantName(m.name);
                          setMerchantOpen(false);
                          if (m.defaultCategory) setCategoryId(m.defaultCategory.id);
                          if (m.defaultPaymentMethod) setPaymentMethod(m.defaultPaymentMethod);
                          if (m.defaultAccountId) setAccountId(m.defaultAccountId);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-accent text-left transition-colors"
                      >
                        {m.defaultCategory ? (
                          <CategoryIcon icon={m.defaultCategory.icon} color={m.defaultCategory.color} size="sm" />
                        ) : (
                          <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                            <Store className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{m.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {m.defaultCategory?.name || "Sin categoría"} · {m.useCount}x usado
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Sugerencia IA */}
              {suggestedCategory && !categoryId && (
                <div className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/20 p-2.5 mt-2">
                  <Sparkles className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-xs text-muted-foreground flex-1">IA sugiere:</span>
                  <button
                    onClick={() => setCategoryId(suggestedCategory.categoryId)}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Aceptar
                  </button>
                </div>
              )}
              {classifyLoading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                  <Loader2 className="h-3 w-3 animate-spin" /> Clasificando con IA...
                </div>
              )}
              {/* Alternativas */}
              {suggestedCategory?.alternatives && suggestedCategory.alternatives.length > 0 && !categoryId && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-xs text-muted-foreground self-center mr-1">Otra:</span>
                  {suggestedCategory.alternatives.slice(0, 2).map((alt) => {
                    const cat = categories?.find((c) => c.name === alt.categoryName);
                    if (!cat) return null;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setCategoryId(cat.id)}
                        className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs hover:bg-accent transition-colors"
                      >
                        <CategoryIcon icon={cat.icon} color={cat.color} size="sm" className="h-5 w-5 !rounded-md" />
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </FieldRow>

            {/* Categoría */}
            <CategorySelector
              categories={filteredCategories}
              value={categoryId}
              onChange={(id) => { setCategoryId(id); setSubcategoryId(""); }}
              type={type}
            />

            {/* Subcategoría */}
            {subcategories.length > 0 && (
              <FieldRow
                icon={<Layers className="h-4 w-4" />}
                label="Subcategoría"
              >
                <Select value={subcategoryId} onValueChange={setSubcategoryId}>
                  <SelectTrigger className="border-0 px-0 h-auto py-0 text-base focus-visible:ring-0 bg-transparent">
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent>
                    {subcategories.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldRow>
            )}

            {/* Fecha */}
            <FieldRow
              icon={<CalIcon className="h-4 w-4" />}
              label="Fecha"
              onClick={() => setDatePickerOpen(true)}
              selectedValue={date.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
              rightIcon={null}
            />
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => { if (d) { setDate(d); setDatePickerOpen(false); } }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {/* Método de pago */}
            <FieldRow
              icon={<CreditCard className="h-4 w-4" />}
              label="Método de pago"
              onClick={() => setMethodPickerOpen(true)}
              selectedValue={selectedMethod?.label}
              placeholder="Selecciona método"
            />
            {methodPickerOpen && (
              <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={() => setMethodPickerOpen(false)}>
                <div className="bg-background w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl p-4" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-semibold">Método de pago</h3>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMethodPickerOpen(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-1">
                    {PAYMENT_METHODS.map((m) => (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => { setPaymentMethod(m.value); setMethodPickerOpen(false); }}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors",
                          paymentMethod === m.value ? "bg-primary/10 text-primary" : "hover:bg-accent"
                        )}
                      >
                        <CreditCard className="h-4 w-4" />
                        <span className="text-sm font-medium">{m.label}</span>
                        {paymentMethod === m.value && <Check className="h-4 w-4 ml-auto" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Cuenta */}
            <FieldRow
              icon={<Wallet className="h-4 w-4" />}
              label="Cuenta"
              onClick={() => setAccountPickerOpen(true)}
              selectedValue={selectedAccount ? `${selectedAccount.name} · ${formatCurrency(selectedAccount.balance, "MXN", { compact: true })}` : undefined}
              placeholder="Sin cuenta"
            />
            {accountPickerOpen && (
              <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={() => setAccountPickerOpen(false)}>
                <div className="bg-background w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl p-4" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-semibold">Selecciona cuenta</h3>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setAccountPickerOpen(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-1">
                    {accounts?.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => { setAccountId(a.id); setAccountPickerOpen(false); }}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors",
                          accountId === a.id ? "bg-primary/10" : "hover:bg-accent"
                        )}
                      >
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{a.name}</p>
                          <p className="text-xs text-muted-foreground">{formatCurrency(a.balance)}</p>
                        </div>
                        {accountId === a.id && <Check className="h-4 w-4 text-primary" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Etiquetas */}
            <FieldRow
              icon={<Tag className="h-4 w-4" />}
              label="Etiquetas"
            >
              <div className="flex gap-2 items-center">
                <Input
                  placeholder="Agregar etiqueta..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); addTag(); }
                  }}
                  className="border-0 px-0 h-auto py-0 text-base focus-visible:ring-0 bg-transparent"
                />
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={addTag}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {tags.map((t) => (
                    <Badge key={t} variant="secondary" className="gap-1">
                      {t}
                      <button onClick={() => setTags(tags.filter((x) => x !== t))}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </FieldRow>

            {/* Notas */}
            <FieldRow
              icon={<FileText className="h-4 w-4" />}
              label="Notas"
              divider={false}
            >
              <Textarea
                placeholder="Detalles adicionales..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="border-0 px-0 text-base focus-visible:ring-0 bg-transparent resize-none"
              />
            </FieldRow>

            {/* ¿Es recurrente? */}
            <div className={cn(
              "mt-2 rounded-xl border p-3 flex items-center justify-between gap-3",
              recurrente && (type === "income" ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5")
            )}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                  type === "income" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-red-500/10 text-red-600 dark:text-red-400"
                )}>
                  <Repeat className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight">¿Es recurrente?</p>
                  <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                    Crea un cargo recurrente
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
                  Próximo cobro: {advanceDate(date, periodicidad).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer sticky con botón Guardar */}
        <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t p-4">
          <Button
            onClick={handleSave}
            disabled={saveDisabled}
            className={cn(
              "w-full h-12 gap-2 text-base font-semibold",
              type === "income"
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-red-600 hover:bg-red-700 text-white"
            )}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-5 w-5" />}
            {saveText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
