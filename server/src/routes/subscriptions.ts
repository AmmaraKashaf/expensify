import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import type { AuthRequest } from "../middleware/auth";

const router = Router();

const subscriptionSchema = z.object({
  name: z.string().min(1).max(80),
  categoryId: z.string().uuid(),
  amount: z.coerce.number().positive(),
  billingCycle: z.enum(["monthly", "quarterly", "yearly"]),
  nextBillingDate: z.string(),
  reminderDaysBefore: z.coerce.number().int().min(0).max(30).default(3),
  notes: z.string().optional().nullable(),
});

function monthlyEquivalent(amount: number, cycle: string): number {
  if (cycle === "yearly") return amount / 12;
  if (cycle === "quarterly") return amount / 3;
  return amount;
}

// GET /api/subscriptions
router.get("/", asyncHandler(async (req: AuthRequest, res: Response) => {
  const subs = await prisma.subscription.findMany({
    where: { userId: req.userId!, isActive: true },
    include: { category: true },
    orderBy: { nextBillingDate: "asc" },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result = subs.map((s) => {
    const next = new Date(s.nextBillingDate);
    next.setHours(0, 0, 0, 0);
    const daysUntil = Math.ceil((next.getTime() - today.getTime()) / 86_400_000);
    return {
      id: s.id,
      name: s.name,
      category: s.category,
      amount: Number(s.amount),
      billingCycle: s.billingCycle,
      nextBillingDate: s.nextBillingDate,
      daysUntil,
      monthlyEquivalent: monthlyEquivalent(Number(s.amount), s.billingCycle),
      reminderDaysBefore: s.reminderDaysBefore,
      notes: s.notes,
      isActive: s.isActive,
    };
  });

  const totalMonthly = result.reduce((s, r) => s + r.monthlyEquivalent, 0);

  res.json({ subscriptions: result, totalMonthly });
}));

// POST /api/subscriptions
router.post("/", asyncHandler(async (req: AuthRequest, res: Response) => {
  const parsed = subscriptionSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const sub = await prisma.subscription.create({
    data: {
      ...parsed.data,
      userId: req.userId!,
      currency: "PKR",
      nextBillingDate: new Date(parsed.data.nextBillingDate),
    },
    include: { category: true },
  });
  res.status(201).json(sub);
}));

// PUT /api/subscriptions/:id
router.put("/:id", asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);
  const existing = await prisma.subscription.findFirst({ where: { id, userId: req.userId! } });
  if (!existing) { res.status(404).json({ error: "Subscription not found" }); return; }

  const parsed = subscriptionSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const { nextBillingDate, ...rest } = parsed.data;
  const sub = await prisma.subscription.update({
    where: { id },
    data: {
      ...rest,
      ...(nextBillingDate ? { nextBillingDate: new Date(nextBillingDate) } : {}),
    },
    include: { category: true },
  });
  res.json(sub);
}));

// PATCH /api/subscriptions/:id/toggle  — activate / deactivate
router.patch("/:id/toggle", asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);
  const existing = await prisma.subscription.findFirst({ where: { id, userId: req.userId! } });
  if (!existing) { res.status(404).json({ error: "Subscription not found" }); return; }

  const sub = await prisma.subscription.update({
    where: { id },
    data: { isActive: !existing.isActive },
  });
  res.json(sub);
}));

// DELETE /api/subscriptions/:id
router.delete("/:id", asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);
  const existing = await prisma.subscription.findFirst({ where: { id, userId: req.userId! } });
  if (!existing) { res.status(404).json({ error: "Subscription not found" }); return; }
  await prisma.subscription.delete({ where: { id } });
  res.status(204).send();
}));

export default router;
