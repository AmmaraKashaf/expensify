import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface ReminderEntry {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  daysUntil: number;
  recurrence: "once" | "monthly" | "quarterly" | "yearly";
  isPaid: boolean;
}

export interface ReminderPayload {
  title: string;
  amount: number;
  dueDate: string;
  recurrence: "once" | "monthly" | "quarterly" | "yearly";
}

const QK = ["reminders"];

export function useReminders() {
  return useQuery({
    queryKey: QK,
    queryFn: () => api.get<ReminderEntry[]>("/reminders").then((r) => r.data),
  });
}

export function useCreateReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ReminderPayload) => api.post("/reminders", data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
}

export function useUpdateReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: ReminderPayload & { id: string }) =>
      api.put(`/reminders/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
}

export function useMarkPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/reminders/${id}/mark-paid`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
}

export function useUnmarkPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/reminders/${id}/unmark-paid`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
}

export function useDeleteReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/reminders/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
}
