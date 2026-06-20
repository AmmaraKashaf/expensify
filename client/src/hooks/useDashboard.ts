import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { DashboardSummary } from "@/types";
import { useDashboardStore } from "@/store/dashboardStore";
import { getMonthRange } from "@/lib/utils";

export function useDashboard() {
  const { period, customRange } = useDashboardStore();

  const getDateRange = () => {
    const now = new Date();
    // Use day boundaries so the query key stays stable within the same day
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (period === "week") {
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0, 0);
      return { start: weekStart.toISOString(), end: todayEnd.toISOString() };
    }
    if (period === "year") {
      return {
        start: new Date(now.getFullYear(), 0, 1).toISOString(),
        end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999).toISOString(),
      };
    }
    if (period === "custom" && customRange) return customRange;
    const { start, end } = getMonthRange(now);
    return { start: start.toISOString(), end: end.toISOString() };
  };

  const range = getDateRange();

  return useQuery({
    queryKey: ["dashboard", period, range.start, range.end],
    queryFn: () =>
      api.get<DashboardSummary>(`/dashboard/summary?start=${range.start}&end=${range.end}`).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
}
