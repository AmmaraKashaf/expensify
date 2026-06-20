import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface BudgetEntry {
  id: string;
  categoryId: string | null;
  category: { id: string; name: string; colorHex: string; icon: string } | null;
  month: string;
  amount: number;
  spent: number;
  remaining: number;
  percentage: number;
  isOverBudget: boolean;
  alertThreshold75: boolean;
  alertThreshold90: boolean;
}

export interface BudgetPayload {
  categoryId?: string | null;
  month: string;
  amount: number;
  alertThreshold75?: boolean;
  alertThreshold90?: boolean;
}

export function useBudgets(month: string) {
  return useQuery({
    queryKey: ["budgets", month],
    queryFn: () => api.get<BudgetEntry[]>(`/budgets?month=${month}`).then((r) => r.data),
  });
}

export function useCreateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BudgetPayload) => api.post("/budgets", data).then((r) => r.data),
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["budgets", vars.month] }),
  });
}

export function useUpdateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: BudgetPayload & { id: string }) =>
      api.put(`/budgets/${id}`, data).then((r) => r.data),
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["budgets", vars.month] }),
  });
}

export function useDeleteBudget(month: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/budgets/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budgets", month] }),
  });
}
