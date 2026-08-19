"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface ProfileState {
  name: string;
  email: string;
  currency: string;
  setName: (name: string) => void;
  setEmail: (email: string) => void;
  setCurrency: (currency: string) => void;
  setProfile: (data: { name?: string; email?: string; currency?: string }) => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      name: "Usuario Money Flow",
      email: "hola@moneyflow.app",
      currency: "MXN",
      setName: (name) => set({ name }),
      setEmail: (email) => set({ email }),
      setCurrency: (currency) => set({ currency }),
      setProfile: (data) =>
        set((state) => ({
          name: data.name !== undefined ? data.name : state.name,
          email: data.email !== undefined ? data.email : state.email,
          currency: data.currency !== undefined ? data.currency : state.currency,
        })),
    }),
    {
      name: "moneyflow-profile",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
