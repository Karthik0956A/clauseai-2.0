"""Evaluate a caller-supplied policy. The pass/fail result comes from the rule engine."""

from app.ai.schemas import ExtractedClause
from app.services.compliance_service import ContractPolicy, evaluate_policy


def run_compliance_agent(clauses: list[ExtractedClause], policy: ContractPolicy | None) -> list:
    if policy is None:
        return []
    return evaluate_policy(policy, clauses)
