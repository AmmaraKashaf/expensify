import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as ReTooltip, Legend
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";
import { useCurrency } from "@/lib/utils";

type ViewType = "weekly" | "monthly" | "yearly";

interface ReportData {
  chart: { label: string; income: number; expense: number }[];
  categoryBreakdown: { categoryId: string; name: string; colorHex: string; income: number; expense: number; percentage: number }[];
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
}

export function ReportsPage() {
  const [view, setView] = useState<ViewType>("monthly");
  const { format, currency } = useCurrency();

  const { data, isLoading } = useQuery({
    queryKey: ["reports", view],
    queryFn: () => api.get<ReportData>(`/reports?view=${view}`).then((r) => r.data),
  });

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-sm text-muted-foreground">Analyse your spending patterns</p>
        </div>
        <Tabs value={view} onValueChange={(v) => setView(v as ViewType)}>
          <TabsList>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="yearly">Yearly</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : data ? (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Total Income", value: data.totalIncome, color: "text-emerald-500" },
              { label: "Total Expenses", value: data.totalExpenses, color: "text-red-500" },
              { label: "Net Balance", value: data.netBalance, color: data.netBalance >= 0 ? "text-emerald-500" : "text-red-500" },
            ].map(({ label, value, color }) => (
              <Card key={label}>
                <CardContent className="p-5">
                  <p className="text-xs text-muted-foreground font-medium">{label}</p>
                  <p className={`text-2xl font-bold tabular-nums mt-1 ${color}`}>{format(value)}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Bar chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Income vs Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.chart} barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${currency} ${(v / 1000).toFixed(0)}k`} />
                  <ReTooltip formatter={(value: number) => format(value)} />
                  <Legend />
                  <Bar dataKey="income" name="Income" fill="#10B981" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="expense" name="Expenses" fill="#EF4444" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Category breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Spending by Category</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.categoryBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No data for this period</p>
              ) : (
                data.categoryBreakdown.map((cat) => (
                  <div key={cat.categoryId} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.colorHex }} />
                        <span className="font-medium">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <span className="tabular-nums text-red-500">{format(cat.expense)}</span>
                        <span className="text-xs">{cat.percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                    <Progress
                      value={cat.percentage}
                      className="h-1.5"
                    />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
