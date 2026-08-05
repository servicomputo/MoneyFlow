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
import { Textarea } from "@/components/ui/textarea";
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
import { useCategories, useAccounts, type Merchant } from "./hooks";
import { PAYMENT_METHODS, colorClasses } from "@/lib/categories";
import { formatCurrency, monthKey } from "@/lib/format";
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
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export function AddExpenseDialog() {
  const { addOpen, setAddOpen } = useAppStore();
  const qc = useQueryClient();
  const { data: categories } = useCategories();
  const { data: accounts } = useAccounts();

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

  // Reset al abrir
  useEffect(() => {
    if (addOpen) {
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
    }
  }, [addOpen, accounts]);

  // Buscar comercios con debounce
  useEffect(() => {
    if (!merchantQuery.trim()) {
      setMerchants([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/merchants?q=${encodeURIComponent(merchantQuery)}`);
        const d = await r.json();
        setMerchants(d.merchants || []);
      } catch {
        setMerchants([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [merchantQuery]);

  // Clasificar con IA cuando hay un merchant y no se ha elegido categoría
  useEffect(() => {
    if (!merchantName.trim() || categoryId) return;
    const t = setTimeout(async () => {
      setClassifyLoading(true);
      try {
        const r = await fetch("/api/classify", {
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
          // Auto-seleccionar si la confianza es alta
          if (d.confidence >= 0.85 && !categoryId) {
            setCategoryId(d.categoryId);
          }
        }
      } catch {
        // ignore
      } finally {
        setClassifyLoading(false);
      }
    }, 600);
    return () => clearTimeout(t);
  }, [merchantName, categoryId]);

  const selectedCategory = categories?.find((c) => c.id === categoryId);
  const subcategories = selectedCategory?.subcategories || [];

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
      const r = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amt,
          date: date.toISOString(),
          categoryId,
          subcategoryId: subcategoryId || null,
          merchantName: merchantName || null,
          paymentMethod: paymentMethod || null,
          accountId: accountId || null,
          notes: notes || null,
          tags,
          source: "manual",
        }),
      });
      if (!r.ok) throw new Error("Error al guardar");
      toast.success("Gasto registrado", {
        description: `${formatCurrency(amt)} · ${selectedCategory?.name}`,
      });
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["budgets"] });
      setAddOpen(false);
    } catch (e) {
      toast.error("No se pudo guardar el gasto");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={addOpen} onOpenChange={setAddOpen}>
      <DialogContent className="sm:max-w-[560px] max-h-[92vh] overflow-y-auto scrollbar-thin gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Agregar gasto
          </DialogTitle>
          <DialogDescription>
            Registra tu gasto en segundos. La IA sugiere la categoría automáticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-4">
          {/* Importe grande */}
          <div className="rounded-2xl bg-muted/50 p-5 text-center">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              Importe
            </Label>
            <div className="flex items-center justify-center gap-1 mt-1">
              <span className="text-3xl font-bold text-muted-foreground">$</span>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="border-0 bg-transparent text-4xl font-bold text-center h-auto p-0 w-40 focus-visible:ring-0 focus-visible:ring-offset-0"
                autoFocus
              />
            </div>
          </div>

          {/* Comercio con autocompletado */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              <Store className="h-3.5 w-3.5" /> Comercio
            </Label>
            <Popover open={merchantOpen && merchants.length > 0} onOpenChange={setMerchantOpen}>
              <PopoverTrigger asChild>
                <Input
                  placeholder="Ej. OXXO, Starbucks, Netflix..."
                  value={merchantName}
                  onChange={(e) => {
                    setMerchantName(e.target.value);
                    setMerchantQuery(e.target.value);
                    setMerchantOpen(true);
                    setSuggestedCategory(null);
                  }}
                />
              </PopoverTrigger>
              <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
                <div className="max-h-64 overflow-y-auto scrollbar-thin">
                  {merchants.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setMerchantName(m.name);
                        setMerchantOpen(false);
                        if (m.defaultCategory) setCategoryId(m.defaultCategory.id);
                        if (m.defaultPaymentMethod) setPaymentMethod(m.defaultPaymentMethod);
                        if (m.defaultAccountId) setAccountId(m.defaultAccountId);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-accent text-left transition-colors"
                    >
                      {m.defaultCategory ? (
                        <CategoryIcon
                          icon={m.defaultCategory.icon}
                          color={m.defaultCategory.color}
                          size="sm"
                        />
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
              </PopoverContent>
            </Popover>

            {/* Sugerencia de IA */}
            {suggestedCategory && !categoryId && (
              <div className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/20 p-2.5 animate-count-up">
                <Sparkles className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs text-muted-foreground flex-1">
                  IA sugiere:
                </span>
                <button
                  onClick={() => setCategoryId(suggestedCategory.categoryId)}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Aceptar
                </button>
              </div>
            )}
            {classifyLoading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Clasificando con IA...
              </div>
            )}
          </div>

          {/* Categoría */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Categoría</Label>
              <Select value={categoryId} onValueChange={(v) => { setCategoryId(v); setSubcategoryId(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        <CategoryIcon icon={c.icon} color={c.color} size="sm" className="h-6 w-6" />
                        <span>{c.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Subcategoría</Label>
              <Select value={subcategoryId} onValueChange={setSubcategoryId} disabled={!subcategories.length}>
                <SelectTrigger>
                  <SelectValue placeholder={subcategories.length ? "Opcional" : "—"} />
                </SelectTrigger>
                <SelectContent>
                  {subcategories.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Alternativas si las hay */}
          {suggestedCategory?.alternatives && suggestedCategory.alternatives.length > 0 && !categoryId && (
            <div className="flex flex-wrap gap-1.5">
              <span className="text-xs text-muted-foreground self-center mr-1">Otra opción:</span>
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

          {/* Fecha y método de pago */}
          <div className="grid grid-cols-2 gap-3">
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
            <div className="space-y-1.5">
              <Label className="text-xs">Método de pago</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cuenta */}
          <div className="space-y-1.5">
            <Label className="text-xs">Cuenta</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Sin cuenta" />
              </SelectTrigger>
              <SelectContent>
                {accounts?.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} · {formatCurrency(a.balance, "MXN", { compact: true })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Etiquetas */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" /> Etiquetas
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="Agregar etiqueta..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
              />
              <Button type="button" variant="outline" size="icon" onClick={addTag}>
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
          </div>

          {/* Notas */}
          <div className="space-y-1.5">
            <Label className="text-xs">Notas (opcional)</Label>
            <Textarea
              placeholder="Detalles adicionales..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Acciones */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setAddOpen(false)} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1 gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Guardar gasto
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
