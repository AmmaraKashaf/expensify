import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface GoalEntry {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  remaining: number;
  percentage: number;
  isCompleted: boolean;
  deadline: string | null;
  daysLeft: number | null;
  icon: string;
  colorHex: string;
  recentContributions: { id: string; amount: number; date: string }[];
}

export interface GoalPayload {
  name: string;
  targetAmount: number;
  deadline?: string | null;
  colorHex?: string;
}

const QK = ["goals"];

export function useGoals() {
  return useQuery({
    queryKey: QK,
    queryFn: () => api.get<GoalEntry[]>("/goals").then((r) => r.data),
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: GoalPayload) => api.post("/goals", data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: GoalPayload & { id: string }) =>
      api.put(`/goals/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/goals/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
}

export function useAddContribution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, amount, date }: { goalId: string; amount: number; date?: string }) =>
      api.post(`/goals/${goalId}/contributions`, { amount, date }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
}
