"""Contract questions answered from retrieved chunks."""

from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends

from app.ai.llm import LLMService
from app.ai.rag import RagPipeline
from app.auth import get_current_user
from app.config import Settings
from app.deps import document_service, settings_dep
from app.services.document_service import DocumentService
from app.vector.embeddings import EmbeddingService
from app.vector.qdrant import VectorStoreService

router = APIRouter(tags=["chat"])


class ChatRequest(BaseModel):
    message: str = Field(min_length=1)
    document_id: str


@router.post("/chat")
def ask_contract(
    body: ChatRequest,
    user_id: str = Depends(get_current_user),
    settings: Settings = Depends(settings_dep),
    documents: DocumentService = Depends(document_service),
):
    documents._repository.get_document(user_id, body.document_id)
    pipeline = RagPipeline(
        embeddings=EmbeddingService.from_settings(settings),
        vectors=VectorStoreService.from_settings(settings),
        llm=LLMService.from_settings(settings),
        top_k=settings.retrieval_top_k,
        min_score=settings.retrieval_min_score,
    )
    result = pipeline.answer(body.message, user_id, body.document_id)
    return {
        "response": result.answer,
        "citations": [citation.model_dump() for citation in result.citations],
        "grounded": result.grounded,
    }
