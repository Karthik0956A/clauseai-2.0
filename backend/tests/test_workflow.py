from app.ai.agents.compliance_agent import run_compliance_agent
from app.ai.agents.risk_agent import run_risk_agent
from app.ai.agents.summary_agent import run_summary_agent
from app.ai.schemas import ExtractedClause
from app.ai.workflow import build_analysis_graph, run_analysis
from app.services.compliance_service import ContractPolicy


def test_workflow_passes_each_stage_forward():
    policy = ContractPolicy(max_liability=1_000_000, required_clauses=["confidentiality"])

    def clause_node(state):
        assert state["chunks"] == ["chunk"]
        return {
            "clauses": [
                ExtractedClause(
                    clause_type="liability",
                    text="Liability shall be unlimited.",
                    page=22,
                    section="12.3",
                )
            ]
        }

    def risk_node(state):
        assert state["clauses"][0].section == "12.3"
        return {"risks": run_risk_agent(state["clauses"])}

    def compliance_node(state):
        assert state["risks"]
        return {"compliance": run_compliance_agent(state["clauses"], policy)}

    def synthesis_node(state):
        assert any(item.result == "FAIL" for item in state["compliance"])
        report = run_summary_agent(None, state["clauses"], state["risks"], state["compliance"])
        return {"report": report}

    report = run_analysis(
        build_analysis_graph(clause_node, risk_node, compliance_node, synthesis_node),
        {"chunks": ["chunk"]},
    )
    assert any(item.rule_id == "unlimited_liability" for item in report.risks)
    assert report.risks[0].evidence.page == 22
    assert report.narrative
    assert report.llm_error
