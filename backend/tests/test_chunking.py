from app.errors import ValidationFailed
from app.ingestion.chunker import chunk_sections
from app.ingestion.metadata import split_sections
from app.ingestion.models import PageText
from app.ingestion.pdf_parser import extract_pdf_pages


def test_sections_keep_page_and_clause_type():
    pages = [
        PageText(
            page_number=14,
            text=(
                "8.2 Termination\n"
                "Either party may terminate this agreement on 30 days notice.\n\n"
                "9.1 Liability\n"
                "Liability is unlimited."
            ),
        )
    ]
    chunks = chunk_sections(split_sections(pages), document_id="doc-1")
    by_type = {chunk.clause_type: chunk for chunk in chunks}
    assert by_type["termination"].page_number == 14
    assert by_type["termination"].section == "8.2"
    assert "30 days notice" in by_type["termination"].text
    assert by_type["liability"].section == "9.1"
    assert by_type["liability"].page_number == 14


def test_long_paragraph_keeps_section_metadata():
    body = "A" * 2500
    pages = [PageText(page_number=3, text=f"2.4 Confidentiality\n{body}")]
    chunks = chunk_sections(split_sections(pages), document_id="doc-2", max_chars=1000)
    assert len(chunks) >= 2
    assert all(chunk.section == "2.4" for chunk in chunks)
    assert all(chunk.page_number == 3 for chunk in chunks)
    assert all(chunk.clause_type == "confidentiality" for chunk in chunks)


def test_invalid_pdf_is_rejected():
    try:
        extract_pdf_pages(b"this is not a pdf")
    except ValidationFailed as exc:
        assert "PDF" in str(exc)
    else:
        raise AssertionError("expected ValidationFailed")
