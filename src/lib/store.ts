"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ViewKey =
  | "dashboard"
  | "movements"
  | "add"
  | "scan"
  | "import"
  | "budgets"
  | "subscriptions"
  | "stats"
  | "accounts"
  | "categories"
  | "assistant"
  | "goals"
  | "reminders"
  | "calendar"
  | "settings";

export type AddType = "expense" | "income" | "transfer" | null;

interface AppState {
  view: ViewKey;
  setView: (v: ViewKey) => void;
  // Popover menu (3 opciones: Gasto / Ingreso / Transferencia)
  addOpen: boolean;
  setAddOpen: (v: boolean) => void;
  // Tipo de dialog abierto: expense | income | transfer | null
  addType: AddType;
  setAddType: (v: AddType) => void;
  // Acción contextual del botón "+": cada vista registra su propio handler
  viewAddHandler: (() => void) | null;
  setViewAddHandler: (fn: (() => void) | null) => void;
  // Disparador: el botón "+" del header llama a esto
  triggerAdd: () => void;
  // Filtros rápidos
  selectedMonth: string; // YYYY-MM
  setSelectedMonth: (m: string) => void;
  // Sidebar colapsado
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      view: "dashboard",
      setView: (view) => set({ view }),
      addOpen: false,
      setAddOpen: (addOpen) => set({ addOpen }),
      addType: null,
      setAddType: (addType) => set({ addType }),
      viewAddHandler: null,
      setViewAddHandler: (fn) => set({ viewAddHandler: fn }),
      triggerAdd: () => {
        const handler = get().viewAddHandler;
        if (handler) {
          handler();
        } else {
          // Comportamiento por defecto: abrir el menú de agregar movimiento
          set({ addOpen: true });
        }
      },
      selectedMonth: new Date().toISOString().slice(0, 7),
      setSelectedMonth: (selectedMonth) => set({ selectedMonth }),
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
    }),
    {
      name: "moneyflow-sidebar",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }),
    }
  )
);
