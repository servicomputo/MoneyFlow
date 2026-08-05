"use client";

import { create } from "zustand";

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
  // Toast helpers
}

export const useAppStore = create<AppState>((set) => ({
  view: "dashboard",
  setView: (view) => set({ view }),
  addOpen: false,
  setAddOpen: (addOpen) => set({ addOpen }),
  selectedMonth: new Date().toISOString().slice(0, 7),
  setSelectedMonth: (selectedMonth) => set({ selectedMonth }),
}));
