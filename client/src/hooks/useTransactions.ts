import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Transaction } from "@/types";

interface TransactionFilters {
  page?: number;
  limit?: number;
  type?: string;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

interface TransactionPayload {
  categoryId: string;
  type: "income" | "expense";
  amount: number;
  currency?: string;
  description?: string;
  merchantName?: string;
  date: string;
  paymentMethod?: string;
  tags?: string[];
  notes?: string;
}

export function useTransactions(filters: TransactionFilters = {}) {
  return useQuery({
    queryKey: ["transactions", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== "") params.set(k, String(v));
      });
      const { data } = await api.get<{ transactions: Transaction[]; total: number }>(`/transactions?${params}`);
      return data;
    },
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: TransactionPayload) => api.post<Transaction>("/transactions", payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<TransactionPayload> & { id: string }) =>
      api.put<Transaction>(`/transactions/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/transactions/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
