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
  | "settings";

interface AppState {
  view: ViewKey;
  setView: (v: ViewKey) => void;
  // Para re-abrir el modal de agregar gasto desde cualquier vista
  addOpen: boolean;
  setAddOpen: (v: boolean) => void;
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
    (set) => ({
      view: "dashboard",
      setView: (view) => set({ view }),
      addOpen: false,
      setAddOpen: (addOpen) => set({ addOpen }),
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
