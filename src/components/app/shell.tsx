"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Plus, ScanLine, FileUp, PanelLeftClose, PanelLeftOpen, Menu, X } from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const NAV: Array<{ key: ViewKey; label: string; icon: typeof Wallet; action?: "openAddDialog" }> = [
  { key: "dashboard", label: "Inicio", icon: LayoutDashboard },
  { key: "movements", label: "Movimientos", icon: ListOrdered },
  { key: "add", label: "Agregar movimiento", icon: Plus, action: "openAddDialog" },
  { key: "scan", label: "Escanear ticket", icon: ScanLine },
  { key: "import", label: "Importar Excel", icon: FileUp },
  { key: "stats", label: "Estadísticas", icon: BarChart3 },
  { key: "assistant", label: "Asistente IA", icon: Bot },
  { key: "budgets", label: "Presupuestos", icon: Target },
  { key: "subscriptions", label: "Cargos recurrentes", icon: Receipt },
  { key: "accounts", label: "Cuentas", icon: CreditCard },
  { key: "categories", label: "Categorías", icon: Tags },
  { key: "goals", label: "Metas de ahorro", icon: Sparkles },
  { key: "reminders", label: "Recordatorios", icon: Bell },
  { key: "settings", label: "Configuración", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme();
  const { view, setView, setAddOpen, sidebarCollapsed, toggleSidebar } = useAppStore();

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar desktop */}
      <aside
        className={cn(
          "hidden lg:flex flex-col border-r bg-sidebar/60 backdrop-blur-xl sticky top-0 h-screen transition-all duration-200",
          sidebarCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo / Brand */}
        <div className={cn(
          "flex items-center gap-2.5 h-16 border-b",
          sidebarCollapsed ? "justify-center px-2" : "px-5"
        )}>
          <div className="h-9 w-9 rounded-xl flex items-center justify-center shadow-lg shrink-0" style={{ background: "linear-gradient(135deg, var(--primary), color-mix(in oklch, var(--primary), #000 30%))" }}>
            <Wallet className="h-5 w-5 text-white" />
          </div>
          {!sidebarCollapsed && (
            <div>
              <p className="font-bold text-base leading-none">Money Flow</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Finanzas con IA</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-0.5">
          <TooltipProvider delayDuration={200}>
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = view === item.key;
              const button = (
                <button
                  key={item.key}
                  onClick={() => {
                    if (item.action === "openAddDialog") {
                      setAddOpen(true);
                    } else {
                      setView(item.key);
                    }
                  }}
                  className={cn(
                    "w-full flex items-center rounded-lg text-sm font-medium transition-all",
                    sidebarCollapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    item.action === "openAddDialog" &&
                      !active &&
                      "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
              return sidebarCollapsed ? (
                <Tooltip key={item.key}>
                  <TooltipTrigger asChild>{button}</TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              ) : (
                button
              );
            })}
          </TooltipProvider>
        </nav>

        {/* Bottom: toggle + theme */}
        <div className="p-2 border-t space-y-1">
          {/* Toggle button */}
          <button
            onClick={toggleSidebar}
            className={cn(
              "w-full flex items-center rounded-lg text-sm font-medium transition-all text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              sidebarCollapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2"
            )}
            title={sidebarCollapsed ? "Expandir menú" : "Colapsar menú"}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="h-4 w-4 shrink-0" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4 shrink-0" />
                <span className="truncate">Colapsar menú</span>
              </>
            )}
          </button>

          {/* Theme toggle */}
          {!sidebarCollapsed ? (
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
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="w-full h-9"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              <Sun className="h-4 w-4 dark:hidden" />
              <Moon className="h-4 w-4 hidden dark:block" />
            </Button>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 border-b bg-background/80 backdrop-blur-xl flex items-center gap-3 px-4 sm:px-6">
          {/* Mobile menu (hamburguesa) + brand */}
          <div className="lg:hidden flex items-center gap-2 flex-1 min-w-0">
            <MobileMenu />
            <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, var(--primary), color-mix(in oklch, var(--primary), #000 30%))" }}>
              <Wallet className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold truncate">Money Flow</span>
          </div>

          {/* Desktop toggle + title */}
          <div className="hidden lg:flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={toggleSidebar}
              title={sidebarCollapsed ? "Expandir menú" : "Colapsar menú"}
            >
              {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
            <div>
              <h1 className="font-semibold text-lg capitalize leading-tight">
                {NAV.find((n) => n.key === view)?.label || "Inicio"}
              </h1>
              <p className="text-xs text-muted-foreground">{monthLabel(monthKey())}</p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => setView("assistant")}
              title="Asistente IA"
            >
              <Bot className="h-4 w-4" />
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
          Money Flow · Tu contador y asesor financiero personal con IA · © {new Date().getFullYear()}
        </footer>
      </div>
    </div>
  );
}

function MobileMenu() {
  const { view, setView, setAddOpen } = useAppStore();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  function handleNavigate(item: typeof NAV[number]) {
    setOpen(false);
    if (item.action === "openAddDialog") {
      setAddOpen(true);
    } else {
      setView(item.key);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="px-5 pt-5 pb-3 border-b">
          <SheetTitle className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center shadow-lg" style={{ background: "linear-gradient(135deg, var(--primary), color-mix(in oklch, var(--primary), #000 30%))" }}>
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-base leading-none">Money Flow</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Finanzas con IA</p>
            </div>
          </SheetTitle>
        </SheetHeader>
        <nav className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-0.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = view === item.key;
            return (
              <button
                key={item.key}
                onClick={() => handleNavigate(item)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  item.action === "openAddDialog" &&
                    !active &&
                    "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
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
      </SheetContent>
    </Sheet>
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
  const { view, setView, setAddOpen } = useAppStore();
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
              onClick={() => {
                if (item.action === "openAddDialog") {
                  setAddOpen(true);
                } else {
                  setView(item.key);
                }
              }}
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
