import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import type { AuthRequest } from "../middleware/auth";

const router = Router();

const goalSchema = z.object({
  name: z.string().min(1).max(80),
  targetAmount: z.coerce.number().positive(),
  deadline: z.string().optional().nullable(),
  icon: z.string().default("piggy-bank"),
  colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#10B981"),
});

const contributionSchema = z.object({
  amount: z.coerce.number().positive(),
  date: z.string().optional(),
});

// GET /api/goals
router.get("/", asyncHandler(async (req: AuthRequest, res: Response) => {
  const goals = await prisma.savingsGoal.findMany({
    where: { userId: req.userId! },
    include: { contributions: { orderBy: { date: "desc" }, take: 5 } },
    orderBy: [{ isCompleted: "asc" }, { createdAt: "desc" }],
  });

  const result = goals.map((g) => {
    const target = Number(g.targetAmount);
    const current = Number(g.currentAmount);
    const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
    const daysLeft = g.deadline
      ? Math.ceil((new Date(g.deadline).getTime() - Date.now()) / 86_400_000)
      : null;
    return {
      id: g.id,
      name: g.name,
      targetAmount: target,
      currentAmount: current,
      remaining: Math.max(0, target - current),
      percentage,
      isCompleted: g.isCompleted,
      deadline: g.deadline,
      daysLeft,
      icon: g.icon,
      colorHex: g.colorHex,
      recentContributions: g.contributions.map((c) => ({
        id: c.id,
        amount: Number(c.amount),
        date: c.date,
      })),
    };
  });

  res.json(result);
}));

// POST /api/goals
router.post("/", asyncHandler(async (req: AuthRequest, res: Response) => {
  const parsed = goalSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const { deadline, ...rest } = parsed.data;
  const goal = await prisma.savingsGoal.create({
    data: {
      ...rest,
      userId: req.userId!,
      deadline: deadline ? new Date(deadline) : null,
    },
  });
  res.status(201).json(goal);
}));

// PUT /api/goals/:id
router.put("/:id", asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);
  const existing = await prisma.savingsGoal.findFirst({ where: { id, userId: req.userId! } });
  if (!existing) { res.status(404).json({ error: "Goal not found" }); return; }

  const parsed = goalSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const { deadline, ...rest } = parsed.data;
  const goal = await prisma.savingsGoal.update({
    where: { id },
    data: {
      ...rest,
      ...(deadline !== undefined ? { deadline: deadline ? new Date(deadline) : null } : {}),
    },
  });
  res.json(goal);
}));

// DELETE /api/goals/:id
router.delete("/:id", asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);
  const existing = await prisma.savingsGoal.findFirst({ where: { id, userId: req.userId! } });
  if (!existing) { res.status(404).json({ error: "Goal not found" }); return; }
  await prisma.savingsGoal.delete({ where: { id } });
  res.status(204).send();
}));

// POST /api/goals/:id/contributions
router.post("/:id/contributions", asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);
  const goal = await prisma.savingsGoal.findFirst({ where: { id, userId: req.userId! } });
  if (!goal) { res.status(404).json({ error: "Goal not found" }); return; }

  const parsed = contributionSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const { amount, date } = parsed.data;
  const newAmount = Number(goal.currentAmount) + amount;

  const [contribution] = await prisma.$transaction([
    prisma.savingsContribution.create({
      data: {
        goalId: id,
        amount,
        source: "manual",
        date: date ? new Date(date) : new Date(),
      },
    }),
    prisma.savingsGoal.update({
      where: { id },
      data: {
        currentAmount: newAmount,
        isCompleted: newAmount >= Number(goal.targetAmount),
      },
    }),
  ]);

  res.status(201).json(contribution);
}));

// DELETE /api/goals/:goalId/contributions/:contributionId
router.delete("/:goalId/contributions/:contributionId", asyncHandler(async (req: AuthRequest, res: Response) => {
  const goalId = String(req.params.goalId);
  const contributionId = String(req.params.contributionId);

  const goal = await prisma.savingsGoal.findFirst({ where: { id: goalId, userId: req.userId! } });
  if (!goal) { res.status(404).json({ error: "Goal not found" }); return; }

  const contribution = await prisma.savingsContribution.findFirst({ where: { id: contributionId, goalId } });
  if (!contribution) { res.status(404).json({ error: "Contribution not found" }); return; }

  const newAmount = Math.max(0, Number(goal.currentAmount) - Number(contribution.amount));

  await prisma.$transaction([
    prisma.savingsContribution.delete({ where: { id: contributionId } }),
    prisma.savingsGoal.update({
      where: { id: goalId },
      data: { currentAmount: newAmount, isCompleted: newAmount >= Number(goal.targetAmount) },
    }),
  ]);

  res.status(204).send();
}));

export default router;
