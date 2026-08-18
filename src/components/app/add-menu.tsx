"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppStore } from "@/lib/store";
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";

type MenuItemColor = "red" | "emerald" | "purple";

const COLOR_CLASSES: Record<MenuItemColor, string> = {
  red: "bg-red-500/10 text-red-600 dark:text-red-400",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
};

interface OptionProps {
  color: MenuItemColor;
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
}

function Option({ color, icon, label, description, onClick }: OptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-accent transition-colors text-left border border-border"
    >
      <div
        className={cn(
          "h-11 w-11 rounded-xl flex items-center justify-center shrink-0",
          COLOR_CLASSES[color]
        )}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-tight">{label}</p>
        <p className="text-xs text-muted-foreground leading-tight mt-0.5">
          {description}
        </p>
      </div>
    </button>
  );
}

/**
 * Menú centrado con 3 opciones: Gasto / Ingreso / Transferencia.
 * Se controla con el store `addOpen`.
 * Funciona perfecto en móvil y desktop (Dialog centrado).
 */
export function AddMenuPopover() {
  const { addOpen, setAddOpen, setAddType } = useAppStore();

  function pick(type: "expense" | "income" | "transfer") {
    setAddOpen(false);
    requestAnimationFrame(() => setAddType(type));
  }

  return (
    <Dialog open={addOpen} onOpenChange={setAddOpen}>
      <DialogContent className="sm:max-w-sm p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-2">
          <DialogTitle className="text-base">Agregar movimiento</DialogTitle>
        </DialogHeader>
        <div className="px-4 pb-4 space-y-2">
          <Option
            color="red"
            icon={<ArrowDownLeft className="h-5 w-5" />}
            label="Gasto"
            description="Egreso de dinero"
            onClick={() => pick("expense")}
          />
          <Option
            color="emerald"
            icon={<ArrowUpRight className="h-5 w-5" />}
            label="Ingreso"
            description="Entrada de dinero"
            onClick={() => pick("income")}
          />
          <Option
            color="purple"
            icon={<ArrowLeftRight className="h-5 w-5" />}
            label="Transferencia"
            description="Mover dinero entre tus cuentas"
            onClick={() => pick("transfer")}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
