import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import type { AuthRequest } from "../middleware/auth";

const router = Router();

const budgetSchema = z.object({
  categoryId: z.string().uuid().nullable().optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/, "month must be YYYY-MM"),
  amount: z.coerce.number().positive(),
  alertThreshold75: z.boolean().default(true),
  alertThreshold90: z.boolean().default(true),
});

function monthToDate(ym: string): Date {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1);
}

function monthBounds(ym: string): { gte: Date; lt: Date } {
  const [y, m] = ym.split("-").map(Number);
  return {
    gte: new Date(y, m - 1, 1),
    lt: new Date(y, m, 1),
  };
}

// GET /api/budgets?month=YYYY-MM
router.get("/", asyncHandler(async (req: AuthRequest, res: Response) => {
  const month = typeof req.query.month === "string" && /^\d{4}-\d{2}$/.test(req.query.month)
    ? req.query.month
    : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

  const bounds = monthBounds(month);

  const [budgets, spendByCategory] = await Promise.all([
    prisma.budget.findMany({
      where: { userId: req.userId!, month: monthToDate(month) },
      include: { category: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: {
        userId: req.userId!,
        type: "expense",
        date: bounds,
        deletedAt: null,
      },
      _sum: { convertedAmount: true },
    }),
  ]);

  const spentMap = new Map(
    spendByCategory.map((r) => [r.categoryId, Number(r._sum.convertedAmount ?? 0)])
  );

  const totalSpent = [...spentMap.values()].reduce((a, b) => a + b, 0);

  const result = budgets.map((b) => {
    const spent = b.categoryId ? (spentMap.get(b.categoryId) ?? 0) : totalSpent;
    const budgetAmount = Number(b.amount);
    const percentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;
    return {
      id: b.id,
      categoryId: b.categoryId,
      category: b.category,
      month,
      amount: budgetAmount,
      spent,
      remaining: Math.max(0, budgetAmount - spent),
      percentage: Math.min(percentage, 100),
      isOverBudget: spent > budgetAmount,
      alertThreshold75: b.alertThreshold75,
      alertThreshold90: b.alertThreshold90,
    };
  });

  res.json(result);
}));

// POST /api/budgets
router.post("/", asyncHandler(async (req: AuthRequest, res: Response) => {
  const parsed = budgetSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { month, categoryId, ...rest } = parsed.data;
  const budget = await prisma.budget.create({
    data: {
      ...rest,
      userId: req.userId!,
      categoryId: categoryId ?? null,
      month: monthToDate(month),
    },
    include: { category: true },
  });
  res.status(201).json(budget);
}));

// PUT /api/budgets/:id
router.put("/:id", asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);
  const existing = await prisma.budget.findFirst({ where: { id, userId: req.userId! } });
  if (!existing) { res.status(404).json({ error: "Budget not found" }); return; }

  const parsed = budgetSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const { month, categoryId, ...rest } = parsed.data;
  const budget = await prisma.budget.update({
    where: { id },
    data: {
      ...rest,
      ...(categoryId !== undefined ? { categoryId: categoryId ?? null } : {}),
      ...(month ? { month: monthToDate(month) } : {}),
    },
    include: { category: true },
  });
  res.json(budget);
}));

// DELETE /api/budgets/:id
router.delete("/:id", asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);
  const existing = await prisma.budget.findFirst({ where: { id, userId: req.userId! } });
  if (!existing) { res.status(404).json({ error: "Budget not found" }); return; }
  await prisma.budget.delete({ where: { id } });
  res.status(204).send();
}));

export default router;
