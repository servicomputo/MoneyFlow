"use client";

import { useTheme } from "next-themes";
import { Moon, Sun, Plus, ScanLine, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore, type ViewKey } from "@/lib/store";
import { monthKey, monthLabel } from "@/lib/format";
import {
  LayoutDashboard,
  ListOrdered,
  Wallet,
  Receipt,
  Target,
  CreditCard,
  Tags,
  BarChart3,
  Bot,
  Bell,
  Settings,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useReminders } from "./hooks";
import { Badge } from "@/components/ui/badge";

const NAV: Array<{ key: ViewKey; label: string; icon: typeof Wallet; group?: string }> = [
  { key: "dashboard", label: "Inicio", icon: LayoutDashboard },
  { key: "movements", label: "Movimientos", icon: ListOrdered },
  { key: "add", label: "Agregar gasto", icon: Plus },
  { key: "scan", label: "Escanear ticket", icon: ScanLine },
  { key: "stats", label: "Estadísticas", icon: BarChart3 },
  { key: "assistant", label: "Asistente IA", icon: Bot },
  { key: "budgets", label: "Presupuestos", icon: Target },
  { key: "subscriptions", label: "Suscripciones", icon: Receipt },
  { key: "accounts", label: "Cuentas", icon: CreditCard },
  { key: "categories", label: "Categorías", icon: Tags },
  { key: "goals", label: "Metas de ahorro", icon: Sparkles },
  { key: "reminders", label: "Recordatorios", icon: Bell },
  { key: "settings", label: "Configuración", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme();
  const { view, setView, setAddOpen } = useAppStore();

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex w-64 flex-col border-r bg-sidebar/60 backdrop-blur-xl sticky top-0 h-screen">
        <div className="flex items-center gap-2.5 px-5 h-16 border-b">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Wallet className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-base leading-none">FinZeni</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Finanzas con IA</p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-0.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = view === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setView(item.key)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-4 w-4 dark:hidden" />
            <Moon className="h-4 w-4 hidden dark:block" />
            {theme === "dark" ? "Modo claro" : "Modo oscuro"}
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 border-b bg-background/80 backdrop-blur-xl flex items-center gap-3 px-4 sm:px-6">
          <div className="lg:hidden flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
              <Wallet className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold">FinZeni</span>
          </div>

          <div className="hidden lg:block">
            <h1 className="font-semibold text-lg capitalize">
              {NAV.find((n) => n.key === view)?.label || "Inicio"}
            </h1>
            <p className="text-xs text-muted-foreground">{monthLabel(monthKey())}</p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => setView("assistant")}
              title="Asistente IA"
            >
              <Search className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 relative"
              onClick={() => setView("reminders")}
              title="Recordatorios"
            >
              <Bell className="h-4 w-4" />
              <ReminderDot />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              <Sun className="h-4 w-4 dark:hidden" />
              <Moon className="h-4 w-4 hidden dark:block" />
            </Button>
            <Button
              onClick={() => setAddOpen(true)}
              className="bg-primary hover:bg-primary/90 shadow-sm gap-1.5 h-9"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Agregar gasto</span>
            </Button>
          </div>
        </header>

        {/* Mobile bottom nav */}
        <MobileNav />

        {/* Content */}
        <main className="flex-1 p-4 sm:p-6 pb-24 lg:pb-6 max-w-7xl w-full mx-auto">
          {children}
        </main>

        <footer className="mt-auto border-t py-4 px-6 text-center text-xs text-muted-foreground hidden lg:block">
          FinZeni · Tu contador y asesor financiero personal con IA · © {new Date().getFullYear()}
        </footer>
      </div>

      {/* Command palette removido por simplicidad */}
    </div>
  );
}

function ReminderDot() {
  const { data } = useReminders();
  const pending = data?.filter((r) => !r.done).length || 0;
  if (pending === 0) return null;
  return (
    <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[9px] p-0 flex items-center justify-center bg-destructive text-destructive-foreground">
      {pending}
    </Badge>
  );
}

function MobileNav() {
  const { view, setView } = useAppStore();
  const items = NAV.filter((n) =>
    ["dashboard", "movements", "add", "scan", "stats"].includes(n.key)
  );
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur-xl safe-area-bottom">
      <div className="flex items-stretch justify-around h-16">
        {items.map((item) => {
          const Icon = item.icon;
          const active = view === item.key;
          const isAdd = item.key === "add";
          return (
            <button
              key={item.key}
              onClick={() => setView(item.key)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 text-[10px] font-medium transition-colors relative",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              {isAdd ? (
                <div className="h-10 w-10 -mt-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30">
                  <Icon className="h-5 w-5" />
                </div>
              ) : (
                <Icon className="h-5 w-5" />
              )}
              {!isAdd && <span>{item.label}</span>}
              {isAdd && <span className="mt-0.5">Agregar</span>}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
