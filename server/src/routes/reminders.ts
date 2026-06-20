import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import type { AuthRequest } from "../middleware/auth";

const router = Router();

const reminderSchema = z.object({
  title: z.string().min(1).max(100),
  amount: z.coerce.number().positive(),
  dueDate: z.string(),
  recurrence: z.enum(["once", "monthly", "quarterly", "yearly"]),
});

function nextDueDate(current: Date, recurrence: string): Date {
  const d = new Date(current);
  if (recurrence === "monthly")   { d.setMonth(d.getMonth() + 1); return d; }
  if (recurrence === "quarterly") { d.setMonth(d.getMonth() + 3); return d; }
  if (recurrence === "yearly")    { d.setFullYear(d.getFullYear() + 1); return d; }
  return d;
}

// GET /api/reminders
router.get("/", asyncHandler(async (req: AuthRequest, res: Response) => {
  const reminders = await prisma.billReminder.findMany({
    where: { userId: req.userId! },
    orderBy: [{ isPaid: "asc" }, { dueDate: "asc" }],
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result = reminders.map((r) => {
    const due = new Date(r.dueDate);
    due.setHours(0, 0, 0, 0);
    const daysUntil = Math.ceil((due.getTime() - today.getTime()) / 86_400_000);
    return {
      id: r.id,
      title: r.title,
      amount: Number(r.amount),
      dueDate: r.dueDate,
      daysUntil,
      recurrence: r.recurrence,
      isPaid: r.isPaid,
    };
  });

  res.json(result);
}));

// POST /api/reminders
router.post("/", asyncHandler(async (req: AuthRequest, res: Response) => {
  const parsed = reminderSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const reminder = await prisma.billReminder.create({
    data: {
      ...parsed.data,
      userId: req.userId!,
      dueDate: new Date(parsed.data.dueDate),
    },
  });
  res.status(201).json(reminder);
}));

// PUT /api/reminders/:id
router.put("/:id", asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);
  const existing = await prisma.billReminder.findFirst({ where: { id, userId: req.userId! } });
  if (!existing) { res.status(404).json({ error: "Reminder not found" }); return; }

  const parsed = reminderSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const { dueDate, ...rest } = parsed.data;
  const reminder = await prisma.billReminder.update({
    where: { id },
    data: { ...rest, ...(dueDate ? { dueDate: new Date(dueDate) } : {}) },
  });
  res.json(reminder);
}));

// PATCH /api/reminders/:id/mark-paid  — mark paid and auto-advance recurring due date
router.patch("/:id/mark-paid", asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);
  const existing = await prisma.billReminder.findFirst({ where: { id, userId: req.userId! } });
  if (!existing) { res.status(404).json({ error: "Reminder not found" }); return; }

  if (existing.recurrence !== "once") {
    // Advance to next occurrence instead of marking paid
    const next = nextDueDate(new Date(existing.dueDate), existing.recurrence);
    const reminder = await prisma.billReminder.update({
      where: { id },
      data: { isPaid: false, dueDate: next },
    });
    return res.json({ ...reminder, advanced: true });
  }

  const reminder = await prisma.billReminder.update({
    where: { id },
    data: { isPaid: true },
  });
  res.json(reminder);
}));

// PATCH /api/reminders/:id/unmark-paid
router.patch("/:id/unmark-paid", asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);
  const existing = await prisma.billReminder.findFirst({ where: { id, userId: req.userId! } });
  if (!existing) { res.status(404).json({ error: "Reminder not found" }); return; }

  const reminder = await prisma.billReminder.update({ where: { id }, data: { isPaid: false } });
  res.json(reminder);
}));

// DELETE /api/reminders/:id
router.delete("/:id", asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);
  const existing = await prisma.billReminder.findFirst({ where: { id, userId: req.userId! } });
  if (!existing) { res.status(404).json({ error: "Reminder not found" }); return; }
  await prisma.billReminder.delete({ where: { id } });
  res.status(204).send();
}));

export default router;
