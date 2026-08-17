"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { PaletteKey } from "@/lib/palettes";

interface PaletteState {
  palette: PaletteKey;
  setPalette: (p: PaletteKey) => void;
}

export const usePaletteStore = create<PaletteState>()(
  persist(
    (set) => ({
      palette: "gold",
      setPalette: (palette) => set({ palette }),
    }),
    {
      name: "moneyflow-palette",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
