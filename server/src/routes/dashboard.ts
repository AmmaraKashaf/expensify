import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import type { AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/dashboard/summary?start=&end=
router.get("/summary", asyncHandler(async (req: AuthRequest, res: Response) => {
  const { start, end } = req.query;
  const startDate = start ? new Date(start as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const endDate = end ? new Date(end as string) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

  const where = {
    userId: req.userId,
    deletedAt: null,
    date: { gte: startDate, lte: endDate },
  };

  const transactions = await prisma.transaction.findMany({
    where,
    include: { category: true },
    orderBy: { date: "desc" },
  });

  type Tx = (typeof transactions)[number];

  const totalIncome = transactions
    .filter((t: Tx) => t.type === "income")
    .reduce((sum: number, t: Tx) => sum + Number(t.convertedAmount), 0);

  const totalExpenses = transactions
    .filter((t: Tx) => t.type === "expense")
    .reduce((sum: number, t: Tx) => sum + Number(t.convertedAmount), 0);

  const expensesByCategory = new Map<string, { name: string; colorHex: string; amount: number }>();
  for (const t of transactions) {
    if (t.type !== "expense") continue;
    const key = t.categoryId;
    const existing = expensesByCategory.get(key);
    if (existing) {
      existing.amount += Number(t.convertedAmount);
    } else {
      expensesByCategory.set(key, {
        name: t.category.name,
        colorHex: t.category.colorHex,
        amount: Number(t.convertedAmount),
      });
    }
  }
  const categoryBreakdown = Array.from(expensesByCategory.entries())
    .map(([categoryId, data]) => ({
      categoryId,
      ...data,
      percentage: totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const weekMap = new Map<string, { income: number; expense: number }>();
  for (const t of transactions) {
    const d = new Date(t.date);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const label = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const entry = weekMap.get(label) || { income: 0, expense: 0 };
    if (t.type === "income") entry.income += Number(t.convertedAmount);
    else entry.expense += Number(t.convertedAmount);
    weekMap.set(label, entry);
  }
  const incomeVsExpenseChart = Array.from(weekMap.entries())
    .map(([label, data]) => ({ label, ...data }))
    .slice(-8);

  const recentTransactions = transactions.slice(0, 20);

  res.json({
    totalIncome,
    totalExpenses,
    netBalance: totalIncome - totalExpenses,
    categoryBreakdown,
    incomeVsExpenseChart,
    recentTransactions,
  });
}));

export default router;
