"""Extract structured clauses from indexed chunks."""

from app.ingestion.models import Chunk
from app.services.extraction_service import ExtractionService


def run_clause_agent(extraction: ExtractionService, chunks: list[Chunk]) -> list:
    return extraction.extract(chunks)
