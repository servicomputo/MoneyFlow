"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type DataMode = "local" | "server";

interface DataModeState {
  mode: DataMode;
  serverUrl: string; // base URL del servidor Money Flow para modo server (vacío = mismo origen)
  iaServerUrl: string; // URL del servidor solo para IA en modo local (Premium)
  setMode: (m: DataMode) => void;
  setServerUrl: (u: string) => void;
  setIaServerUrl: (u: string) => void;
}

export const useDataModeStore = create<DataModeState>()(
  persist(
    (set) => ({
      mode: "local",
      serverUrl: "",
      iaServerUrl: "",
      setMode: (mode) => set({ mode }),
      setServerUrl: (serverUrl) => set({ serverUrl }),
      setIaServerUrl: (iaServerUrl) => set({ iaServerUrl }),
    }),
    {
      name: "moneyflow-data-mode",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
