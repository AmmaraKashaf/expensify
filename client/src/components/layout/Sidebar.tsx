import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, ArrowLeftRight, BarChart3, Settings, Wallet,
  Target, CreditCard, Bell, Moon, Sun
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useThemeStore, applyTheme } from "@/store/themeStore";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/transactions", icon: ArrowLeftRight, label: "Transactions" },
  { to: "/reports", icon: BarChart3, label: "Reports" },
  { to: "/budgets", icon: Wallet, label: "Budgets" },
  { to: "/goals", icon: Target, label: "Goals" },
  { to: "/subscriptions", icon: CreditCard, label: "Subscriptions" },
  { to: "/reminders", icon: Bell, label: "Reminders" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const { resolved, setResolved, setPreference } = useThemeStore();

  function toggleTheme() {
    const next = resolved === "dark" ? "light" : "dark";
    setPreference(next);
    setResolved(next);
    applyTheme(next);
  }

  return (
    <aside className="hidden lg:flex flex-col w-60 min-h-screen border-r bg-card px-3 py-5 gap-1">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3 mb-5">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
          <Wallet className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-lg tracking-tight">WealthLens</span>
      </div>

      <nav className="flex-1 flex flex-col gap-0.5">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="pt-2 border-t">
        <Button variant="ghost" size="sm" className="w-full justify-start gap-3 px-3 text-muted-foreground" onClick={toggleTheme}>
          {resolved === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          <span className="text-sm">{resolved === "dark" ? "Light mode" : "Dark mode"}</span>
        </Button>
      </div>
    </aside>
  );
}
