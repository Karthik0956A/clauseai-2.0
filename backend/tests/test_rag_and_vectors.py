from qdrant_client import QdrantClient

from app.ai.rag import RagPipeline, build_context
from app.ingestion.models import Chunk
from app.vector.qdrant import RetrievedChunk, VectorStoreService


class _Embed:
    def embed_query(self, text: str) -> list[float]:
        return [1.0, 0.0, 0.0]


class _EmptyStore:
    def search(self, vector, user_id, document_id, top_k):
        assert user_id == "user-a"
        assert document_id == "doc-1"
        return []


class _HitStore:
    def search(self, vector, user_id, document_id, top_k):
        return [
            RetrievedChunk(
                chunk_id="c1",
                text="Either party may terminate with 30 days notice.",
                score=0.91,
                payload={"page_number": 14, "section": "8.2", "section_title": "Termination"},
            )
        ]


class _LLM:
    def __init__(self):
        self.system = ""

    def complete(self, system: str, user: str) -> str:
        self.system = system
        assert "30 days notice" in user
        return "Either party may terminate with 30 days' notice."


class _Boom:
    def complete(self, system: str, user: str) -> str:
        raise AssertionError("The model must not be called without retrieved context.")


def test_empty_retrieval_does_not_call_the_model():
    result = RagPipeline(_Embed(), _EmptyStore(), _Boom(), top_k=5, min_score=0.2).answer(
        "What is the termination period?",
        "user-a",
        "doc-1",
    )
    assert result.grounded is False
    assert "sufficient information" in result.answer
    assert result.citations == []


def test_answer_cites_page_and_section():
    llm = _LLM()
    result = RagPipeline(_Embed(), _HitStore(), llm, top_k=5, min_score=0.2).answer(
        "What is the termination period?",
        "user-a",
        "doc-1",
    )
    assert "Do not invent" in llm.system
    assert result.citations[0].page == 14
    assert result.citations[0].section == "8.2"
    assert "Page 14" in result.answer
    assert "Section 8.2" in result.answer


def test_context_includes_location():
    hit = RetrievedChunk("c", "text", 0.5, {"page_number": 2, "section": "1.1", "section_title": "Parties"})
    assert "Page 2" in build_context([hit])
    assert "Section 1.1" in build_context([hit])


def test_search_is_limited_to_the_requesting_user():
    store = VectorStoreService(QdrantClient(":memory:"), "clauseai_chunks", 3)
    own = Chunk("own", "doc-a", 1, "1", "Liability", 0, "liability", "Liability capped at $1 million.")
    secret = Chunk("secret", "doc-b", 4, "9", "Secret", 0, "general", "User B confidential terms.")
    store.upsert_chunks([own], [[1.0, 0.0, 0.0]], "user-a")
    store.upsert_chunks([secret], [[1.0, 0.0, 0.0]], "user-b")

    hits = store.search([1.0, 0.0, 0.0], "user-a", "doc-a", top_k=5)
    assert [hit.text for hit in hits] == ["Liability capped at $1 million."]

    assert store.search([1.0, 0.0, 0.0], "user-a", "doc-b", top_k=5) == []
