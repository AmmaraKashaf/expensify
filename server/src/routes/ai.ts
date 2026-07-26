import { Router } from "express";
import type { Response as ExpressResponse } from "express";
import { AuthRequest } from "../middleware/auth";

const router = Router();

const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? "http://localhost:8000";
const AI_SERVICE_KEY = process.env.AI_SERVICE_KEY ?? "";

const aiHeaders: Record<string, string> = {
  "Content-Type": "application/json",
  ...(AI_SERVICE_KEY ? { "X-Api-Key": AI_SERVICE_KEY } : {}),
};

async function forwardToAI(
  path: string,
  options?: { method?: string; body?: string }
): Promise<{ status: number; data: unknown }> {
  const upstream = await fetch(`${AI_SERVICE_URL}${path}`, {
    method: options?.method ?? "GET",
    headers: aiHeaders,
    body: options?.body,
  });
  const data: unknown = await upstream.json();
  return { status: upstream.status, data };
}

function sendError(res: ExpressResponse, msg: string, status = 503): void {
  res.status(status).json({ error: msg });
}

// POST /api/ai/categorize
// Body: { description?, merchant_name?, amount, transaction_type? }
router.post("/categorize", async (req: AuthRequest, res: ExpressResponse) => {
  try {
    const { status, data } = await forwardToAI("/categorize", {
      method: "POST",
      body: JSON.stringify(req.body),
    });
    res.status(status).json(data);
  } catch {
    sendError(res, "AI service unavailable");
  }
});

// GET /api/ai/report?month=YYYY-MM&include_chart=true
router.get("/report", async (req: AuthRequest, res: ExpressResponse) => {
  const { month, include_chart = "true" } = req.query;
  const qs = new URLSearchParams();
  if (month) qs.set("month", String(month));
  qs.set("include_chart", String(include_chart));

  try {
    const { status, data } = await forwardToAI(
      `/report/${req.userId}?${qs.toString()}`
    );
    res.status(status).json(data);
  } catch {
    sendError(res, "AI service unavailable");
  }
});

// GET /api/ai/report/trend-chart?month=YYYY-MM
router.get("/report/trend-chart", async (req: AuthRequest, res: ExpressResponse) => {
  const { month } = req.query;
  const qs = new URLSearchParams();
  if (month) qs.set("month", String(month));

  try {
    const { status, data } = await forwardToAI(
      `/report/${req.userId}/trend-chart?${qs.toString()}`
    );
    res.status(status).json(data);
  } catch {
    sendError(res, "AI service unavailable");
  }
});

// GET /api/ai/insights?period_days=30
router.get("/insights", async (req: AuthRequest, res: ExpressResponse) => {
  const { period_days = "30" } = req.query;
  const qs = new URLSearchParams({ period_days: String(period_days) });

  try {
    const { status, data } = await forwardToAI(
      `/insights/${req.userId}?${qs.toString()}`
    );
    res.status(status).json(data);
  } catch {
    sendError(res, "AI service unavailable");
  }
});

export default router;
