import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface SubscriptionEntry {
  id: string;
  name: string;
  category: { id: string; name: string; colorHex: string } | null;
  amount: number;
  billingCycle: "monthly" | "quarterly" | "yearly";
  nextBillingDate: string;
  daysUntil: number;
  monthlyEquivalent: number;
  reminderDaysBefore: number;
  notes: string | null;
  isActive: boolean;
}

export interface SubscriptionsResponse {
  subscriptions: SubscriptionEntry[];
  totalMonthly: number;
}

export interface SubscriptionPayload {
  name: string;
  categoryId: string;
  amount: number;
  billingCycle: "monthly" | "quarterly" | "yearly";
  nextBillingDate: string;
  reminderDaysBefore?: number;
  notes?: string | null;
}

const QK = ["subscriptions"];

export function useSubscriptions() {
  return useQuery({
    queryKey: QK,
    queryFn: () => api.get<SubscriptionsResponse>("/subscriptions").then((r) => r.data),
  });
}

export function useCreateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SubscriptionPayload) => api.post("/subscriptions", data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
}

export function useUpdateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: SubscriptionPayload & { id: string }) =>
      api.put(`/subscriptions/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
}

export function useDeleteSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/subscriptions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
}
