import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import type { AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/reports?view=weekly|monthly|yearly&year=&month=
router.get("/", asyncHandler(async (req: AuthRequest, res: Response) => {
  const { view = "monthly", year, month } = req.query;
  const now = new Date();
  const y = parseInt((year as string) || String(now.getFullYear()));
  const m = parseInt((month as string) || String(now.getMonth() + 1));

  let startDate: Date;
  let endDate: Date;
  let groupBy: (date: Date) => string;

  if (view === "weekly") {
    startDate = new Date(y, m - 1, 1);
    endDate = new Date(y, m, 0);
    groupBy = (d) => `Week ${Math.ceil(d.getDate() / 7)}`;
  } else if (view === "yearly") {
    startDate = new Date(y, 0, 1);
    endDate = new Date(y, 11, 31);
    groupBy = (d) => d.toLocaleDateString("en-US", { month: "short" });
  } else {
    startDate = new Date(y - 1, m - 1, 1);
    endDate = new Date(y, m - 1, 0);
    groupBy = (d) => d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  }

  const transactions = await prisma.transaction.findMany({
    where: {
      userId: req.userId,
      deletedAt: null,
      date: { gte: startDate, lte: endDate },
    },
    include: { category: true },
    orderBy: { date: "asc" },
  });

  const chart = new Map<string, { income: number; expense: number }>();
  for (const t of transactions) {
    const label = groupBy(new Date(t.date));
    const entry = chart.get(label) || { income: 0, expense: 0 };
    if (t.type === "income") entry.income += Number(t.convertedAmount);
    else entry.expense += Number(t.convertedAmount);
    chart.set(label, entry);
  }

  const categoryBreakdown = new Map<string, { name: string; colorHex: string; income: number; expense: number }>();
  for (const t of transactions) {
    const key = t.categoryId;
    const entry = categoryBreakdown.get(key) || { name: t.category.name, colorHex: t.category.colorHex, income: 0, expense: 0 };
    if (t.type === "income") entry.income += Number(t.convertedAmount);
    else entry.expense += Number(t.convertedAmount);
    categoryBreakdown.set(key, entry);
  }

  type Tx = (typeof transactions)[number];
  const totalIncome = transactions.filter((t: Tx) => t.type === "income").reduce((s: number, t: Tx) => s + Number(t.convertedAmount), 0);
  const totalExpenses = transactions.filter((t: Tx) => t.type === "expense").reduce((s: number, t: Tx) => s + Number(t.convertedAmount), 0);

  res.json({
    chart: Array.from(chart.entries()).map(([label, d]) => ({ label, ...d })),
    categoryBreakdown: Array.from(categoryBreakdown.entries()).map(([id, d]) => ({
      categoryId: id,
      ...d,
      percentage: totalExpenses > 0 ? (d.expense / totalExpenses) * 100 : 0,
    })).sort((a, b) => b.expense - a.expense),
    totalIncome,
    totalExpenses,
    netBalance: totalIncome - totalExpenses,
  });
}));

export default router;
