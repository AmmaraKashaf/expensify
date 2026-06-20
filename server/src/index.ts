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

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));
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

app.listen(PORT, () => {
  console.log(`WealthLens API running on http://localhost:${PORT}`);
});
