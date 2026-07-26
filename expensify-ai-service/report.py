import os
import pandas as pd
from sqlalchemy import text
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from db import engine
from models import CategorySummary, ReportResponse

_llm = ChatOpenAI(
    model="gpt-4o-mini",
    temperature=0.4,
    api_key=os.environ.get("OPENAI_API_KEY"),
)

_narrative_prompt = ChatPromptTemplate.from_messages([
    ("system", (
        "You are a personal finance advisor. "
        "Given a monthly spending summary, write a concise 2–3 sentence insight. "
        "Be specific, actionable, and encouraging. Do not repeat the raw numbers back verbatim."
    )),
    ("human", "{summary_text}"),
])

_narrative_chain = _narrative_prompt | _llm

# ── SQL ──────────────────────────────────────────────────────────────────────

_REPORT_SQL = text("""
    SELECT
        t.id,
        t.amount,
        t.type,
        t.date,
        t.merchant_name,
        t.description,
        COALESCE(c.name, 'Uncategorized') AS category_name,
        c.color_hex
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = :user_id
      AND t.deleted_at IS NULL
      AND to_char(t.date, 'YYYY-MM') = :month
    ORDER BY t.date
""")

# ── Report builder ────────────────────────────────────────────────────────────

def build_report(user_id: str, month: str) -> ReportResponse:
    with engine.connect() as conn:
        df = pd.read_sql(_REPORT_SQL, conn, params={"user_id": user_id, "month": month})

    if df.empty:
        return ReportResponse(
            user_id=user_id,
            month=month,
            total_income=0.0,
            total_expenses=0.0,
            net=0.0,
            by_category=[],
            top_merchants=[],
            narrative="No transactions found for this period.",
        )

    df["amount"] = df["amount"].astype(float)

    income_df  = df[df["type"] == "income"]
    expense_df = df[df["type"] == "expense"]

    total_income   = float(income_df["amount"].sum())
    total_expenses = float(expense_df["amount"].sum())
    net            = total_income - total_expenses

    # Spending by category (expenses only)
    by_cat = (
        expense_df.groupby("category_name")["amount"]
        .agg(total="sum", count="count")
        .reset_index()
        .sort_values("total", ascending=False)
    )
    by_cat["percentage"] = (by_cat["total"] / total_expenses * 100).round(1) if total_expenses else 0.0

    category_summaries = [
        CategorySummary(
            category=row["category_name"],
            total=round(float(row["total"]), 2),
            count=int(row["count"]),
            percentage=float(row["percentage"]),
        )
        for _, row in by_cat.iterrows()
    ]

    # Top merchants by spend
    top_merchants = (
        expense_df[expense_df["merchant_name"].notna()]
        .groupby("merchant_name")["amount"]
        .sum()
        .sort_values(ascending=False)
        .head(5)
        .reset_index()
        .rename(columns={"merchant_name": "merchant", "amount": "total"})
        .assign(total=lambda x: x["total"].round(2))
        .to_dict(orient="records")
    )

    # LLM narrative
    top_cats = by_cat.head(3)[["category_name", "total"]].to_dict(orient="records")
    summary_text = (
        f"Month: {month}\n"
        f"Total income: ${total_income:.2f}\n"
        f"Total expenses: ${total_expenses:.2f}\n"
        f"Net: ${net:.2f}\n"
        f"Top spending categories: {top_cats}\n"
        f"Top merchants: {top_merchants[:3]}"
    )
    narrative_msg = _narrative_chain.invoke({"summary_text": summary_text})
    narrative = narrative_msg.content.strip()

    return ReportResponse(
        user_id=user_id,
        month=month,
        total_income=round(total_income, 2),
        total_expenses=round(total_expenses, 2),
        net=round(net, 2),
        by_category=category_summaries,
        top_merchants=top_merchants,
        narrative=narrative,
    )
