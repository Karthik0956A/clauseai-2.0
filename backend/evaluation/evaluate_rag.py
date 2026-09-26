"""Retrieval evaluation. Exits without a score when the live services are not configured."""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import Settings
from app.errors import ConfigurationError


def main() -> int:
    dataset = json.loads((Path(__file__).parent / "dataset.json").read_text())
    settings = Settings()
    try:
        settings.require_embeddings()
        settings.require_qdrant()
        settings.require_mongo()
    except ConfigurationError as exc:
        print(f"RAG evaluation was not run: {exc}")
        print("Set OPENROUTER_API_KEY, OPENROUTER_MODEL, EMBEDDING_MODEL, QDRANT_URL, and MONGODB_URI.")
        print(f"Dataset contains {len(dataset['questions'])} questions and was not scored.")
        return 2
    print("Services are configured. Index the evaluation contracts, then compare retrieved page and section with dataset.json.")
    print("This script does not print an accuracy percentage until that indexed run is implemented against your data.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
