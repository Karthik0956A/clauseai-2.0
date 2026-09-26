"""Detect section headings and a clause-type label from the heading text."""

import re
from dataclasses import dataclass

_HEADING = re.compile(
    r"^(?:article|section|clause)?\s*(\d+(?:\.\d+)*)(?:[\.\:\)])?\s+([A-Z][^\n]{2,80})$",
    re.IGNORECASE,
)

_CLAUSE_LABELS: tuple[tuple[str, str], ...] = (
    ("liabil", "liability"),
    ("indemn", "indemnification"),
    ("terminat", "termination"),
    ("renew", "renewal"),
    ("confidential", "confidentiality"),
    ("data protection", "data_protection"),
    ("privacy", "data_protection"),
    ("payment", "payment"),
    ("fee", "payment"),
    ("intellectual property", "intellectual_property"),
    ("governing law", "governing_law"),
    ("jurisdiction", "jurisdiction"),
    ("dispute", "dispute_resolution"),
    ("arbitrat", "dispute_resolution"),
    ("service level", "sla"),
    ("non-compete", "non_compete"),
    ("noncompete", "non_compete"),
    ("non-solicit", "non_solicitation"),
    ("insurance", "insurance"),
    ("force majeure", "force_majeure"),
)


@dataclass
class SectionSpan:
    section: str
    title: str
    clause_type: str
    page_number: int
    text: str


def clause_type_from_title(title: str) -> str:
    lowered = title.lower()
    for needle, label in _CLAUSE_LABELS:
        if needle in lowered:
            return label
    return "general"


def split_sections(pages: list) -> list[SectionSpan]:
    """Walk pages in order. A heading starts a section and keeps that page number."""
    sections: list[SectionSpan] = []
    current: SectionSpan | None = None
    buffer: list[str] = []

    def flush() -> None:
        nonlocal current, buffer
        if current is None:
            return
        current.text = "\n".join(part for part in buffer if part).strip()
        if current.text:
            sections.append(current)
        buffer = []

    for page in pages:
        for raw_line in page.text.splitlines():
            line = raw_line.strip()
            if not line:
                buffer.append("")
                continue
            match = _HEADING.match(line)
            if match:
                flush()
                title = match.group(2).strip()
                current = SectionSpan(
                    section=match.group(1),
                    title=title,
                    clause_type=clause_type_from_title(title),
                    page_number=page.page_number,
                    text="",
                )
                buffer = [line]
            else:
                if current is None:
                    current = SectionSpan(
                        section="0",
                        title="Preamble",
                        clause_type="general",
                        page_number=page.page_number,
                        text="",
                    )
                buffer.append(line)
    flush()
    return sections
