import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Brain, TrendingUp, TrendingDown, Wallet, AlertTriangle,
  Sparkles, ShoppingBag, ChevronLeft, ChevronRight, Activity,
  ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useCurrency } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

interface CategorySummary {
  category: string;
  total: number;
  count: number;
  percentage: number;
}

interface ReportData {
  month: string;
  total_income: number;
  total_expenses: number;
  net: number;
  by_category: CategorySummary[];
  top_merchants: { merchant: string; total: number }[];
  narrative: string;
  chart_base64: string | null;
}

interface InsightData {
  period_days: number;
  avg_daily_spend: number;
  highest_day: string | null;
  highest_day_amount: number;
  most_used_category: string | null;
  anomalies: { date: string; amount: number; zscore: number }[];
  trend: "increasing" | "decreasing" | "stable";
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function monthLabel(ym: string) {
  const [y, m] = ym.split("-");
  return new Date(Number(y), Number(m) - 1).toLocaleString("default", { month: "long", year: "numeric" });
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function stepMonth(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const TREND_CONFIG = {
  increasing: { label: "Spending up", color: "text-red-400", icon: TrendingUp },
  decreasing: { label: "Spending down", color: "text-emerald-400", icon: TrendingDown },
  stable: { label: "Stable", color: "text-blue-400", icon: Activity },
};

// ── Fetch helpers ─────────────────────────────────────────────────────────────

async function fetchReport(month: string): Promise<ReportData> {
  const { data } = await api.get(`/ai/report?month=${month}&include_chart=true`);
  return data;
}

async function fetchInsights(): Promise<InsightData> {
  const { data } = await api.get("/ai/insights?period_days=30");
  return data;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon: Icon, color, gradient,
}: {
  label: string; value: string; icon: React.ElementType; color: string; gradient: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className={`p-5 ${gradient}`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">{label}</p>
              <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ReportSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-28 rounded-2xl" />
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function AIInsightsPage() {
  const [month, setMonth] = useState(currentMonth);
  const { format } = useCurrency();

  const report = useQuery({
    queryKey: ["ai-report", month],
    queryFn: () => fetchReport(month),
    retry: 1,
  });

  const insights = useQuery({
    queryKey: ["ai-insights"],
    queryFn: fetchInsights,
    retry: 1,
    staleTime: 5 * 60_000,
  });

  const trendCfg = insights.data ? TREND_CONFIG[insights.data.trend] : null;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AI Insights</h1>
            <p className="text-sm text-muted-foreground">LLM-powered spending analysis</p>
          </div>
        </div>

        {/* Month navigator */}
        <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-1.5">
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => setMonth((m) => stepMonth(m, -1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium w-36 text-center">{monthLabel(month)}</span>
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => setMonth((m) => stepMonth(m, 1))}
            disabled={month >= currentMonth()}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Report section */}
      {report.isLoading ? (
        <ReportSkeleton />
      ) : report.isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <AlertTriangle className="w-8 h-8 text-destructive" />
            <p className="text-sm text-muted-foreground">
              AI service is unavailable. Make sure the Python service is running on the server.
            </p>
            <Button variant="outline" size="sm" onClick={() => report.refetch()}>Retry</Button>
          </CardContent>
        </Card>
      ) : report.data ? (
        <div className="space-y-4">
          {/* LLM Narrative */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-5">
                <div className="flex gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1.5">AI Summary</p>
                    <p className="text-sm leading-relaxed text-foreground">{report.data.narrative}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Stats row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <StatCard
                label="Total Income"
                value={format(report.data.total_income)}
                icon={ArrowUpRight}
                color="text-teal-400"
                gradient="bg-teal-500/10"
              />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <StatCard
                label="Total Expenses"
                value={format(report.data.total_expenses)}
                icon={ArrowDownRight}
                color="text-amber-400"
                gradient="bg-amber-500/10"
              />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <StatCard
                label="Net Savings"
                value={format(report.data.net)}
                icon={Wallet}
                color={report.data.net >= 0 ? "text-emerald-400" : "text-red-400"}
                gradient={report.data.net >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"}
              />
            </motion.div>
          </div>

          {/* Chart + Categories */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Matplotlib chart */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-sm font-semibold">Spending by Category</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {report.data.chart_base64 ? (
                  <img
                    src={`data:image/png;base64,${report.data.chart_base64}`}
                    alt="Spending by category chart"
                    className="w-full rounded-lg"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No chart data</p>
                )}
              </CardContent>
            </Card>

            {/* Category breakdown list */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-sm font-semibold">Category Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="pt-3 space-y-3">
                {report.data.by_category.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No expenses this month</p>
                ) : (
                  report.data.by_category.map((cat) => (
                    <div key={cat.category}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium truncate flex-1">{cat.category}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-muted-foreground">{cat.count} txn{cat.count !== 1 ? "s" : ""}</span>
                          <span className="text-xs font-bold tabular-nums">{format(cat.total)}</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary/70 transition-all duration-500"
                          style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top Merchants */}
          {report.data.top_merchants.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-semibold">Top Merchants</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {report.data.top_merchants.map((m, i) => (
                  <div
                    key={m.merchant}
                    className={`flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors ${i !== report.data!.top_merchants.length - 1 ? "border-b" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{i + 1}</span>
                      <span className="text-sm font-medium">{m.merchant}</span>
                    </div>
                    <span className="text-sm font-bold tabular-nums text-amber-400">{format(m.total)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}

      {/* Spending Insights (30-day stats) */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">30-Day Insights</h2>
        {insights.isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
        ) : insights.data ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Avg Daily Spend</p>
                  <p className="text-2xl font-bold text-amber-400 tabular-nums">{format(insights.data.avg_daily_spend)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Highest Day</p>
                  <p className="text-2xl font-bold text-red-400 tabular-nums">{format(insights.data.highest_day_amount)}</p>
                  {insights.data.highest_day && (
                    <p className="text-xs text-muted-foreground mt-0.5">{insights.data.highest_day}</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Spending Trend</p>
                  {trendCfg && (
                    <div className="flex items-center gap-2 mt-1">
                      <trendCfg.icon className={`w-6 h-6 ${trendCfg.color}`} />
                      <span className={`text-lg font-bold ${trendCfg.color}`}>{trendCfg.label}</span>
                    </div>
                  )}
                  {insights.data.most_used_category && (
                    <p className="text-xs text-muted-foreground mt-1">Top: {insights.data.most_used_category}</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Anomalies */}
            {insights.data.anomalies.length > 0 && (
              <Card className="border-amber-500/20 bg-amber-500/5">
                <CardHeader className="pb-3 border-b border-amber-500/10">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <CardTitle className="text-sm font-semibold text-amber-400">Unusual Spending Days</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {insights.data.anomalies.map((a, i) => (
                    <div
                      key={a.date}
                      className={`flex items-center justify-between px-4 py-3 ${i !== insights.data!.anomalies.length - 1 ? "border-b border-amber-500/10" : ""}`}
                    >
                      <div>
                        <p className="text-sm font-medium">{a.date}</p>
                        <p className="text-xs text-muted-foreground">{a.zscore.toFixed(1)}× above average</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-amber-400 border-amber-400/30 text-xs">
                          spike
                        </Badge>
                        <span className="text-sm font-bold tabular-nums text-amber-400">{format(a.amount)}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
