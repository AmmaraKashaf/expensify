import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  isDemo: boolean;
  setUser: (user: User | null) => void;
  setDemo: (isDemo: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isDemo: false,
      setUser: (user) => set({ user }),
      setDemo: (isDemo) => set({ isDemo }),
      logout: () => set({ user: null, isDemo: false }),
    }),
    { name: "expensify-auth" }
  )
);
