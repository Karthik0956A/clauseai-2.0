"""Structured model outputs. These are validated before they reach the rest of the app."""

from pydantic import BaseModel, Field


class ExtractedClause(BaseModel):
    clause_type: str
    text: str
    page: int
    section: str
    entities: list[str] = Field(default_factory=list)
    obligations: list[str] = Field(default_factory=list)
    risk_level: str = "unknown"


class ClauseExtractionResult(BaseModel):
    clauses: list[ExtractedClause] = Field(default_factory=list)


class Citation(BaseModel):
    page: int | None = None
    section: str = ""
    section_title: str = ""
    chunk_id: str = ""
    score: float = 0


class GroundedAnswer(BaseModel):
    answer: str
    citations: list[Citation] = Field(default_factory=list)
    grounded: bool = True


class RiskEvidence(BaseModel):
    page: int | None = None
    section: str = ""


class RiskFinding(BaseModel):
    severity: str
    category: str
    clause: str
    reason: str
    rule_id: str
    evidence: RiskEvidence


class PolicyResult(BaseModel):
    policy: str
    result: str
    severity: str
    reason: str
    evidence_section: str = ""
    evidence_page: int | None = None


class AnalysisReport(BaseModel):
    narrative: str | None = None
    llm_error: str | None = None
    clauses: list[ExtractedClause] = Field(default_factory=list)
    risks: list[RiskFinding] = Field(default_factory=list)
    compliance: list[PolicyResult] = Field(default_factory=list)
