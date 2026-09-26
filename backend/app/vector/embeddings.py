"""Embedding calls go through OpenRouter. The chat model is not reused as a vector store."""

import logging
import time

import httpx

from app.config import Settings
from app.errors import ConfigurationError, ExternalServiceError

logger = logging.getLogger(__name__)


class EmbeddingService:
    def __init__(
        self,
        api_key: str,
        model: str,
        dimensions: int,
        base_url: str = "https://openrouter.ai/api/v1",
        client: httpx.Client | None = None,
        timeout: float = 60.0,
    ):
        if not api_key:
            raise ConfigurationError("OPENROUTER_API_KEY is not set.")
        if not model:
            raise ConfigurationError("EMBEDDING_MODEL is not set.")
        self.model = model
        self.dimensions = dimensions
        self._owns_client = client is None
        self._client = client or httpx.Client(
            base_url=base_url.rstrip("/"),
            timeout=timeout,
            headers={"Authorization": f"Bearer {api_key}"},
        )

    @classmethod
    def from_settings(cls, settings: Settings) -> "EmbeddingService":
        key, model, dimensions = settings.require_embeddings()
        return cls(
            api_key=key,
            model=model,
            dimensions=dimensions,
            base_url=settings.openrouter_base_url,
            timeout=settings.llm_timeout_seconds,
        )

    def close(self) -> None:
        if self._owns_client:
            self._client.close()

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        vectors: list[list[float]] = []
        batch_size = 32
        for start in range(0, len(texts), batch_size):
            vectors.extend(self._embed(texts[start : start + batch_size]))
        return vectors

    def embed_query(self, text: str) -> list[float]:
        if not text.strip():
            raise ExternalServiceError("Cannot embed an empty query.")
        return self._embed([text])[0]

    def _embed(self, texts: list[str]) -> list[list[float]]:
        payload = {"model": self.model, "input": texts}
        last_error: Exception | None = None
        for attempt in range(3):
            try:
                response = self._client.post("/embeddings", json=payload)
            except httpx.TimeoutException as exc:
                last_error = ExternalServiceError("The embedding request timed out.")
                logger.warning("Embedding timeout on attempt %s", attempt + 1)
                time.sleep(0.4 * (attempt + 1))
                continue
            except httpx.HTTPError as exc:
                raise ExternalServiceError("The embedding service could not be reached.") from exc
            if response.status_code in {429, 500, 502, 503, 504}:
                last_error = ExternalServiceError(
                    f"The embedding service returned HTTP {response.status_code}."
                )
                time.sleep(0.4 * (attempt + 1))
                continue
            if response.status_code >= 400:
                logger.error("Embedding error %s: %s", response.status_code, response.text[:300])
                raise ExternalServiceError("The embedding service rejected the request.")
            return _parse_vectors(response.json(), expected=len(texts), dimensions=self.dimensions)
        raise last_error or ExternalServiceError("The embedding service failed.")


def _parse_vectors(body: dict, expected: int, dimensions: int) -> list[list[float]]:
    data = body.get("data")
    if not isinstance(data, list) or len(data) != expected:
        raise ExternalServiceError("The embedding service returned an unexpected payload.")
    ordered = sorted(data, key=lambda item: item.get("index", 0))
    vectors: list[list[float]] = []
    for item in ordered:
        vector = item.get("embedding")
        if not isinstance(vector, list) or len(vector) != dimensions:
            raise ExternalServiceError(
                "Embedding dimensions do not match EMBEDDING_DIMENSIONS. "
                "Set EMBEDDING_DIMENSIONS to the size returned by EMBEDDING_MODEL."
            )
        vectors.append([float(value) for value in vector])
    return vectors
