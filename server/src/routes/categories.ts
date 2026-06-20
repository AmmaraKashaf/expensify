import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import type { AuthRequest } from "../middleware/auth";

const router = Router();

const categorySchema = z.object({
  name: z.string().min(1).max(50),
  icon: z.string().default("circle"),
  colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#6B7280"),
  parentCategoryId: z.string().uuid().optional(),
});

// GET /api/categories — returns defaults + user's custom categories
router.get("/", asyncHandler(async (req: AuthRequest, res: Response) => {
  const categories = await prisma.category.findMany({
    where: {
      OR: [{ isDefault: true }, { userId: req.userId }],
      isActive: true,
      parentCategoryId: null,
    },
    include: { subCategories: { where: { isActive: true } } },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });

  // Deduplicate default categories by name (seed may have run multiple times)
  const seen = new Set<string>();
  const deduped = categories.filter((cat) => {
    const key = cat.userId ? cat.id : cat.name;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  res.json(deduped);
}));

// POST /api/categories
router.post("/", asyncHandler(async (req: AuthRequest, res: Response) => {
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const category = await prisma.category.create({
    data: { ...parsed.data, userId: req.userId! },
  });
  res.status(201).json(category);
}));

// PUT /api/categories/:id
router.put("/:id", asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);
  const existing = await prisma.category.findFirst({
    where: { id, userId: req.userId },
  });
  if (!existing) {
    res.status(404).json({ error: "Category not found" });
    return;
  }
  const parsed = categorySchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const category = await prisma.category.update({
    where: { id },
    data: parsed.data,
  });
  res.json(category);
}));

// DELETE /api/categories/:id (soft delete — only user's custom categories)
router.delete("/:id", asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);
  const existing = await prisma.category.findFirst({
    where: { id, userId: req.userId, isDefault: false },
  });
  if (!existing) {
    res.status(404).json({ error: "Category not found or cannot delete default" });
    return;
  }
  await prisma.category.update({
    where: { id },
    data: { isActive: false },
  });
  res.status(204).send();
}));

export default router;
