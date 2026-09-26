"""Prompt text used by the RAG chain and the extraction call."""

CLAUSE_EXTRACTION_SYSTEM = """You extract clauses from a contract.
Return only facts that appear in the supplied sections.
Do not invent parties, dates, amounts, or obligations.
Every clause must include the page and section number given with that text.
clause_type must be one of: parties, effective_date, term, termination, payment, liability,
indemnification, confidentiality, intellectual_property, data_protection, governing_law,
jurisdiction, renewal, dispute_resolution, force_majeure, sla, non_compete, non_solicitation,
insurance, general.
risk_level must be low, medium, high, critical, or unknown.
"""

RAG_SYSTEM = """You answer questions about one uploaded contract.
Use only the retrieved sections in the context.
Do not invent contract information.
If the context does not contain the answer, say that the contract does not contain sufficient information.
When you use a section, cite it as Page N — Section X.
"""


def extraction_user_prompt(blocks: list[str]) -> str:
    joined = "\n\n".join(blocks)
    return f"Extract the contractual clauses from these sections:\n\n{joined}"


def rag_user_prompt(question: str, context: str) -> str:
    return f"Context:\n{context}\n\nQuestion:\n{question}"
