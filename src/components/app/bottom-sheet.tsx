"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
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
