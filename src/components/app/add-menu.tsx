"use client";

import {
  Popover,
  PopoverContent,
  PopoverAnchor,
} from "@/components/ui/popover";
import { useAppStore } from "@/lib/store";
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";

type MenuItemColor = "red" | "emerald" | "purple";

const COLOR_CLASSES: Record<MenuItemColor, string> = {
  red: "bg-red-500/10 text-red-600 dark:text-red-400",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
};

const DOT_CLASSES: Record<MenuItemColor, string> = {
  red: "bg-red-500",
  emerald: "bg-emerald-500",
  purple: "bg-purple-500",
};

interface AddMenuItemProps {
  color: MenuItemColor;
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
}

function AddMenuItem({ color, icon, label, description, onClick }: AddMenuItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-accent transition-colors text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div
        className={cn(
          "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
          COLOR_CLASSES[color]
        )}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={cn("h-1.5 w-1.5 rounded-full", DOT_CLASSES[color])} />
          <p className="text-sm font-semibold leading-tight">{label}</p>
        </div>
        <p className="text-xs text-muted-foreground leading-tight mt-0.5">
          {description}
        </p>
      </div>
    </button>
  );
}

/**
 * Popover menu global con 3 opciones: Gasto / Ingreso / Transferencia.
 * Se controla con el store `addOpen` para que cualquier botón "+" del shell
 * pueda abrirlo mediante `setAddOpen(true)`.
 *
 * El ancla es un sentinel invisible posicionado en la esquina inferior derecha
 * (donde típicamente vive el botón + del header / nav inferior / dashboard CTA),
 * de modo que el popover aparece en una posición cómoda tanto en desktop como mobile.
 */
export function AddMenuPopover() {
  const { addOpen, setAddOpen, setAddType } = useAppStore();

  function pick(type: "expense" | "income" | "transfer") {
    setAddOpen(false);
    // Pequeño defer para evitar parpadeo entre cerrar popover y abrir dialog
    requestAnimationFrame(() => setAddType(type));
  }

  return (
    <Popover open={addOpen} onOpenChange={setAddOpen}>
      <PopoverAnchor asChild>
        <span
          aria-hidden
          className="fixed bottom-24 right-4 lg:bottom-10 lg:right-10 pointer-events-none h-0.5 w-0.5"
        />
      </PopoverAnchor>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={8}
        alignOffset={-4}
        className="w-72 p-2 gap-0.5"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="px-2 pt-1 pb-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Agregar movimiento
          </p>
        </div>
        <AddMenuItem
          color="red"
          icon={<ArrowDownLeft className="h-5 w-5" />}
          label="Gasto"
          description="Egreso de dinero"
          onClick={() => pick("expense")}
        />
        <AddMenuItem
          color="emerald"
          icon={<ArrowUpRight className="h-5 w-5" />}
          label="Ingreso"
          description="Entrada de dinero"
          onClick={() => pick("income")}
        />
        <AddMenuItem
          color="purple"
          icon={<ArrowLeftRight className="h-5 w-5" />}
          label="Transferencia"
          description="Entre tus cuentas"
          onClick={() => pick("transfer")}
        />
      </PopoverContent>
    </Popover>
  );
}
