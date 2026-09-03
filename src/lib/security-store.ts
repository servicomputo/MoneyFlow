"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface SecurityState {
  pin: string | null;
  pinEnabled: boolean;
  setPin: (pin: string | null) => void;
  setPinEnabled: (enabled: boolean) => void;
  verifyPin: (pin: string) => boolean;
  clearPin: () => void;
}

export const useSecurityStore = create<SecurityState>()(
  persist(
    (set, get) => ({
      pin: null,
      pinEnabled: false,
      setPin: (pin) => set({ pin }),
      setPinEnabled: (pinEnabled) => {
        if (!pinEnabled) {
          // Al desactivar, borrar el PIN
          set({ pinEnabled: false, pin: null });
        } else {
          set({ pinEnabled: true });
        }
      },
      verifyPin: (inputPin) => {
        const storedPin = get().pin;
        if (!storedPin) return true;
        return inputPin === storedPin;
      },
      clearPin: () => set({ pin: null, pinEnabled: false }),
    }),
    {
      name: "moneyflow-security",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
