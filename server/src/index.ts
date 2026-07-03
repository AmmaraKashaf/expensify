import "dotenv/config";
import express from "express";

process.on("unhandledRejection", (err) => {
  console.error("[unhandledRejection]", err);
});
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { requireAuth } from "./middleware/auth";
import { prisma } from "./lib/prisma";
import transactionsRouter from "./routes/transactions";
import categoriesRouter from "./routes/categories";
import dashboardRouter from "./routes/dashboard";
import reportsRouter from "./routes/reports";
import usersRouter from "./routes/users";
import budgetsRouter from "./routes/budgets";
import goalsRouter from "./routes/goals";
import subscriptionsRouter from "./routes/subscriptions";
import remindersRouter from "./routes/reminders";

const app = express();
const PORT = process.env.PORT || 3001;

// Allow a comma-separated list of origins (useful for multiple deployment URLs)
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, same-origin server requests)
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

app.use(
  "/api",
  rateLimit({ windowMs: 15 * 60 * 1000, max: 500, standardHeaders: true, legacyHeaders: false })
);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/users", requireAuth, usersRouter);
app.use("/api/transactions", requireAuth, transactionsRouter);
app.use("/api/categories", requireAuth, categoriesRouter);
app.use("/api/dashboard", requireAuth, dashboardRouter);
app.use("/api/reports", requireAuth, reportsRouter);
app.use("/api/budgets", requireAuth, budgetsRouter);
app.use("/api/goals", requireAuth, goalsRouter);
app.use("/api/subscriptions", requireAuth, subscriptionsRouter);
app.use("/api/reminders", requireAuth, remindersRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

// ─── Default categories (seeded once at startup) ─────────────────────────────
const DEFAULT_CATEGORIES = [
  { name: "Food & Dining",     icon: "utensils",      colorHex: "#F97316" },
  { name: "Transport",         icon: "car",           colorHex: "#3B82F6" },
  { name: "Shopping",          icon: "shopping-bag",  colorHex: "#8B5CF6" },
  { name: "Bills & Utilities", icon: "zap",           colorHex: "#EF4444" },
  { name: "Entertainment",     icon: "film",          colorHex: "#EC4899" },
  { name: "Health & Fitness",  icon: "heart",         colorHex: "#10B981" },
  { name: "Education",         icon: "book",          colorHex: "#06B6D4" },
  { name: "Groceries",         icon: "shopping-cart", colorHex: "#84CC16" },
  { name: "Rent & Housing",    icon: "home",          colorHex: "#6366F1" },
  { name: "Travel",            icon: "plane",         colorHex: "#0EA5E9" },
  { name: "Gifts & Donations", icon: "gift",          colorHex: "#F59E0B" },
  { name: "Miscellaneous",     icon: "circle",        colorHex: "#6B7280" },
  { name: "Salary",            icon: "briefcase",     colorHex: "#22C55E" },
  { name: "Freelance",         icon: "laptop",        colorHex: "#0EA5E9" },
];

async function ensureDefaultCategories() {
  const count = await prisma.category.count({ where: { isDefault: true } });
  if (count >= DEFAULT_CATEGORIES.length) return;

  console.log("[startup] Seeding default categories...");
  for (const cat of DEFAULT_CATEGORIES) {
    await prisma.category
      .upsert({
        where: { id: `default-${cat.name}` },
        update: {},
        create: { name: cat.name, icon: cat.icon, colorHex: cat.colorHex, isDefault: true },
      })
      .catch(async () => {
        const existing = await prisma.category.findFirst({
          where: { name: cat.name, isDefault: true },
        });
        if (!existing) {
          await prisma.category.create({
            data: { name: cat.name, icon: cat.icon, colorHex: cat.colorHex, isDefault: true },
          });
        }
      });
  }
  console.log("[startup] Default categories ready.");
}

app.listen(PORT, async () => {
  console.log(`Expensify API running on http://localhost:${PORT}`);
  await ensureDefaultCategories().catch((e) =>
    console.error("[startup] Failed to seed categories:", e)
  );
});
