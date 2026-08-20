"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * BottomSheet reutilizable.
 * - En móvil: se desliza desde abajo, fondo oscuro semitransparente
 * - En desktop: se centra como modal
 * - NO tiene scroll interno (evita empalme con el scroll del diálogo principal)
 *   Todo el contenido se renderiza de una sola vez
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
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
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
