"""LangGraph workflow. Each node returns a partial state that the next node reads."""

from typing import TypedDict

from langgraph.graph import END, START, StateGraph

from app.ai.schemas import AnalysisReport


class AnalysisState(TypedDict, total=False):
    chunks: list
    clauses: list
    risks: list
    compliance: list
    report: dict


def build_analysis_graph(clause_node, risk_node, compliance_node, synthesis_node):
    graph = StateGraph(AnalysisState)
    graph.add_node("clause_agent", clause_node)
    graph.add_node("risk_agent", risk_node)
    graph.add_node("compliance_agent", compliance_node)
    graph.add_node("synthesis_agent", synthesis_node)
    graph.add_edge(START, "clause_agent")
    graph.add_edge("clause_agent", "risk_agent")
    graph.add_edge("risk_agent", "compliance_agent")
    graph.add_edge("compliance_agent", "synthesis_agent")
    graph.add_edge("synthesis_agent", END)
    return graph.compile()


def run_analysis(app, initial: AnalysisState | None = None) -> AnalysisReport:
    final = app.invoke(initial or {})
    report = final.get("report")
    if isinstance(report, AnalysisReport):
        return report
    if isinstance(report, dict):
        return AnalysisReport.model_validate(report)
    raise RuntimeError("The analysis workflow did not produce a report.")
