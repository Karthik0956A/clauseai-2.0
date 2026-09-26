"""Shared ingestion records."""

from dataclasses import dataclass, field


@dataclass
class PageText:
    page_number: int
    text: str
    source: str = "pdf"


@dataclass
class Chunk:
    chunk_id: str
    document_id: str
    page_number: int
    section: str
    section_title: str
    chunk_index: int
    clause_type: str
    text: str
    metadata: dict = field(default_factory=dict)
