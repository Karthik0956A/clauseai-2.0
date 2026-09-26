"""Build live services from the environment. Missing credentials raise ConfigurationError."""

from fastapi import Depends

from app.config import Settings, get_settings
from app.db import DocumentRepository
from app.services.document_service import DocumentService
from app.vector.embeddings import EmbeddingService
from app.vector.qdrant import VectorStoreService


def settings_dep() -> Settings:
    return get_settings()


def document_service(settings: Settings = Depends(settings_dep)) -> DocumentService:
    return DocumentService(
        settings=settings,
        repository=DocumentRepository.from_settings(settings),
        embeddings=EmbeddingService.from_settings(settings),
        vectors=VectorStoreService.from_settings(settings),
    )
