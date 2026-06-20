import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { useMe } from "@/hooks/useMe";

export function AppLayout() {
  useMe(); // syncs user profile (including baseCurrency) from the server on mount

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto pb-16 lg:pb-0">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
