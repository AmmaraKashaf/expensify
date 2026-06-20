import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import type { User } from "@/types";

interface ServerUser {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  baseCurrency: string;
  themePreference: "light" | "dark" | "system";
  createdAt: string;
}

function toUser(u: ServerUser): User {
  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
    baseCurrency: u.baseCurrency,
    themePreference: u.themePreference,
    createdAt: u.createdAt,
  };
}

export function useMe() {
  const { isDemo, setUser } = useAuthStore();

  return useQuery({
    queryKey: ["me"],
    enabled: !isDemo,
    queryFn: async () => {
      const { data } = await api.get<ServerUser>("/users/me");
      const user = toUser(data);
      setUser(user);
      return user;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateCurrency() {
  const qc = useQueryClient();
  const { setUser } = useAuthStore();

  return useMutation({
    mutationFn: (baseCurrency: string) =>
      api.patch<ServerUser>("/users/me", { baseCurrency }).then((r) => toUser(r.data)),
    onSuccess: (user) => {
      setUser(user);
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}
