"""Policy checks that compare extracted facts with numeric or membership rules."""

import re

from pydantic import BaseModel, Field

from app.ai.schemas import ExtractedClause, PolicyResult
from app.services.comparison_service import day_values, is_unlimited_liability, money_values


class ContractPolicy(BaseModel):
    name: str = "Default policy"
    max_liability: float | None = None
    minimum_termination_notice_days: int | None = None
    approved_jurisdictions: list[str] = Field(default_factory=list)
    required_clauses: list[str] = Field(default_factory=list)


def evaluate_policy(policy: ContractPolicy, clauses: list[ExtractedClause]) -> list[PolicyResult]:
    results: list[PolicyResult] = []
    if policy.max_liability is not None:
        results.extend(_liability(policy, clauses))
    if policy.minimum_termination_notice_days is not None:
        results.append(_termination_notice(policy, clauses))
    if policy.approved_jurisdictions:
        results.append(_jurisdiction(policy, clauses))
    for required in policy.required_clauses:
        results.append(_required_clause(required, clauses))
    return results


def _liability(policy: ContractPolicy, clauses: list[ExtractedClause]) -> list[PolicyResult]:
    liability = [clause for clause in clauses if clause.clause_type == "liability" or "liabil" in clause.text.lower()]
    if not liability:
        return [
            PolicyResult(
                policy=f"Maximum liability = {policy.max_liability}",
                result="FAIL",
                severity="high",
                reason="No liability clause was available to compare with the policy cap.",
            )
        ]
    results = []
    for clause in liability:
        if is_unlimited_liability(clause.text):
            results.append(
                PolicyResult(
                    policy=f"Maximum liability = {policy.max_liability}",
                    result="FAIL",
                    severity="high",
                    reason="The contract states unlimited liability.",
                    evidence_section=clause.section,
                    evidence_page=clause.page,
                )
            )
            continue
        amounts = money_values(clause.text)
        if not amounts:
            continue
        if amounts[0] > float(policy.max_liability):
            results.append(
                PolicyResult(
                    policy=f"Maximum liability = {policy.max_liability}",
                    result="FAIL",
                    severity="high",
                    reason=f"The stated cap {amounts[0]:.0f} exceeds the policy maximum.",
                    evidence_section=clause.section,
                    evidence_page=clause.page,
                )
            )
        else:
            results.append(
                PolicyResult(
                    policy=f"Maximum liability = {policy.max_liability}",
                    result="PASS",
                    severity="low",
                    reason=f"The stated cap {amounts[0]:.0f} is within the policy maximum.",
                    evidence_section=clause.section,
                    evidence_page=clause.page,
                )
            )
    return results


def _termination_notice(policy: ContractPolicy, clauses: list[ExtractedClause]) -> PolicyResult:
    minimum = int(policy.minimum_termination_notice_days or 0)
    for clause in clauses:
        if clause.clause_type != "termination" and "notice" not in clause.text.lower():
            continue
        days = day_values(clause.text)
        if not days:
            continue
        if days[0] >= minimum:
            return PolicyResult(
                policy=f"Termination notice >= {minimum} days",
                result="PASS",
                severity="low",
                reason=f"The contract requires {days[0]} days' notice.",
                evidence_section=clause.section,
                evidence_page=clause.page,
            )
        return PolicyResult(
            policy=f"Termination notice >= {minimum} days",
            result="FAIL",
            severity="medium",
            reason=f"The contract requires {days[0]} days' notice, below the policy minimum.",
            evidence_section=clause.section,
            evidence_page=clause.page,
        )
    return PolicyResult(
        policy=f"Termination notice >= {minimum} days",
        result="FAIL",
        severity="medium",
        reason="No termination notice period was found.",
    )


def _jurisdiction(policy: ContractPolicy, clauses: list[ExtractedClause]) -> PolicyResult:
    approved = {item.lower() for item in policy.approved_jurisdictions}
    for clause in clauses:
        if clause.clause_type not in {"jurisdiction", "governing_law"} and "jurisdiction" not in clause.text.lower():
            continue
        lowered = clause.text.lower()
        if any(re.search(rf"\b{re.escape(name)}\b", lowered) for name in approved):
            return PolicyResult(
                policy="Approved jurisdictions",
                result="PASS",
                severity="low",
                reason="The governing venue is on the approved list.",
                evidence_section=clause.section,
                evidence_page=clause.page,
            )
        return PolicyResult(
            policy="Approved jurisdictions",
            result="FAIL",
            severity="medium",
            reason="The governing venue is not on the approved list.",
            evidence_section=clause.section,
            evidence_page=clause.page,
        )
    return PolicyResult(
        policy="Approved jurisdictions",
        result="FAIL",
        severity="medium",
        reason="No jurisdiction clause was found.",
    )


def _required_clause(required: str, clauses: list[ExtractedClause]) -> PolicyResult:
    present = any(clause.clause_type == required or required.replace("_", " ") in clause.text.lower() for clause in clauses)
    if present:
        match = next(clause for clause in clauses if clause.clause_type == required or required.replace("_", " ") in clause.text.lower())
        return PolicyResult(
            policy=f"Required clause: {required}",
            result="PASS",
            severity="low",
            reason=f"A {required} clause is present.",
            evidence_section=match.section,
            evidence_page=match.page,
        )
    return PolicyResult(
        policy=f"Required clause: {required}",
        result="FAIL",
        severity="high",
        reason=f"The contract is missing a {required} clause.",
    )
