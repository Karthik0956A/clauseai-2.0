"""Structured clause extraction. The model fills a schema; it does not return free text."""

from app.ai.llm import LLMService
from app.ai.prompts import CLAUSE_EXTRACTION_SYSTEM, extraction_user_prompt
from app.ai.schemas import ClauseExtractionResult, ExtractedClause
from app.ingestion.models import Chunk


class ExtractionService:
    def __init__(self, llm: LLMService):
        self._llm = llm

    def extract(self, chunks: list[Chunk]) -> list[ExtractedClause]:
        if not chunks:
            return []
        blocks = [
            f"[page={chunk.page_number} section={chunk.section} title={chunk.section_title}]\n{chunk.text}"
            for chunk in chunks
        ]
        # Keep each model call bounded. Merge validated batches.
        merged: list[ExtractedClause] = []
        step = 8
        for start in range(0, len(blocks), step):
            prompt = extraction_user_prompt(blocks[start : start + step])
            result = self._llm.complete_structured(
                CLAUSE_EXTRACTION_SYSTEM,
                prompt,
                ClauseExtractionResult,
            )
            merged.extend(result.clauses)
        return merged
