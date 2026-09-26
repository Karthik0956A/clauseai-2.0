"""Deterministic risk rules. The numeric score is computed from findings, not sampled from a model."""

import re

from app.ai.schemas import ExtractedClause, RiskEvidence, RiskFinding

_SEVERITY_SCORE = {"low": 2, "medium": 5, "high": 8, "critical": 10}
_SEVERITY_WEIGHT = {"low": 3, "medium": 8, "high": 15, "critical": 25}

# UI charts still use these four buckets.
_UI_CATEGORY = {
    "Liability": "Legal Penalties",
    "Financial": "Financial Consequence",
    "Termination": "Time-based Obligations",
    "Data Privacy": "Loss of Rights",
    "Compliance": "Legal Penalties",
    "Jurisdiction": "Legal Penalties",
    "Operational": "Time-based Obligations",
    "Contractual": "Loss of Rights",
}

_RULES: tuple[dict, ...] = (
    {
        "id": "unlimited_liability",
        "severity": "critical",
        "category": "Liability",
        "pattern": re.compile(r"unlimited\s+liability|liability.{0,80}unlimited", re.I | re.S),
        "reason": "The clause does not impose a monetary cap on liability.",
    },
    {
        "id": "broad_indemnity",
        "severity": "high",
        "category": "Liability",
        "pattern": re.compile(r"indemnif\w+.{0,80}(all|any|unlimited|consequential)", re.I | re.S),
        "reason": "The indemnity is broad and is not limited to direct damages.",
    },
    {
        "id": "auto_renewal",
        "severity": "medium",
        "category": "Termination",
        "pattern": re.compile(r"automatic(?:ally)?\s+renew", re.I),
        "reason": "The contract renews automatically.",
    },
    {
        "id": "short_notice",
        "severity": "medium",
        "category": "Termination",
        "pattern": re.compile(r"(\d+)\s+days?.{0,40}notice", re.I),
        "reason": "Check whether the notice period is shorter than your policy.",
        "when": lambda text, match: int(match.group(1)) < 14,
    },
    {
        "id": "long_payment",
        "severity": "medium",
        "category": "Financial",
        "pattern": re.compile(r"(\d+)\s+days?.{0,40}(pay|invoice)", re.I),
        "reason": "The payment period is longer than 60 days.",
        "when": lambda text, match: int(match.group(1)) > 60,
    },
    {
        "id": "penalty",
        "severity": "high",
        "category": "Financial",
        "pattern": re.compile(r"penalty|liquidated damages", re.I),
        "reason": "The clause includes a penalty or liquidated damages.",
    },
)


def assess_clauses(clauses: list[ExtractedClause]) -> list[RiskFinding]:
    findings: list[RiskFinding] = []
    seen: set[str] = set()
    types = {clause.clause_type for clause in clauses}
    for clause in clauses:
        for rule in _RULES:
            match = rule["pattern"].search(clause.text)
            if not match:
                continue
            predicate = rule.get("when")
            if predicate and not predicate(clause.text, match):
                continue
            key = f"{rule['id']}:{clause.section}:{clause.page}"
            if key in seen:
                continue
            seen.add(key)
            findings.append(
                RiskFinding(
                    severity=rule["severity"],
                    category=rule["category"],
                    clause=clause.text[:500],
                    reason=rule["reason"],
                    rule_id=rule["id"],
                    evidence=RiskEvidence(page=clause.page, section=clause.section),
                )
            )
    if clauses and "termination" not in types and not any(
        "terminat" in clause.text.lower() for clause in clauses
    ):
        findings.append(
            RiskFinding(
                severity="high",
                category="Termination",
                clause="",
                reason="No termination clause was extracted from this contract.",
                rule_id="missing_termination",
                evidence=RiskEvidence(page=None, section=""),
            )
        )
    return findings


def risk_score(findings: list[RiskFinding]) -> int:
    total = sum(_SEVERITY_WEIGHT[item.severity] for item in findings)
    return min(100, total)


def to_chart_payload(findings: list[RiskFinding]) -> dict:
    """Shape expected by the existing risk visualization component."""
    risks = []
    for finding in findings:
        risks.append(
            {
                "category": _UI_CATEGORY.get(finding.category, "Legal Penalties"),
                "detailCategory": finding.category,
                "severity": _SEVERITY_SCORE[finding.severity],
                "text": finding.clause,
                "description": finding.reason,
                "reason": finding.reason,
                "impact": "Signing party",
                "page": finding.evidence.page,
                "section": finding.evidence.section,
                "ruleId": finding.rule_id,
            }
        )
    return {"riskScore": risk_score(findings), "risks": risks}


def safer_alternatives(findings: list[RiskFinding]) -> list[dict]:
    templates = {
        "unlimited_liability": (
            "The supplier's aggregate liability shall not exceed the fees paid during the twelve months before the claim."
        ),
        "broad_indemnity": (
            "Each party shall indemnify the other only for direct damages caused by its own negligence or willful misconduct."
        ),
        "auto_renewal": (
            "Renewal requires written agreement by both parties at least 30 days before the term ends."
        ),
        "short_notice": "Either party may terminate for convenience on not less than 30 days' written notice.",
        "missing_termination": "Either party may terminate for convenience on 30 days' written notice.",
        "long_payment": "Undisputed invoices are payable within 30 days of receipt.",
        "penalty": "Late amounts accrue interest at a stated annual rate and do not include an additional penalty.",
    }
    suggestions = []
    for finding in findings:
        proposed = templates.get(finding.rule_id)
        if not proposed:
            continue
        suggestions.append(
            {
                "original": finding.clause or finding.reason,
                "proposed": proposed,
                "reason": finding.reason,
                "page": finding.evidence.page,
                "section": finding.evidence.section,
            }
        )
    return suggestions
