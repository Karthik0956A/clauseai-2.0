"""Qdrant access. Callers never see the client; every search is scoped to one user and document."""

import logging
import uuid

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    FilterSelector,
    MatchValue,
    PointStruct,
    VectorParams,
)

from app.config import Settings
from app.errors import ExternalServiceError, ValidationFailed
from app.ingestion.models import Chunk

logger = logging.getLogger(__name__)


class RetrievedChunk:
    def __init__(self, chunk_id: str, text: str, score: float, payload: dict):
        self.chunk_id = chunk_id
        self.text = text
        self.score = score
        self.payload = payload

    @property
    def page_number(self) -> int | None:
        value = self.payload.get("page_number")
        return int(value) if value is not None else None

    @property
    def section(self) -> str:
        return str(self.payload.get("section") or "")


class VectorStoreService:
    def __init__(self, client: QdrantClient, collection: str, vector_size: int):
        self._client = client
        self.collection = collection
        self.vector_size = vector_size

    @classmethod
    def from_settings(cls, settings: Settings) -> "VectorStoreService":
        url = settings.require_qdrant()
        try:
            client = QdrantClient(url=url, api_key=settings.qdrant_api_key or None)
        except Exception as exc:
            raise ExternalServiceError("Could not connect to Qdrant.") from exc
        return cls(client, settings.qdrant_collection, settings.embedding_dimensions)

    def ensure_collection(self) -> None:
        try:
            exists = self._client.collection_exists(self.collection)
        except Exception as exc:
            raise ExternalServiceError("Qdrant is unavailable.") from exc
        if exists:
            return
        self._client.create_collection(
            collection_name=self.collection,
            vectors_config=VectorParams(size=self.vector_size, distance=Distance.COSINE),
        )

    def upsert_chunks(self, chunks: list[Chunk], vectors: list[list[float]], user_id: str) -> None:
        if not user_id:
            raise ValidationFailed("A user id is required before indexing.")
        if len(chunks) != len(vectors):
            raise ValidationFailed("Each chunk needs exactly one embedding.")
        self.ensure_collection()
        points = []
        for chunk, vector in zip(chunks, vectors):
            if len(vector) != self.vector_size:
                raise ExternalServiceError(
                    "Refusing to store an embedding whose size does not match the Qdrant collection."
                )
            points.append(
                PointStruct(
                    id=str(uuid.uuid5(uuid.NAMESPACE_URL, chunk.chunk_id)),
                    vector=vector,
                    payload={
                        "chunk_id": chunk.chunk_id,
                        "document_id": chunk.document_id,
                        "user_id": user_id,
                        "text": chunk.text,
                        "page_number": chunk.page_number,
                        "section": chunk.section,
                        "section_title": chunk.section_title,
                        "chunk_index": chunk.chunk_index,
                        "clause_type": chunk.clause_type,
                    },
                )
            )
        try:
            self._client.upsert(collection_name=self.collection, points=points)
        except Exception as exc:
            logger.exception("Qdrant upsert failed")
            raise ExternalServiceError("Could not store document embeddings.") from exc

    def delete_document(self, user_id: str, document_id: str) -> None:
        self._require_scope(user_id, document_id)
        try:
            if not self._client.collection_exists(self.collection):
                return
            self._client.delete(
                collection_name=self.collection,
                points_selector=FilterSelector(filter=self._scope_filter(user_id, document_id)),
            )
        except Exception as exc:
            raise ExternalServiceError("Could not delete document embeddings.") from exc

    def search(
        self,
        vector: list[float],
        user_id: str,
        document_id: str,
        top_k: int = 5,
    ) -> list[RetrievedChunk]:
        self._require_scope(user_id, document_id)
        if top_k < 1:
            raise ValidationFailed("top_k must be at least 1.")
        try:
            if not self._client.collection_exists(self.collection):
                return []
            result = self._client.query_points(
                collection_name=self.collection,
                query=vector,
                query_filter=self._scope_filter(user_id, document_id),
                limit=top_k,
                with_payload=True,
            )
        except Exception as exc:
            logger.exception("Qdrant search failed")
            raise ExternalServiceError("Semantic search is unavailable.") from exc
        hits: list[RetrievedChunk] = []
        for point in result.points:
            payload = point.payload or {}
            if payload.get("user_id") != user_id or payload.get("document_id") != document_id:
                logger.error("Qdrant returned a point outside the requested scope")
                continue
            hits.append(
                RetrievedChunk(
                    chunk_id=str(payload.get("chunk_id") or point.id),
                    text=str(payload.get("text") or ""),
                    score=float(point.score or 0),
                    payload=payload,
                )
            )
        return hits

    @staticmethod
    def _require_scope(user_id: str, document_id: str) -> None:
        if not user_id or not document_id:
            raise ValidationFailed("Search requires both a user id and a document id.")

    @staticmethod
    def _scope_filter(user_id: str, document_id: str) -> Filter:
        return Filter(
            must=[
                FieldCondition(key="user_id", match=MatchValue(value=user_id)),
                FieldCondition(key="document_id", match=MatchValue(value=document_id)),
            ]
        )
