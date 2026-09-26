"""Store a policy and evaluate one contract against it."""

from fastapi import APIRouter, Depends

from app.ai.llm import LLMService
from app.auth import get_current_user
from app.config import Settings
from app.deps import document_service, settings_dep
from app.services.compliance_service import ContractPolicy, evaluate_policy
from app.services.document_service import DocumentService
from app.services.extraction_service import ExtractionService

router = APIRouter(tags=["compliance"])


class PolicyBody(ContractPolicy):
    pass


@router.post("/policies")
def create_policy(
    body: PolicyBody,
    user_id: str = Depends(get_current_user),
    documents: DocumentService = Depends(document_service),
):
    policy_id = documents._repository.save_policy(user_id, body.model_dump())
    return {"id": policy_id}


@router.get("/policies")
def list_policies(
    user_id: str = Depends(get_current_user),
    documents: DocumentService = Depends(document_service),
):
    return {"policies": documents._repository.list_policies(user_id)}


@router.post("/contracts/{document_id}/compliance")
def check_compliance(
    document_id: str,
    policy: ContractPolicy,
    user_id: str = Depends(get_current_user),
    settings: Settings = Depends(settings_dep),
    documents: DocumentService = Depends(document_service),
):
    chunks = documents.load_chunks(user_id, document_id)
    clauses = ExtractionService(LLMService.from_settings(settings)).extract(chunks)
    results = evaluate_policy(policy, clauses)
    return {"results": [item.model_dump() for item in results]}
