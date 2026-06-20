import { useState } from "react";
import { Plus, TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, BarChart3 } from "lucide-react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as ReTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from "recharts";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TransactionForm } from "@/pages/transactions/TransactionForm";
import { useDashboard } from "@/hooks/useDashboard";
import { useDashboardStore } from "@/store/dashboardStore";
import { useAuthStore } from "@/store/authStore";
import { useCurrency, formatRelativeDate } from "@/lib/utils";
import type { PeriodFilter } from "@/types";

const PERIODS: { value: PeriodFilter; label: string }[] = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

function SummaryCard({ label, value, icon: Icon, gradient, textColor }: {
  label: string; value: number; icon: React.ElementType; gradient: string; textColor: string;
}) {
  const { format } = useCurrency();
  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="p-0">
        <div className={`p-5 ${gradient}`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{label}</p>
              <p className={`text-2xl font-bold tabular-nums ${textColor}`}>
                {format(value)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
              <Icon className={`w-5 h-5 ${textColor}`} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const { period, setPeriod } = useDashboardStore();
  const { data, isLoading } = useDashboard();
  const { format, currency } = useCurrency();
  const { user, isDemo } = useAuthStore();
  const [formOpen, setFormOpen] = useState(false);

  const firstName = isDemo
    ? "Guest"
    : (user?.displayName?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "there");

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const summary = data!;
  const netPositive = summary.netBalance >= 0;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hi, {firstName}!</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Here's your financial overview</p>
        </div>
        <div className="flex items-center gap-3">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
            <TabsList className="h-9">
              {PERIODS.map(({ value, label }) => (
                <TabsTrigger key={value} value={value} className="text-xs px-3">{label}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Button size="sm" onClick={() => setFormOpen(true)} className="gap-1.5">
            <Plus className="w-4 h-4" /> Add
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: "Net Balance",
            value: summary.netBalance,
            icon: Wallet,
            gradient: netPositive ? "bg-emerald-500/10" : "bg-red-500/10",
            textColor: netPositive ? "text-emerald-400" : "text-red-400",
          },
          {
            label: "Total Income",
            value: summary.totalIncome,
            icon: TrendingUp,
            gradient: "bg-teal-500/10",
            textColor: "text-teal-400",
          },
          {
            label: "Total Expenses",
            value: summary.totalExpenses,
            icon: TrendingDown,
            gradient: "bg-amber-500/10",
            textColor: "text-amber-400",
          },
        ].map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <SummaryCard {...card} />
          </motion.div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Donut chart */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm font-semibold">Spending by Category</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {summary.categoryBreakdown.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
                <TrendingDown className="w-8 h-8 opacity-30" />
                <p className="text-sm">No expense data for this period</p>
              </div>
            ) : (
              <div className="flex items-center gap-6">
                <div className="shrink-0">
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie
                        data={summary.categoryBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={72}
                        paddingAngle={2}
                        dataKey="amount"
                        strokeWidth={0}
                      >
                        {summary.categoryBreakdown.map((entry, i) => (
                          <Cell key={i} fill={entry.colorHex} />
                        ))}
                      </Pie>
                      <ReTooltip
                        formatter={(value: number) => [format(value), "Amount"]}
                        contentStyle={{ fontSize: 12, background: '#1E293B', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, color: '#F1F5F9' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2.5 min-w-0">
                  {summary.categoryBreakdown.slice(0, 6).map((cat) => (
                    <div key={cat.categoryId} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.colorHex }} />
                      <span className="text-xs truncate flex-1 text-muted-foreground">{cat.name}</span>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-semibold tabular-nums">{cat.percentage.toFixed(0)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bar chart */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm font-semibold">Income vs Expenses</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {summary.incomeVsExpenseChart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
                <BarChart3 className="w-8 h-8 opacity-30" />
                <p className="text-sm">No data for this period</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={195}>
                <BarChart data={summary.incomeVsExpenseChart} barSize={12} barGap={3}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${currency} ${(v / 1000).toFixed(0)}k`} width={65} />
                  <ReTooltip
                    formatter={(value: number) => format(value)}
                    contentStyle={{ fontSize: 12, background: '#1E293B', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, color: '#F1F5F9' }}
                  />
                  <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="income" name="Income" fill="#2DD4BF" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="expense" name="Expenses" fill="#F59E0B" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent transactions */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Recent Transactions</CardTitle>
          <span className="text-xs text-muted-foreground">{summary.recentTransactions.length} entries</span>
        </CardHeader>
        <CardContent className="p-0">
          {summary.recentTransactions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center">No transactions yet — add your first one!</p>
          ) : (
            <div>
              {summary.recentTransactions.map((t, i) => (
                <div
                  key={t.id}
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors ${i !== summary.recentTransactions.length - 1 ? "border-b" : ""}`}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: (t.category?.colorHex ?? "#6B7280") + "25" }}
                  >
                    {t.type === "income"
                      ? <ArrowUpRight className="w-4 h-4 text-teal-400" />
                      : <ArrowDownRight className="w-4 h-4 text-red-400" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.merchantName || t.description || t.category?.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.category?.colorHex ?? "#6B7280" }} />
                      <span className="text-xs text-muted-foreground">{t.category?.name}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{formatRelativeDate(t.date)}</span>
                    </div>
                  </div>
                  <span className={`text-sm font-bold tabular-nums shrink-0 ${t.type === "income" ? "text-teal-400" : "text-red-400"}`}>
                    {t.type === "income" ? "+" : "−"}{format(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <TransactionForm open={formOpen} onClose={() => setFormOpen(false)} />

      <button
        onClick={() => setFormOpen(true)}
        className="lg:hidden fixed bottom-20 right-4 w-14 h-14 rounded-full bg-primary text-white shadow-xl flex items-center justify-center"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}
