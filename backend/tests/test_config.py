import pytest

from app.config import Settings
from app.errors import ConfigurationError


def test_embeddings_require_configuration():
    settings = Settings(
        _env_file=None,
        openrouter_api_key="",
        openrouter_model="",
        embedding_model="",
    )
    with pytest.raises(ConfigurationError):
        settings.require_embeddings()


def test_qdrant_url_is_required():
    settings = Settings(_env_file=None, qdrant_url="")
    with pytest.raises(ConfigurationError):
        settings.require_qdrant()
