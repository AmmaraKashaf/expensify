import { Moon, Sun, Monitor, LogOut, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useThemeStore, applyTheme } from "@/store/themeStore";
import { useAuthStore } from "@/store/authStore";
import { useUpdateCurrency } from "@/hooks/useMe";
import { CURRENCY_OPTIONS } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import type { ThemePreference } from "@/types";

const themeOptions: { value: ThemePreference; label: string; icon: React.ElementType }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function SettingsPage() {
  const { preference, resolved, setPreference, setResolved } = useThemeStore();
  const { user, isDemo, logout } = useAuthStore();
  const updateCurrency = useUpdateCurrency();
  const navigate = useNavigate();

  function handleTheme(pref: ThemePreference) {
    setPreference(pref);
    if (pref === "system") {
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const next = systemDark ? "dark" : "light";
      setResolved(next);
      applyTheme(next);
    } else {
      setResolved(pref);
      applyTheme(pref);
    }
  }

  async function handleLogout() {
    if (!isDemo) await supabase.auth.signOut();
    logout();
    navigate("/login");
  }

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your preferences</p>
      </div>

      {/* Account */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isDemo ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                You are in <strong>Demo mode</strong>. Changes are not saved.
                <Button variant="link" className="px-1 h-auto text-amber-700 dark:text-amber-300" onClick={() => navigate("/signup")}>
                  Sign up
                </Button>
                to save your data.
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium">{user?.displayName || "Anonymous"}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          )}
          <Separator />
          <Button variant="outline" size="sm" onClick={handleLogout} className="text-destructive hover:text-destructive">
            <LogOut className="w-4 h-4" />
            {isDemo ? "Exit demo" : "Sign out"}
          </Button>
        </CardContent>
      </Card>

      {/* Currency */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Currency</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">All amounts will be displayed in this currency.</p>
          <Select
            value={user?.baseCurrency ?? "USD"}
            onValueChange={(v) => !isDemo && updateCurrency.mutate(v)}
            disabled={isDemo || updateCurrency.isPending}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCY_OPTIONS.map((c) => (
                <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {updateCurrency.isPending && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Saving…
            </p>
          )}
          {isDemo && (
            <p className="text-xs text-muted-foreground">Sign up to save your currency preference.</p>
          )}
        </CardContent>
      </Card>

      {/* Theme */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {themeOptions.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => handleTheme(value)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${
                  preference === value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground"
                }`}
              >
                <Icon className={`w-5 h-5 ${preference === value ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-xs font-medium ${preference === value ? "text-primary" : "text-muted-foreground"}`}>
                  {label}
                </span>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Current: <span className="capitalize">{resolved}</span> mode
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
