"""Split sections on paragraph boundaries and keep page, section, and clause type."""

import uuid

from app.ingestion.models import Chunk

_DEFAULT_MAX_CHARS = 1200


def chunk_sections(
    sections: list,
    document_id: str,
    max_chars: int = _DEFAULT_MAX_CHARS,
) -> list[Chunk]:
    if max_chars < 200:
        raise ValueError("max_chars must be at least 200 so a clause is not shredded.")
    chunks: list[Chunk] = []
    index = 0
    for section in sections:
        paragraphs = [part.strip() for part in section.text.split("\n\n") if part.strip()]
        if not paragraphs:
            paragraphs = [section.text.strip()]
        current = ""
        for paragraph in paragraphs:
            candidate = f"{current}\n\n{paragraph}".strip() if current else paragraph
            if len(candidate) <= max_chars:
                current = candidate
                continue
            if current:
                chunks.append(_make(document_id, section, index, current))
                index += 1
            if len(paragraph) <= max_chars:
                current = paragraph
                continue
            for start in range(0, len(paragraph), max_chars):
                piece = paragraph[start : start + max_chars].strip()
                if not piece:
                    continue
                chunks.append(_make(document_id, section, index, piece))
                index += 1
            current = ""
        if current:
            chunks.append(_make(document_id, section, index, current))
            index += 1
    return chunks


def _make(document_id: str, section, index: int, text: str) -> Chunk:
    return Chunk(
        chunk_id=str(uuid.uuid4()),
        document_id=document_id,
        page_number=section.page_number,
        section=section.section,
        section_title=section.title,
        chunk_index=index,
        clause_type=section.clause_type,
        text=text,
        metadata={
            "section_title": section.title,
            "clause_type": section.clause_type,
        },
    )
