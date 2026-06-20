import axios from "axios";
import { supabase } from "./supabase";
import { useAuthStore } from "@/store/authStore";

export const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(async (config) => {
  const { isDemo } = useAuthStore.getState();
  if (isDemo) {
    config.headers.Authorization = "Bearer demo";
    return config;
  }
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const { isDemo } = useAuthStore.getState();
    if (err.response?.status === 401 && !isDemo) {
      supabase.auth.signOut();
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);
