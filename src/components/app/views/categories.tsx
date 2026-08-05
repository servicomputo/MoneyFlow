"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Tags,
  ChevronRight,
  Check,
  ArrowDownRight,
  ArrowUpRight,
  Hash,
  Trash2,
  X,
} from "lucide-react";

import { useCategories, mutations, type Category } from "../hooks";
import { CategoryIcon } from "../category-icon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  CATEGORY_ICONS,
  COLOR_NAMES,
  colorClasses,
  DEFAULT_CATEGORIES,
} from "@/lib/categories";
import { cn } from "@/lib/utils";

const ICON_NAMES = Object.keys(CATEGORY_ICONS);

const TYPE_OPTIONS = [
  { value: "expense", label: "Gasto", icon: ArrowDownRight },
  { value: "income", label: "Ingreso", icon: ArrowUpRight },
];

function renderIcon(
  Icon: React.ComponentType<{ className?: string }>,
  className: string
) {
  return React.createElement(Icon, { className });
}

export function CategoriesView() {
  const { data: categories, isLoading } = useCategories();
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [typeFilter, setTypeFilter] = React.useState<"all" | "expense" | "income">(
    "all"
  );

  async function handleCreate(payload: {
    name: string;
    icon: string;
    color: string;
    type: string;
  }) {
    try {
      await mutations.createCategory(payload);
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Categoría creada con éxito");
      setOpen(false);
    } catch {
      toast.error("No se pudo crear la categoría");
    }
  }

  async function handleUpdate(id: string, payload: { name: string; icon: string; color: string; type: string }) {
    try {
      await mutations.updateCategory(id, payload);
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Categoría actualizada");
    } catch (e) {
      toast.error("No se pudo actualizar", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  }

  async function handleDelete(id: string, name: string) {
    try {
      await mutations.deleteCategory(id);
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success(`Categoría "${name}" eliminada`);
    } catch (e) {
      toast.error("No se pudo eliminar", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  }

  async function handleAddSubcategory(categoryId: string, name: string) {
    try {
      await mutations.createSubcategory(categoryId, name);
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success(`Subcategoría "${name}" agregada`);
    } catch (e) {
      toast.error("No se pudo agregar la subcategoría", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  }

  async function handleDeleteSubcategory(id: string, name: string) {
    try {
      await mutations.deleteSubcategory(id);
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success(`Subcategoría "${name}" eliminada`);
    } catch (e) {
      toast.error("No se pudo eliminar", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  }

  async function handleRenameSubcategory(id: string, name: string) {
    try {
      await mutations.updateSubcategory(id, name);
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Subcategoría renombrada");
    } catch (e) {
      toast.error("No se pudo renombrar", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  }

  if (isLoading) return <CategoriesSkeleton />;

  const list = categories ?? [];
  const filtered = list.filter((c) => typeFilter === "all" || c.type === typeFilter);
  const expenseCount = list.filter((c) => c.type === "expense").length;
  const incomeCount = list.filter((c) => c.type === "income").length;
  const totalSubs = list.reduce((s, c) => s + c.subcategories.length, 0);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard
          label="Categorías"
          value={list.length}
          hint="Totales"
          accent="from-emerald-500 to-teal-600"
        />
        <SummaryCard
          label="Gastos"
          value={expenseCount}
          hint="Tipos de gasto"
          accent="from-rose-500 to-red-600"
        />
        <SummaryCard
          label="Ingresos"
          value={incomeCount}
          hint="Tipos de ingreso"
          accent="from-amber-500 to-orange-600"
        />
        <SummaryCard
          label="Subcategorías"
          value={totalSubs}
          hint="En total"
          accent="from-violet-500 to-purple-600"
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Tus categorías</h2>
          <p className="text-sm text-muted-foreground">
            Organiza tus gastos e ingresos con categorías personalizadas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={typeFilter}
            onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filtrar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="expense">Gastos</SelectItem>
              <SelectItem value="income">Ingresos</SelectItem>
            </SelectContent>
          </Select>
          <AddCategoryDialog
            open={open}
            onOpenChange={setOpen}
            onSubmit={handleCreate}
          />
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState onAdd={() => setOpen(true)} />
      ) : (
        <Accordion
          type="multiple"
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 items-start"
        >
          {filtered.map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onAddSubcategory={handleAddSubcategory}
              onDeleteSubcategory={handleDeleteSubcategory}
              onRenameSubcategory={handleRenameSubcategory}
            />
          ))}
        </Accordion>
      )}

      {/* Defaults reference */}
      <div className="rounded-xl border bg-muted/30 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Tags className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Categorías sugeridas</h3>
          <Badge variant="secondary" className="text-[10px]">
            {DEFAULT_CATEGORIES.length}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_CATEGORIES.map((c) => {
            const cc = colorClasses(c.color);
            return (
              <span
                key={c.name}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                  cc.soft,
                  cc.text
                )}
              >
                {renderIcon(CATEGORY_ICONS[c.icon] ?? CATEGORY_ICONS.Wallet, "h-3.5 w-3.5")}
                {c.name}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: number;
  hint: string;
  accent: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div
          className={cn(
            "h-7 w-7 rounded-lg bg-gradient-to-br flex items-center justify-center",
            accent
          )}
        >
          <Tags className="h-3.5 w-3.5 text-white" />
        </div>
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>
    </div>
  );
}

function CategoryCard({
  category,
  onUpdate,
  onDelete,
  onAddSubcategory,
  onDeleteSubcategory,
  onRenameSubcategory,
}: {
  category: Category;
  onUpdate: (id: string, payload: { name: string; icon: string; color: string; type: string }) => void;
  onDelete: (id: string, name: string) => void;
  onAddSubcategory: (categoryId: string, name: string) => void;
  onDeleteSubcategory: (id: string, name: string) => void;
  onRenameSubcategory: (id: string, name: string) => void;
}) {
  const isIncome = category.type === "income";
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [newSub, setNewSub] = React.useState("");
  const [addingSub, setAddingSub] = React.useState(false);
  const [editingSubId, setEditingSubId] = React.useState<string | null>(null);
  const [editingSubName, setEditingSubName] = React.useState("");

  async function submitNewSub() {
    const name = newSub.trim();
    if (!name) return;
    setAddingSub(true);
    await onAddSubcategory(category.id, name);
    setAddingSub(false);
    setNewSub("");
  }

  async function submitRenameSub() {
    const name = editingSubName.trim();
    if (!name || !editingSubId) {
      setEditingSubId(null);
      return;
    }
    await onRenameSubcategory(editingSubId, name);
    setEditingSubId(null);
    setEditingSubName("");
  }

  return (
    <AccordionItem
      value={category.id}
      className="rounded-xl border bg-card shadow-sm overflow-hidden border-b"
    >
      <div className="flex items-start gap-3 p-4">
        <CategoryIcon
          icon={category.icon}
          color={category.color}
          size="lg"
          className="shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold truncate">{category.name}</p>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-accent"
                aria-label="Editar categoría"
                title="Editar"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="text-muted-foreground hover:text-red-500 transition-colors p-1 rounded-md hover:bg-accent"
                aria-label="Eliminar categoría"
                title="Eliminar"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <Badge
              variant="secondary"
              className={cn(
                "gap-1",
                isIncome
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
              )}
            >
              {isIncome ? (
                <ArrowDownRight className="h-3 w-3" />
              ) : (
                <ArrowUpRight className="h-3 w-3" />
              )}
              {isIncome ? "Ingreso" : "Gasto"}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Hash className="h-3 w-3" />
              {category.subcategories.length} sub
            </Badge>
          </div>
        </div>
      </div>
      <AccordionTrigger className="px-4 pb-3 pt-0 hover:no-underline text-xs text-muted-foreground">
        <span>
          {category.subcategories.length > 0
            ? "Ver subcategorías"
            : "Sin subcategorías"}
        </span>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4">
        <div className="space-y-2">
          {category.subcategories.length === 0 && (
            <p className="text-xs text-muted-foreground py-2">
              Aún no hay subcategorías.
            </p>
          )}
          {category.subcategories.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-2 rounded-md border bg-muted/30 px-2.5 py-1.5 text-sm"
            >
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
              {editingSubId === s.id ? (
                <Input
                  value={editingSubName}
                  onChange={(e) => setEditingSubName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitRenameSub();
                    if (e.key === "Escape") setEditingSubId(null);
                  }}
                  className="h-6 text-sm px-1.5 py-0"
                  autoFocus
                />
              ) : (
                <span className="flex-1 truncate">{s.name}</span>
              )}
              {editingSubId === s.id ? (
                <>
                  <button
                    type="button"
                    onClick={submitRenameSub}
                    className="text-emerald-600 hover:text-emerald-700 p-1"
                    aria-label="Guardar"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingSubId(null)}
                    className="text-muted-foreground hover:text-foreground p-1"
                    aria-label="Cancelar"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSubId(s.id);
                      setEditingSubName(s.name);
                    }}
                    className="text-muted-foreground hover:text-foreground p-1"
                    aria-label="Renombrar"
                    title="Renombrar"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteSubcategory(s.id, s.name)}
                    className="text-muted-foreground hover:text-red-500 p-1"
                    aria-label="Eliminar subcategoría"
                    title="Eliminar"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </>
              )}
            </div>
          ))}
          {/* Input para agregar subcategoría */}
          <div className="flex gap-1.5 mt-1">
            <Input
              value={newSub}
              onChange={(e) => setNewSub(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitNewSub();
              }}
              placeholder="Nueva subcategoría..."
              className="h-8 text-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-2 gap-1 text-xs shrink-0"
              onClick={submitNewSub}
              disabled={!newSub.trim() || addingSub}
            >
              <Plus className="h-3.5 w-3.5" />
              Agregar
            </Button>
          </div>
        </div>
      </AccordionContent>

      {/* Dialog de edición */}
      <EditCategoryDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        category={category}
        onSubmit={(payload) => {
          onUpdate(category.id, payload);
          setEditOpen(false);
        }}
      />

      {/* Confirmación de eliminación */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar "{category.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Si hay gastos asociados a esta
              categoría, no se podrá eliminar hasta reasignarlos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                onDelete(category.id, category.name);
                setDeleteOpen(false);
              }}
            >
              <Trash2 className="h-4 w-4" />
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AccordionItem>
  );
}

function AddCategoryDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (payload: {
    name: string;
    icon: string;
    color: string;
    type: string;
  }) => void;
}) {
  const [name, setName] = React.useState("");
  const [icon, setIcon] = React.useState("Wallet");
  const [color, setColor] = React.useState("emerald");
  const [type, setType] = React.useState("expense");
  const [submitting, setSubmitting] = React.useState(false);

  function reset() {
    setName("");
    setIcon("Wallet");
    setColor("emerald");
    setType("expense");
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
      icon,
      color,
      type,
    });
    setSubmitting(false);
    reset();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Agregar categoría
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva categoría</DialogTitle>
          <DialogDescription>
            Define un nombre, ícono y color para identificarla fácilmente.
          </DialogDescription>
        </DialogHeader>
        <CategoryFormFields
          name={name} setName={setName}
          icon={icon} setIcon={setIcon}
          color={color} setColor={setColor}
          type={type} setType={setType}
        />
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting} onClick={handleSubmit}>
            {submitting ? "Guardando…" : "Guardar categoría"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditCategoryDialog({
  open,
  onOpenChange,
  category,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  category: Category;
  onSubmit: (payload: { name: string; icon: string; color: string; type: string }) => void;
}) {
  const [name, setName] = React.useState(category.name);
  const [icon, setIcon] = React.useState(category.icon);
  const [color, setColor] = React.useState(category.color);
  const [type, setType] = React.useState(category.type);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName(category.name);
      setIcon(category.icon);
      setColor(category.color);
      setType(category.type);
    }
  }, [open, category]);

  async function handleSubmit() {
    if (!name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    setSubmitting(true);
    await onSubmit({
      name: name.trim(),
      icon,
      color,
      type,
    });
    setSubmitting(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar categoría</DialogTitle>
          <DialogDescription>
            Modifica el nombre, ícono, color o tipo.
          </DialogDescription>
        </DialogHeader>
        <CategoryFormFields
          name={name} setName={setName}
          icon={icon} setIcon={setIcon}
          color={color} setColor={setColor}
          type={type} setType={setType}
        />
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button type="button" disabled={submitting} onClick={handleSubmit}>
            {submitting ? "Guardando…" : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Campos compartidos entre crear y editar
function CategoryFormFields({
  name, setName,
  icon, setIcon,
  color, setColor,
  type, setType,
}: {
  name: string;
  setName: (v: string) => void;
  icon: string;
  setIcon: (v: string) => void;
  color: string;
  setColor: (v: string) => void;
  type: string;
  setType: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="cat-name">Nombre</Label>
        <Input
          id="cat-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. Mascotas"
        />
      </div>

      <div className="space-y-1.5">
        <Label>Tipo</Label>
        <div className="grid grid-cols-2 gap-2">
          {TYPE_OPTIONS.map((t) => {
            const active = type === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "border-primary bg-primary/5 text-primary"
                    : "text-muted-foreground hover:bg-accent"
                )}
              >
                {renderIcon(t.icon, "h-4 w-4")}
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Ícono</Label>
        <div className="grid grid-cols-7 gap-2 max-h-44 overflow-y-auto p-1 rounded-lg border bg-muted/30">
          {ICON_NAMES.map((iconName) => {
            const active = icon === iconName;
            return (
              <button
                key={iconName}
                type="button"
                onClick={() => setIcon(iconName)}
                className={cn(
                  "aspect-square rounded-md flex items-center justify-center transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "hover:bg-accent text-foreground/80"
                )}
                aria-label={`Ícono ${iconName}`}
                title={iconName}
              >
                {renderIcon(CATEGORY_ICONS[iconName], "h-4 w-4")}
              </button>
            );
          })}
        </div>
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
                  active &&
                    "ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110"
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

      {/* Preview */}
      <div className="rounded-lg border bg-muted/30 p-3">
        <p className="text-xs text-muted-foreground mb-2">Vista previa</p>
        <div className="flex items-center gap-3">
          <CategoryIcon icon={icon} color={color} size="md" />
          <div className="flex-1">
            <p className="font-medium">{name || "Nombre de la categoría"}</p>
            <p className="text-xs text-muted-foreground">
              {type === "income" ? "Ingreso" : "Gasto"} · {icon}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 border-2 border-dashed rounded-2xl">
      <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Tags className="h-7 w-7 text-primary" />
      </div>
      <p className="mt-4 font-semibold">No hay categorías</p>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">
        Crea tu primera categoría para empezar a clasificar tus movimientos.
      </p>
      <Button className="mt-4 gap-2" onClick={onAdd}>
        <Plus className="h-4 w-4" /> Agregar categoría
      </Button>
    </div>
  );
}

function CategoriesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
