from pydantic import BaseModel, Field
from typing import Literal, Optional
from datetime import date as Date

EXPENSE_CATEGORIES = [
    "Food & Dining",
    "Transport",
    "Shopping",
    "Bills & Utilities",
    "Entertainment",
    "Health & Fitness",
    "Education",
    "Groceries",
    "Rent & Housing",
    "Travel",
    "Gifts & Donations",
    "Miscellaneous",
]
INCOME_CATEGORIES = ["Salary", "Freelance", "Other Income"]
ALL_CATEGORIES = EXPENSE_CATEGORIES + INCOME_CATEGORIES


class CategorizeRequest(BaseModel):
    description: Optional[str] = None
    merchant_name: Optional[str] = None
    amount: float
    transaction_type: Literal["income", "expense"] = "expense"

    model_config = {"json_schema_extra": {"example": {
        "description": "McDonald's order #4821",
        "merchant_name": "McDonald's",
        "amount": 12.50,
        "transaction_type": "expense",
    }}}


class CategorizedTransaction(BaseModel):
    category: str = Field(description=f"One category from this list: {ALL_CATEGORIES}")
    merchant: str = Field(description="Cleaned merchant / payee name")
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence score 0–1")
    reasoning: str = Field(description="One-sentence explanation of why this category fits")


class CategorySummary(BaseModel):
    category: str
    total: float
    count: int
    percentage: float


class ReportResponse(BaseModel):
    user_id: str
    month: str
    total_income: float
    total_expenses: float
    net: float
    by_category: list[CategorySummary]
    top_merchants: list[dict]
    narrative: str
    chart_base64: Optional[str] = None


class InsightResponse(BaseModel):
    user_id: str
    period_days: int
    avg_daily_spend: float
    highest_day: Optional[str]
    highest_day_amount: float
    most_used_category: Optional[str]
    anomalies: list[dict]
    trend: Literal["increasing", "decreasing", "stable"]
