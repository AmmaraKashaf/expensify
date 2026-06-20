import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import type { AuthRequest } from "../middleware/auth";

const router = Router();

const transactionSchema = z.object({
  categoryId: z.string().uuid(),
  type: z.enum(["income", "expense"]),
  amount: z.number().positive(),
  currency: z.string().length(3).default("USD"),
  description: z.string().optional(),
  merchantName: z.string().optional(),
  date: z.string(),
  paymentMethod: z.enum(["cash", "card", "upi", "bank_transfer", "other"]).default("other"),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
});

// GET /api/transactions
router.get("/", asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page = "1", limit = "50", type, categoryId, startDate, endDate, search } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

  const where: Record<string, unknown> = {
    userId: req.userId,
    deletedAt: null,
  };
  if (type) where.type = type as string;
  if (categoryId) where.categoryId = categoryId as string;
  if (startDate || endDate) {
    where.date = {};
    if (startDate) (where.date as Record<string, unknown>).gte = new Date(startDate as string);
    if (endDate) (where.date as Record<string, unknown>).lte = new Date(endDate as string);
  }
  if (search) {
    where.OR = [
      { description: { contains: search as string, mode: "insensitive" } },
      { merchantName: { contains: search as string, mode: "insensitive" } },
    ];
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: { category: true },
      orderBy: { date: "desc" },
      skip,
      take: parseInt(limit as string),
    }),
    prisma.transaction.count({ where }),
  ]);

  res.json({ transactions, total, page: parseInt(page as string), limit: parseInt(limit as string) });
}));

// POST /api/transactions
router.post("/", asyncHandler(async (req: AuthRequest, res: Response) => {
  const parsed = transactionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const data = parsed.data;

  const transaction = await prisma.transaction.create({
    data: {
      userId: req.userId!,
      categoryId: data.categoryId,
      type: data.type,
      amount: data.amount,
      currency: data.currency,
      convertedAmount: data.amount,
      description: data.description,
      merchantName: data.merchantName,
      date: new Date(data.date),
      paymentMethod: data.paymentMethod,
      tags: data.tags,
      notes: data.notes,
    },
    include: { category: true },
  });

  res.status(201).json(transaction);
}));

// PUT /api/transactions/:id
router.put("/:id", asyncHandler(async (req: AuthRequest, res: Response) => {
  const parsed = transactionSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const id = String(req.params.id);
  const existing = await prisma.transaction.findFirst({
    where: { id, userId: req.userId, deletedAt: null },
  });
  if (!existing) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }

  const data = parsed.data;
  const transaction = await prisma.transaction.update({
    where: { id },
    data: {
      ...(data.categoryId && { categoryId: data.categoryId }),
      ...(data.type && { type: data.type }),
      ...(data.amount !== undefined && { amount: data.amount, convertedAmount: data.amount }),
      ...(data.currency && { currency: data.currency }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.merchantName !== undefined && { merchantName: data.merchantName }),
      ...(data.date && { date: new Date(data.date) }),
      ...(data.paymentMethod && { paymentMethod: data.paymentMethod }),
      ...(data.tags && { tags: data.tags }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
    include: { category: true },
  });

  res.json(transaction);
}));

// DELETE /api/transactions/:id (soft delete)
router.delete("/:id", asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);
  const existing = await prisma.transaction.findFirst({
    where: { id, userId: req.userId, deletedAt: null },
  });
  if (!existing) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }

  await prisma.transaction.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  res.status(204).send();
}));

export default router;
