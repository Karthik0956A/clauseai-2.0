"""Semantic comparison of two uploaded contracts."""

from fastapi import APIRouter, Depends, File, UploadFile

from app.ai.llm import LLMService
from app.auth import get_current_user
from app.config import Settings
from app.deps import settings_dep
from app.ingestion.pipeline import build_chunks, load_pages
from app.services.comparison_service import match_clauses
from app.services.extraction_service import ExtractionService
from app.vector.embeddings import EmbeddingService

router = APIRouter(tags=["comparison"])


@router.post("/comparison")
async def compare_contracts(
    file_a: UploadFile = File(...),
    file_b: UploadFile = File(...),
    user_id: str = Depends(get_current_user),
    settings: Settings = Depends(settings_dep),
):
    del user_id  # auth still required; these files are not stored
    left = await _clauses(file_a, "a", settings)
    right = await _clauses(file_b, "b", settings)
    embeddings = EmbeddingService.from_settings(settings)
    left_vectors = embeddings.embed_documents([item["text"] for item in left])
    right_vectors = embeddings.embed_documents([item["text"] for item in right])
    compared = match_clauses(left, right, left_vectors, right_vectors)
    unchanged = sum(1 for item in compared if item.change_type == "UNCHANGED")
    visible = [item for item in compared if item.change_type != "UNCHANGED"]
    return {
        "success": True,
        "data": {
            "unchangedCount": unchanged,
            "clauses": [
                {
                    "title": item.title,
                    "contentA": item.content_a,
                    "contentB": item.content_b,
                    "difference": item.difference,
                    "riskLevel": item.risk_level,
                    "riskAnalysis": item.risk_analysis,
                    "changeType": item.change_type,
                    "materialChange": item.material_change,
                }
                for item in visible
            ],
        },
    }


async def _clauses(upload: UploadFile, document_id: str, settings: Settings) -> list[dict]:
    data = await upload.read()
    pages = load_pages(data, upload.filename or "contract", upload.content_type or "")
    chunks = build_chunks(pages, document_id)
    extracted = ExtractionService(LLMService.from_settings(settings)).extract(chunks)
    return [
        {
            "title": clause.clause_type,
            "clause_type": clause.clause_type,
            "text": clause.text,
            "page": clause.page,
            "section": clause.section,
        }
        for clause in extracted
    ]
