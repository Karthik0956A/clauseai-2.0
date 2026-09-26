"""Turn extracted clauses into rule-backed findings."""

from app.ai.schemas import ExtractedClause
from app.services.risk_service import assess_clauses


def run_risk_agent(clauses: list[ExtractedClause]) -> list:
    return assess_clauses(clauses)
