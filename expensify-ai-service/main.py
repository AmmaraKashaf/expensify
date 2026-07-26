"""
Expensify AI Microservice
FastAPI service that reads from the same Supabase PostgreSQL database
and exposes AI-powered endpoints for categorization, reports, and insights.
"""

import os
from datetime import date, timedelta
from typing import Optional

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from db import engine
from models import (
    CategorizeRequest,
    CategorizedTransaction,
    ReportResponse,
    InsightResponse,
)
from categorizer import categorize as _categorize
from report import build_report
from chart import spending_bar_chart, spending_trend_chart

app = FastAPI(
    title="Expensify AI Service",
    description="AI-powered financial insights for Expensify",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("ALLOWED_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Auth helper ───────────────────────────────────────────────────────────────

_AI_SERVICE_KEY = os.environ.get("AI_SERVICE_KEY", "")


def _require_key(x_api_key: Optional[str] = Header(default=None)):
    if _AI_SERVICE_KEY and x_api_key != _AI_SERVICE_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing X-Api-Key header")


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "expensify-ai"}


# ── Categorize ────────────────────────────────────────────────────────────────

@app.post("/categorize", response_model=CategorizedTransaction)
def categorize_transaction(
    req: CategorizeRequest,
    x_api_key: Optional[str] = Header(default=None),
):
    _require_key(x_api_key)
    if not req.description and not req.merchant_name:
        raise HTTPException(status_code=422, detail="Provide at least description or merchant_name")
    try:
        return _categorize(req)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ── Monthly Report ────────────────────────────────────────────────────────────

@app.get("/report/{user_id}", response_model=ReportResponse)
def monthly_report(
    user_id: str,
    month: Optional[str] = None,
    include_chart: bool = True,
    x_api_key: Optional[str] = Header(default=None),
):
    """
    month: YYYY-MM format. Defaults to the current month.
    include_chart: if true, attaches base64 PNG chart in the response.
    """
    _require_key(x_api_key)
    if month is None:
        today = date.today()
        month = today.strftime("%Y-%m")

    try:
        report = build_report(user_id, month)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    if include_chart and report.by_category:
        report.chart_base64 = spending_bar_chart(report.by_category, month)

    return report


# ── Spending Trend Chart ──────────────────────────────────────────────────────

@app.get("/report/{user_id}/trend-chart")
def trend_chart(
    user_id: str,
    month: Optional[str] = None,
    x_api_key: Optional[str] = Header(default=None),
):
    _require_key(x_api_key)
    if month is None:
        month = date.today().strftime("%Y-%m")

    sql = text("""
        SELECT t.date, COALESCE(SUM(t.amount), 0) AS total
        FROM transactions t
        WHERE t.user_id = :user_id
          AND t.deleted_at IS NULL
          AND t.type = 'expense'
          AND to_char(t.date, 'YYYY-MM') = :month
        GROUP BY t.date
        ORDER BY t.date
    """)
    with engine.connect() as conn:
        df = pd.read_sql(sql, conn, params={"user_id": user_id, "month": month})

    if df.empty:
        return {"chart_base64": None}

    df["amount"] = df["total"].astype(float)
    dates  = df["date"].astype(str).tolist()
    values = df["amount"].tolist()
    chart  = spending_trend_chart(dates, values, month)
    return {"chart_base64": chart}


# ── Spending Insights ─────────────────────────────────────────────────────────

@app.get("/insights/{user_id}", response_model=InsightResponse)
def spending_insights(
    user_id: str,
    period_days: int = 30,
    x_api_key: Optional[str] = Header(default=None),
):
    """Statistical anomaly detection and trend analysis over the last N days."""
    _require_key(x_api_key)
    end_date   = date.today()
    start_date = end_date - timedelta(days=period_days)

    sql = text("""
        SELECT t.date, t.amount, t.merchant_name,
               COALESCE(c.name, 'Uncategorized') AS category_name
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.user_id  = :user_id
          AND t.deleted_at IS NULL
          AND t.type      = 'expense'
          AND t.date     >= :start_date
          AND t.date     <= :end_date
        ORDER BY t.date
    """)
    with engine.connect() as conn:
        df = pd.read_sql(
            sql, conn,
            params={"user_id": user_id, "start_date": str(start_date), "end_date": str(end_date)},
        )

    if df.empty:
        return InsightResponse(
            user_id=user_id,
            period_days=period_days,
            avg_daily_spend=0.0,
            highest_day=None,
            highest_day_amount=0.0,
            most_used_category=None,
            anomalies=[],
            trend="stable",
        )

    df["amount"] = df["amount"].astype(float)
    daily = df.groupby("date")["amount"].sum().reset_index()

    avg_daily = float(daily["amount"].mean())
    highest_idx = daily["amount"].idxmax()
    highest_day = str(daily.loc[highest_idx, "date"])
    highest_day_amount = float(daily.loc[highest_idx, "amount"])

    most_used_cat = df.groupby("category_name")["amount"].sum().idxmax()

    # Z-score anomaly detection: flag days where spend > mean + 2*std
    if len(daily) >= 3:
        mean   = daily["amount"].mean()
        std    = daily["amount"].std()
        cutoff = mean + 2 * std
        anomalous = daily[daily["amount"] > cutoff]
        anomalies = [
            {"date": str(row["date"]), "amount": round(float(row["amount"]), 2), "zscore": round((float(row["amount"]) - mean) / std, 2)}
            for _, row in anomalous.iterrows()
        ]
    else:
        anomalies = []

    # Trend: compare first half to second half of period
    mid = len(daily) // 2
    if mid > 0:
        first_half  = daily.iloc[:mid]["amount"].mean()
        second_half = daily.iloc[mid:]["amount"].mean()
        ratio = second_half / first_half if first_half > 0 else 1.0
        trend = "increasing" if ratio > 1.1 else "decreasing" if ratio < 0.9 else "stable"
    else:
        trend = "stable"

    return InsightResponse(
        user_id=user_id,
        period_days=period_days,
        avg_daily_spend=round(avg_daily, 2),
        highest_day=highest_day,
        highest_day_amount=round(highest_day_amount, 2),
        most_used_category=most_used_cat,
        anomalies=anomalies,
        trend=trend,
    )
