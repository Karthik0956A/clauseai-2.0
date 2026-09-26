"""Environment-backed settings. Secrets are never given default production values."""

from pydantic_settings import BaseSettings, SettingsConfigDict

from app.errors import ConfigurationError

# Must match the development fallback in the Next.js lib/auth.ts so existing
# local sessions keep working. Production must set AUTH_SECRET.
_DEV_AUTH_SECRET = "your-secret-key-change-in-production"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    mongodb_uri: str = ""
    auth_secret: str = ""
    openrouter_api_key: str = ""
    openrouter_model: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    qdrant_url: str = ""
    qdrant_api_key: str = ""
    qdrant_collection: str = "clauseai_chunks"
    embedding_model: str = ""
    embedding_dimensions: int = 1536
    fastapi_url: str = "http://127.0.0.1:8000"
    max_upload_bytes: int = 20 * 1024 * 1024
    retrieval_top_k: int = 5
    retrieval_min_score: float = 0.2
    llm_timeout_seconds: float = 60.0

    def require_mongo(self) -> str:
        if not self.mongodb_uri:
            raise ConfigurationError("MONGODB_URI is not set.")
        return self.mongodb_uri

    def require_openrouter(self) -> tuple[str, str]:
        if not self.openrouter_api_key:
            raise ConfigurationError("OPENROUTER_API_KEY is not set.")
        if not self.openrouter_model:
            raise ConfigurationError("OPENROUTER_MODEL is not set.")
        return self.openrouter_api_key, self.openrouter_model

    def require_embeddings(self) -> tuple[str, str, int]:
        key, _model = self.require_openrouter()
        if not self.embedding_model:
            raise ConfigurationError("EMBEDDING_MODEL is not set.")
        if self.embedding_dimensions < 1:
            raise ConfigurationError("EMBEDDING_DIMENSIONS must be a positive integer.")
        return key, self.embedding_model, self.embedding_dimensions

    def require_qdrant(self) -> str:
        if not self.qdrant_url:
            raise ConfigurationError("QDRANT_URL is not set.")
        return self.qdrant_url

    def jwt_secret(self) -> str:
        if self.auth_secret:
            return self.auth_secret
        if self.environment != "production":
            return _DEV_AUTH_SECRET
        raise ConfigurationError("AUTH_SECRET is required in production.")


def get_settings() -> Settings:
    return Settings()
