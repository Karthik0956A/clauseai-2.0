"""Upload, extract, chunk, embed, and index one document for one user."""

import logging

from app.config import Settings
from app.db import DocumentRepository
from app.errors import ValidationFailed
from app.ingestion.models import Chunk, PageText
from app.ingestion.pipeline import build_chunks, load_pages, sniff_type
from app.vector.embeddings import EmbeddingService
from app.vector.qdrant import VectorStoreService

logger = logging.getLogger(__name__)


class DocumentService:
    def __init__(
        self,
        settings: Settings,
        repository: DocumentRepository,
        embeddings: EmbeddingService,
        vectors: VectorStoreService,
    ):
        self._settings = settings
        self._repository = repository
        self._embeddings = embeddings
        self._vectors = vectors

    def ingest(self, user_id: str, filename: str, mime_type: str, data: bytes) -> dict:
        self._validate_file(filename, mime_type, data)
        kind = sniff_type(filename, mime_type)
        document_id = self._repository.insert_document(
            {
                "user_id": user_id,
                "filename": filename,
                "mime_type": kind,
                "status": "extracting",
                "stages": ["uploading", "extracting"],
                "page_count": 0,
                "pages": [],
                "error": None,
            }
        )
        try:
            pages = load_pages(data, filename, kind)
            self._repository.update_document(
                user_id,
                document_id,
                {
                    "status": "chunking",
                    "stages": ["uploading", "extracting", "chunking"],
                    "page_count": len(pages),
                    "pages": [{"page_number": page.page_number, "text": page.text, "source": page.source} for page in pages],
                },
            )
            chunks = build_chunks(pages, document_id)
            vectors = self._embeddings.embed_documents([chunk.text for chunk in chunks])
            self._repository.update_document(
                user_id,
                document_id,
                {"status": "indexing", "stages": ["uploading", "extracting", "chunking", "indexing"]},
            )
            self._vectors.delete_document(user_id, document_id)
            self._vectors.upsert_chunks(chunks, vectors, user_id)
            self._repository.replace_chunks(user_id, document_id, [_chunk_record(user_id, chunk) for chunk in chunks])
            stages = ["uploading", "extracting", "chunking", "indexing", "ready"]
            self._repository.update_document(
                user_id,
                document_id,
                {"status": "ready", "stages": stages, "error": None},
            )
        except Exception as exc:
            logger.exception("Document ingest failed for %s", document_id)
            self._repository.update_document(
                user_id,
                document_id,
                {"status": "failed", "error": str(exc)},
            )
            raise
        return {
            "id": document_id,
            "filename": filename,
            "mimeType": kind,
            "status": "ready",
            "stages": stages,
        }

    def reindex(self, user_id: str, document_id: str) -> dict:
        record = self._repository.get_document(user_id, document_id)
        pages = [
            PageText(page_number=page["page_number"], text=page["text"], source=page.get("source", "pdf"))
            for page in record.get("pages") or []
        ]
        if not pages:
            raise ValidationFailed("This document has no extracted text to index.")
        chunks = build_chunks(pages, document_id)
        vectors = self._embeddings.embed_documents([chunk.text for chunk in chunks])
        self._vectors.delete_document(user_id, document_id)
        self._vectors.upsert_chunks(chunks, vectors, user_id)
        self._repository.replace_chunks(user_id, document_id, [_chunk_record(user_id, chunk) for chunk in chunks])
        self._repository.update_document(user_id, document_id, {"status": "ready"})
        return {"id": document_id, "chunks": len(chunks), "status": "ready"}

    def load_chunks(self, user_id: str, document_id: str) -> list[Chunk]:
        rows = self._repository.list_chunks(user_id, document_id)
        return [
            Chunk(
                chunk_id=row["chunk_id"],
                document_id=row["document_id"],
                page_number=row["page_number"],
                section=row["section"],
                section_title=row.get("section_title") or "",
                chunk_index=row["chunk_index"],
                clause_type=row.get("clause_type") or "general",
                text=row["text"],
            )
            for row in rows
        ]

    def remove(self, user_id: str, document_id: str) -> None:
        self._vectors.delete_document(user_id, document_id)
        self._repository.delete_document(user_id, document_id)

    def _validate_file(self, filename: str, mime_type: str, data: bytes) -> None:
        if not data:
            raise ValidationFailed("The uploaded file is empty.")
        if len(data) > self._settings.max_upload_bytes:
            raise ValidationFailed("The file is larger than the 20 MB limit.")
        sniff_type(filename, mime_type)


def _chunk_record(user_id: str, chunk: Chunk) -> dict:
    return {
        "user_id": user_id,
        "chunk_id": chunk.chunk_id,
        "document_id": chunk.document_id,
        "page_number": chunk.page_number,
        "section": chunk.section,
        "section_title": chunk.section_title,
        "chunk_index": chunk.chunk_index,
        "clause_type": chunk.clause_type,
        "text": chunk.text,
    }
