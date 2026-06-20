import { create } from "zustand";
import type { PeriodFilter, DateRange } from "@/types";

interface DashboardState {
  period: PeriodFilter;
  customRange: DateRange | null;
  setPeriod: (period: PeriodFilter) => void;
  setCustomRange: (range: DateRange | null) => void;
}

export const useDashboardStore = create<DashboardState>()((set) => ({
  period: "month",
  customRange: null,
  setPeriod: (period) => set({ period }),
  setCustomRange: (customRange) => set({ customRange }),
}));
