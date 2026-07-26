import os
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from models import CategorizeRequest, CategorizedTransaction, ALL_CATEGORIES

_llm = ChatGroq(
    model="llama-3.1-8b-instant",
    temperature=0,
    api_key=os.environ.get("GROQ_API_KEY"),
)

_structured_llm = _llm.with_structured_output(CategorizedTransaction)

_prompt = ChatPromptTemplate.from_messages([
    ("system", (
        "You are a financial transaction categorizer. "
        "Given a transaction, return the most appropriate category from the allowed list, "
        "a cleaned merchant name, a confidence score, and a brief reasoning.\n\n"
        "Allowed categories: {categories}"
    )),
    ("human", (
        "Transaction details:\n"
        "- Description: {description}\n"
        "- Merchant: {merchant_name}\n"
        "- Amount: {amount}\n"
        "- Type: {transaction_type}"
    )),
])

_chain = _prompt | _structured_llm


def categorize(req: CategorizeRequest) -> CategorizedTransaction:
    result = _chain.invoke({
        "categories": ", ".join(ALL_CATEGORIES),
        "description": req.description or "N/A",
        "merchant_name": req.merchant_name or "N/A",
        "amount": req.amount,
        "transaction_type": req.transaction_type,
    })
    if result.category not in ALL_CATEGORIES:
        result.category = "Miscellaneous"
        result.confidence = max(0.0, result.confidence - 0.2)
    return result
