"""
Shared Groq chat model for categorization and report narratives.
GROQ_MODEL / GROQ_REASONING_EFFORT in .env choose the model, so when Groq
retires a model it is a config change, not a code change.
"""

import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq

load_dotenv()

MODEL = os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b")
# low / medium / high for reasoning models like gpt-oss; empty for models without reasoning
REASONING_EFFORT = os.environ.get("GROQ_REASONING_EFFORT", "low")

if REASONING_EFFORT not in ("", "low", "medium", "high"):
    raise ValueError(f"GROQ_REASONING_EFFORT must be low, medium, high or empty, got {REASONING_EFFORT!r}")


def chat_model(temperature: float) -> ChatGroq:
    extra = {"reasoning_effort": REASONING_EFFORT} if REASONING_EFFORT else {}
    return ChatGroq(
        model=MODEL,
        temperature=temperature,
        api_key=os.environ.get("GROQ_API_KEY"),
        **extra,
    )
