import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ThemePreference } from "@/types";

interface ThemeState {
  preference: ThemePreference;
  resolved: "light" | "dark";
  setPreference: (pref: ThemePreference) => void;
  setResolved: (resolved: "light" | "dark") => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      preference: "system",
      resolved: "light",
      setPreference: (preference) => set({ preference }),
      setResolved: (resolved) => set({ resolved }),
    }),
    { name: "expensify-theme" }
  )
);

export function applyTheme(resolved: "light" | "dark") {
  const root = document.documentElement;
  if (resolved === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}
