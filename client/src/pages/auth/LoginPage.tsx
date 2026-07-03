import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Wallet, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import type { User } from "@/types";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
type LoginData = z.infer<typeof loginSchema>;

const resetSchema = z.object({
  email: z.string().email("Invalid email address"),
});
type ResetData = z.infer<typeof resetSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [resetSent, setResetSent] = useState(false);

  const loginForm = useForm<LoginData>({ resolver: zodResolver(loginSchema) });
  const resetForm = useForm<ResetData>({ resolver: zodResolver(resetSchema) });

  async function onLogin(data: LoginData) {
    setLoading(true);
    setError("");
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }
    if (authData.user) {
      setUser({
        id: authData.user.id,
        email: authData.user.email!,
        displayName: authData.user.user_metadata?.display_name,
        baseCurrency: "USD",
        themePreference: "system",
        createdAt: authData.user.created_at,
      } as User);
      navigate("/");
    }
    setLoading(false);
  }

  async function onResetPassword(data: ResetData) {
    setLoading(true);
    setError("");
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/login`,
    });
    if (resetError) {
      setError(resetError.message);
    } else {
      setResetSent(true);
    }
    setLoading(false);
  }

  function switchToForgot() {
    setMode("forgot");
    setError("");
    setResetSent(false);
  }

  function switchToLogin() {
    setMode("login");
    setError("");
    setResetSent(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Welcome to Expensify</h1>
          <p className="text-muted-foreground text-sm">Your personal finance command center</p>
        </div>

        <Card>
          {mode === "login" ? (
            <>
              <CardHeader>
                <CardTitle>Sign in</CardTitle>
                <CardDescription>Enter your credentials to access your account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      {...loginForm.register("email")}
                    />
                    {loginForm.formState.errors.email && (
                      <p className="text-xs text-destructive">{loginForm.formState.errors.email.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <button
                        type="button"
                        onClick={switchToForgot}
                        className="text-xs text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      {...loginForm.register("password")}
                    />
                    {loginForm.formState.errors.password && (
                      <p className="text-xs text-destructive">{loginForm.formState.errors.password.message}</p>
                    )}
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Sign in
                  </Button>
                </form>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader>
                <button
                  type="button"
                  onClick={switchToLogin}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to sign in
                </button>
                <CardTitle>Reset password</CardTitle>
                <CardDescription>
                  Enter your email and we&apos;ll send you a link to reset your password.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {resetSent ? (
                  <div className="rounded-md bg-primary/10 border border-primary/20 p-4 text-sm text-center space-y-1">
                    <p className="font-medium text-primary">Check your inbox</p>
                    <p className="text-muted-foreground">
                      A password reset link has been sent to{" "}
                      <span className="font-medium text-foreground">
                        {resetForm.getValues("email")}
                      </span>
                    </p>
                  </div>
                ) : (
                  <form onSubmit={resetForm.handleSubmit(onResetPassword)} className="space-y-4">
                    <div className="space-y-1">
                      <Label htmlFor="reset-email">Email</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="you@example.com"
                        {...resetForm.register("email")}
                      />
                      {resetForm.formState.errors.email && (
                        <p className="text-xs text-destructive">{resetForm.formState.errors.email.message}</p>
                      )}
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Send reset link
                    </Button>
                  </form>
                )}
              </CardContent>
            </>
          )}
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link to="/signup" className="text-primary font-medium hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
