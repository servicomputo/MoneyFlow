"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface OpenAIState {
  apiKey: string;
  deviceId: string;
  setApiKey: (key: string) => void;
  getDeviceId: () => string;
}

function generateDeviceId(): string {
  return "dev-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

export const useOpenAIStore = create<OpenAIState>()(
  persist(
    (set, get) => ({
      apiKey: "",
      deviceId: "",
      setApiKey: (apiKey) => set({ apiKey }),
      getDeviceId: () => {
        const state = get();
        if (state.deviceId) return state.deviceId;
        const newId = generateDeviceId();
        set({ deviceId: newId });
        return newId;
      },
    }),
    {
      name: "moneyflow-openai",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
