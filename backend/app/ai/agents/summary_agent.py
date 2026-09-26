"""Write a narrative from the structured findings. A model failure does not erase those findings."""

import logging

from app.ai.llm import LLMService
from app.ai.schemas import AnalysisReport, ExtractedClause, PolicyResult, RiskFinding

logger = logging.getLogger(__name__)

_SYSTEM = """You write a short contract review for a human reader.
Use only the findings you are given.
Do not add risks that are not in the list.
Do not give legal advice. Describe the findings and tell the reader to have counsel review them.
"""


def run_summary_agent(
    llm: LLMService | None,
    clauses: list[ExtractedClause],
    risks: list[RiskFinding],
    compliance: list[PolicyResult],
) -> AnalysisReport:
    report = AnalysisReport(clauses=clauses, risks=risks, compliance=compliance)
    if llm is None:
        report.llm_error = "OPENROUTER is not configured, so no narrative was generated."
        report.narrative = _fallback(risks, compliance)
        return report
    user = (
        f"Clauses: {[clause.model_dump() for clause in clauses]}\n"
        f"Risks: {[risk.model_dump() for risk in risks]}\n"
        f"Compliance: {[item.model_dump() for item in compliance]}"
    )
    try:
        report.narrative = llm.complete(_SYSTEM, user)
    except Exception as exc:
        logger.exception("Synthesis model call failed")
        report.llm_error = str(exc)
        report.narrative = _fallback(risks, compliance)
    return report


def _fallback(risks: list[RiskFinding], compliance: list[PolicyResult]) -> str:
    lines = ["Structured findings are listed below. A narrative summary was not produced."]
    for risk in risks:
        lines.append(
            f"- {risk.severity} {risk.category}: {risk.reason} (section {risk.evidence.section or 'n/a'})"
        )
    for item in compliance:
        lines.append(f"- Policy {item.result}: {item.reason}")
    lines.append("This is not legal advice. A qualified reviewer should check the cited sections.")
    return "\n".join(lines)
