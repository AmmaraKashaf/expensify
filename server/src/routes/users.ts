import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import type { AuthRequest } from "../middleware/auth";

const router = Router();

const updateSchema = z.object({
  baseCurrency: z.string().length(3).toUpperCase().optional(),
  displayName: z.string().min(1).max(60).optional(),
});

// GET /api/users/me
router.get("/me", asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(user);
}));

// PATCH /api/users/me
router.patch("/me", asyncHandler(async (req: AuthRequest, res: Response) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const user = await prisma.user.update({
    where: { id: req.userId },
    data: parsed.data,
  });
  res.json(user);
}));

export default router;
