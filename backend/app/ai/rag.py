"""Retrieval augmented generation. The answer is built from Qdrant hits, not the whole file."""

from langchain_core.prompts import ChatPromptTemplate

from app.ai.llm import LLMService
from app.ai.prompts import RAG_SYSTEM
from app.ai.schemas import Citation, GroundedAnswer
from app.errors import ExternalServiceError
from app.vector.embeddings import EmbeddingService
from app.vector.qdrant import RetrievedChunk, VectorStoreService

_INSUFFICIENT = (
    "The contract does not contain sufficient information to answer that question."
)


def build_context(hits: list[RetrievedChunk]) -> str:
    blocks = []
    for hit in hits:
        title = hit.payload.get("section_title") or ""
        blocks.append(
            f"Page {hit.page_number} — Section {hit.section} {title}\n{hit.text}".strip()
        )
    return "\n\n".join(blocks)


def citations_from(hits: list[RetrievedChunk]) -> list[Citation]:
    return [
        Citation(
            page=hit.page_number,
            section=hit.section,
            section_title=str(hit.payload.get("section_title") or ""),
            chunk_id=hit.chunk_id,
            score=hit.score,
        )
        for hit in hits
    ]


def format_answer(answer: str, citations: list[Citation]) -> str:
    if not citations:
        return answer
    lines = [answer, "", "Sources:"]
    for citation in citations:
        label = citation.section_title or "Section"
        lines.append(f"Page {citation.page} — Section {citation.section} {label}".strip())
    return "\n".join(lines)


class RagPipeline:
    def __init__(
        self,
        embeddings: EmbeddingService,
        vectors: VectorStoreService,
        llm: LLMService,
        top_k: int = 5,
        min_score: float = 0.2,
    ):
        self._embeddings = embeddings
        self._vectors = vectors
        self._llm = llm
        self._top_k = top_k
        self._min_score = min_score
        self._prompt = ChatPromptTemplate.from_messages(
            [
                ("system", RAG_SYSTEM),
                ("human", "Context:\n{context}\n\nQuestion:\n{question}"),
            ]
        )

    def retrieve(self, question: str, user_id: str, document_id: str) -> list[RetrievedChunk]:
        vector = self._embeddings.embed_query(question)
        hits = self._vectors.search(
            vector=vector,
            user_id=user_id,
            document_id=document_id,
            top_k=self._top_k,
        )
        return [hit for hit in hits if hit.score >= self._min_score]

    def answer(self, question: str, user_id: str, document_id: str) -> GroundedAnswer:
        hits = self.retrieve(question, user_id, document_id)
        citations = citations_from(hits)
        if not hits:
            return GroundedAnswer(answer=_INSUFFICIENT, citations=[], grounded=False)
        context = build_context(hits)
        messages = self._prompt.format_messages(context=context, question=question)
        system = messages[0].content
        user = messages[1].content
        if not isinstance(system, str) or not isinstance(user, str):
            raise ExternalServiceError("The RAG prompt could not be constructed.")
        text = self._llm.complete(system, user)
        return GroundedAnswer(
            answer=format_answer(text, citations),
            citations=citations,
            grounded=True,
        )
