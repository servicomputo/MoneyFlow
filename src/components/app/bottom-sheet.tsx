"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { X, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * BottomSheet reutilizable.
 * - Se renderiza con createPortal en document.body (fuera de cualquier Dialog)
 *   Esto evita que el focus trap del Dialog padre bloquee los clicks.
 * - En móvil: se desliza desde abajo, fondo oscuro semitransparente
 * - En desktop: se centra como modal
 * - NO tiene scroll interno (evita empalme con el scroll del diálogo principal)
 */
export function BottomSheet({
  open,
  onOpenChange,
  title,
  children,
  maxWidth = "sm:max-w-md",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  // Verificar si estamos en el cliente (para createPortal)
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsClient(true);
  }, []);

  // Prevenir scroll del body cuando el sheet está abierto
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.setProperty("overflow", "hidden");
    return () => {
      document.body.style.setProperty("overflow", prev);
    };
  }, [open]);

  if (!isClient || !open) return null;

  const content = (
    <div
      style={{ zIndex: 9999 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={() => onOpenChange(false)}
    >
      <div
        className={cn(
          "bg-background w-full rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col",
          maxWidth
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header del sheet */}
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <h3 className="text-base font-semibold">{title}</h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        {/* Contenido scrolleable del sheet (propio scroll, aislado) */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
          {children}
        </div>
      </div>
    </div>
  );

  // Renderizar directamente en document.body (fuera del Dialog padre)
  // para evitar el focus trap que bloquea los clicks
  return createPortal(content, document.body);
}

/**
 * Opción de lista para usar dentro de BottomSheet.
 * Cada opción es un botón con icono, texto y check si está seleccionada.
 */
export function SheetOption({
  icon,
  label,
  sublabel,
  selected,
  onClick,
}: {
  icon?: React.ReactNode;
  label: string;
  sublabel?: string;
  selected?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors",
        selected ? "bg-primary/10" : "hover:bg-accent"
      )}
    >
      {icon && <div className="h-5 w-5 text-muted-foreground shrink-0">{icon}</div>}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{label}</p>
        {sublabel && <p className="text-xs text-muted-foreground truncate">{sublabel}</p>}
      </div>
      {selected && <span className="text-primary shrink-0">✓</span>}
    </button>
  );
}

/**
 * ModalContainer: modal custom que reemplaza a Dialog de Radix.
 * NO tiene focus trap (que era lo que bloqueaba los BottomSheets).
 * - Se renderiza con createPortal en document.body
 * - Cierra al hacer click fuera o presionar Escape
 * - z-index alto para estar encima de todo
 */
export function ModalContainer({
  open,
  onOpenChange,
  children,
  maxWidth = "sm:max-w-[440px]",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsClient(true);
  }, []);

  // Cerrar con Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  // Prevenir scroll del body
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.setProperty("overflow", "hidden");
    return () => {
      document.body.style.setProperty("overflow", prev);
    };
  }, [open]);

  if (!isClient || !open) return null;

  const content = (
    <div
      style={{ zIndex: 50 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={() => onOpenChange(false)}
    >
      <div
        className={cn(
          "bg-background w-full rounded-t-2xl sm:rounded-2xl max-h-[100vh] sm:max-h-[92vh] h-full sm:h-auto flex flex-col overflow-hidden",
          maxWidth
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

// =============================================================================
// FieldRow: fila de formulario estilo mobile-first
// (icono + label uppercase + valor + línea divisoria)
// =============================================================================

export function FieldRow({
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

// =============================================================================
// ModalHeader: header sticky para ModalContainer
// =============================================================================

export function ModalHeader({
  icon,
  title,
  onClose,
  iconBgClass,
  iconTextClass,
}: {
  icon: React.ReactNode;
  title: string;
  onClose: () => void;
  iconBgClass?: string;
  iconTextClass?: string;
}) {
  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-2">
        <div className={cn(
          "h-8 w-8 rounded-lg flex items-center justify-center",
          iconBgClass || "bg-primary/10"
        )}>
          <span className={cn(iconTextClass || "text-primary")}>{icon}</span>
        </div>
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

// =============================================================================
// ModalFooter: footer sticky con botón principal full-width
// =============================================================================

export function ModalFooter({
  onCancel,
  onSave,
  cancelLabel = "Cancelar",
  saveLabel = "Guardar",
  saveDisabled = false,
  saving = false,
  saveClassName = "",
  children,
}: {
  onCancel: () => void;
  onSave: () => void;
  cancelLabel?: string;
  saveLabel?: string;
  saveDisabled?: boolean;
  saving?: boolean;
  saveClassName?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t p-4 shrink-0">
      {children || (
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} disabled={saving} className="flex-1 h-12">
            {cancelLabel}
          </Button>
          <Button
            onClick={onSave}
            disabled={saveDisabled || saving}
            className={cn("flex-1 h-12 gap-2 text-base font-semibold", saveClassName)}
          >
            {saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : null}
            {saveLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
