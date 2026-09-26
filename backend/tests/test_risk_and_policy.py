from app.ai.schemas import ExtractedClause
from app.services.compliance_service import ContractPolicy, evaluate_policy
from app.services.risk_service import assess_clauses, risk_score


def _clause(clause_type: str, text: str, page: int = 12, section: str = "7.3") -> ExtractedClause:
    return ExtractedClause(clause_type=clause_type, text=text, page=page, section=section)


def test_unlimited_liability_has_evidence():
    findings = assess_clauses([_clause("liability", "The supplier's liability shall be unlimited.")])
    match = next(item for item in findings if item.rule_id == "unlimited_liability")
    assert match.severity == "critical"
    assert match.evidence.page == 12
    assert match.evidence.section == "7.3"
    assert risk_score(findings) > 0


def test_missing_termination_is_reported():
    findings = assess_clauses([_clause("payment", "Fees are stated in schedule 1.")])
    assert any(item.rule_id == "missing_termination" for item in findings)


def test_liability_above_policy_fails():
    clauses = [_clause("liability", "Liability shall not exceed $5 million.", section="12.3")]
    results = evaluate_policy(ContractPolicy(max_liability=1_000_000), clauses)
    assert results[0].result == "FAIL"
    assert results[0].evidence_section == "12.3"


def test_notice_period_can_pass():
    clauses = [_clause("termination", "Either party may terminate on 90 days notice.", section="8")]
    results = evaluate_policy(ContractPolicy(minimum_termination_notice_days=60), clauses)
    assert results[0].result == "PASS"


def test_required_clause_missing_fails():
    clauses = [_clause("payment", "Fees are due in 30 days.", section="4")]
    results = evaluate_policy(ContractPolicy(required_clauses=["confidentiality"]), clauses)
    assert results[0].result == "FAIL"
