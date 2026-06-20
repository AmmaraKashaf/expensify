import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

export function ProtectedRoute() {
  const { user, isDemo } = useAuthStore();
  if (!user && !isDemo) return <Navigate to="/login" replace />;
  return <Outlet />;
}
