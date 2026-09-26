"""Risk findings and the multi-stage analysis workflow."""

from fastapi import APIRouter, Depends

from app.ai.agents.clause_agent import run_clause_agent
from app.ai.agents.compliance_agent import run_compliance_agent
from app.ai.agents.risk_agent import run_risk_agent
from app.ai.agents.summary_agent import run_summary_agent
from app.ai.llm import LLMService
from app.ai.workflow import build_analysis_graph, run_analysis
from app.auth import get_current_user
from app.config import Settings
from app.deps import document_service, settings_dep
from app.services.document_service import DocumentService
from app.services.extraction_service import ExtractionService
from app.services.risk_service import assess_clauses, safer_alternatives, to_chart_payload

router = APIRouter(tags=["risk"])


@router.post("/risk/analyze")
def analyze_risk(
    document_id: str,
    user_id: str = Depends(get_current_user),
    settings: Settings = Depends(settings_dep),
    documents: DocumentService = Depends(document_service),
):
    chunks = documents.load_chunks(user_id, document_id)
    clauses = ExtractionService(LLMService.from_settings(settings)).extract(chunks)
    findings = assess_clauses(clauses)
    payload = to_chart_payload(findings)
    documents._repository.save_clauses(
        user_id,
        document_id,
        [{"user_id": user_id, "document_id": document_id, **clause.model_dump()} for clause in clauses],
    )
    documents._repository.save_risks(user_id, document_id, payload)
    return {"success": True, "data": payload}


@router.get("/documents/{document_id}/risks")
def get_risks(
    document_id: str,
    user_id: str = Depends(get_current_user),
    documents: DocumentService = Depends(document_service),
):
    stored = documents._repository.get_risks(user_id, document_id)
    return {"risks": stored}


@router.post("/risk/suggest")
def suggest_safer_clauses(
    document_id: str,
    user_id: str = Depends(get_current_user),
    settings: Settings = Depends(settings_dep),
    documents: DocumentService = Depends(document_service),
):
    chunks = documents.load_chunks(user_id, document_id)
    clauses = ExtractionService(LLMService.from_settings(settings)).extract(chunks)
    suggestions = safer_alternatives(assess_clauses(clauses))
    return {"success": True, "data": {"suggestions": suggestions}}


@router.post("/contracts/{document_id}/analyze")
def run_contract_analysis(
    document_id: str,
    user_id: str = Depends(get_current_user),
    settings: Settings = Depends(settings_dep),
    documents: DocumentService = Depends(document_service),
):
    chunks = documents.load_chunks(user_id, document_id)
    extraction = ExtractionService(LLMService.from_settings(settings))
    llm = LLMService.from_settings(settings)

    def clause_node(state):
        return {"clauses": run_clause_agent(extraction, state["chunks"])}

    def risk_node(state):
        return {"risks": run_risk_agent(state.get("clauses") or [])}

    def compliance_node(state):
        return {"compliance": run_compliance_agent(state.get("clauses") or [], None)}

    def synthesis_node(state):
        report = run_summary_agent(
            llm,
            state.get("clauses") or [],
            state.get("risks") or [],
            state.get("compliance") or [],
        )
        return {"report": report.model_dump()}

    app = build_analysis_graph(clause_node, risk_node, compliance_node, synthesis_node)
    report = run_analysis(app, {"chunks": chunks})
    documents._repository.reports.insert_one(
        {"user_id": user_id, "document_id": document_id, "report": report.model_dump()}
    )
    return {"report": report.model_dump()}
