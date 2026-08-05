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
      palette: "emerald",
      setPalette: (palette) => set({ palette }),
    }),
    {
      name: "finzeni-palette",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
