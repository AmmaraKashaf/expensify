import io
import base64
import numpy as np
import matplotlib
import matplotlib.pyplot as plt
import seaborn as sns
from models import CategorySummary

matplotlib.use("Agg")  # non-interactive backend — must be before any plt import

# Consistent palette matching Expensify brand colours
_PALETTE = [
    "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316",
    "#eab308", "#22c55e", "#14b8a6", "#3b82f6", "#06b6d4",
    "#a855f7", "#64748b",
]


def spending_bar_chart(by_category: list[CategorySummary], month: str) -> str:
    """Return a base64-encoded PNG bar chart of spending by category."""
    if not by_category:
        return ""

    labels = [s.category for s in by_category]
    values = [s.total for s in by_category]
    colours = _PALETTE[:len(labels)]

    fig, ax = plt.subplots(figsize=(9, 5))
    fig.patch.set_facecolor("#0f172a")
    ax.set_facecolor("#1e293b")

    bars = ax.barh(labels[::-1], values[::-1], color=colours[::-1], height=0.6)

    # Value labels on bars
    for bar, val in zip(bars, values[::-1]):
        ax.text(
            bar.get_width() + max(values) * 0.01,
            bar.get_y() + bar.get_height() / 2,
            f"${val:,.0f}",
            va="center", ha="left",
            color="#cbd5e1", fontsize=9,
        )

    ax.set_xlabel("Amount (USD)", color="#94a3b8", fontsize=10)
    ax.set_title(f"Spending by Category — {month}", color="#f1f5f9", fontsize=13, pad=12)
    ax.tick_params(colors="#94a3b8", labelsize=9)
    ax.spines[:].set_visible(False)
    ax.xaxis.set_tick_params(which="both", length=0)
    ax.set_xlim(0, max(values) * 1.18)

    for spine in ax.spines.values():
        spine.set_visible(False)

    plt.tight_layout()
    return _fig_to_base64(fig)


def spending_trend_chart(dates: list[str], amounts: list[float], month: str) -> str:
    """Return a base64-encoded PNG line chart of daily expenses over the month."""
    if not dates:
        return ""

    fig, ax = plt.subplots(figsize=(9, 4))
    fig.patch.set_facecolor("#0f172a")
    ax.set_facecolor("#1e293b")

    ax.plot(dates, amounts, color="#6366f1", linewidth=2.5, marker="o", markersize=5)
    ax.fill_between(dates, amounts, alpha=0.15, color="#6366f1")

    # Rolling average line
    if len(amounts) >= 3:
        window = min(7, len(amounts))
        rolling = np.convolve(amounts, np.ones(window) / window, mode="valid")
        ax.plot(
            dates[window - 1:], rolling,
            color="#a855f7", linewidth=1.5, linestyle="--", label=f"{window}-day avg"
        )
        ax.legend(facecolor="#1e293b", labelcolor="#94a3b8", fontsize=9, framealpha=0.8)

    ax.set_title(f"Daily Expenses — {month}", color="#f1f5f9", fontsize=13, pad=12)
    ax.set_xlabel("Date", color="#94a3b8", fontsize=10)
    ax.set_ylabel("Amount (USD)", color="#94a3b8", fontsize=10)
    ax.tick_params(colors="#94a3b8", labelsize=8)
    for spine in ax.spines.values():
        spine.set_color("#334155")

    step = max(1, len(dates) // 8)
    ax.set_xticks(ax.get_xticks()[::step])
    plt.xticks(rotation=30, ha="right")
    plt.tight_layout()
    return _fig_to_base64(fig)


def _fig_to_base64(fig: plt.Figure) -> str:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=130, bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode("utf-8")
