"""Run extraction, OCR fallback, section detection, and chunking."""

import logging

from app.errors import ValidationFailed
from app.ingestion.chunker import chunk_sections
from app.ingestion.metadata import split_sections
from app.ingestion.models import Chunk, PageText
from app.ingestion.ocr import ocr_image, ocr_pdf_pages, page_needs_ocr
from app.ingestion.pdf_parser import extract_pdf_pages, extract_plain_text

logger = logging.getLogger(__name__)

ALLOWED_TYPES = {
    "application/pdf",
    "text/plain",
    "image/png",
    "image/jpeg",
    "image/jpg",
}


def sniff_type(filename: str, declared: str) -> str:
    lowered = filename.lower()
    if lowered.endswith(".pdf"):
        return "application/pdf"
    if lowered.endswith(".txt"):
        return "text/plain"
    if lowered.endswith(".png"):
        return "image/png"
    if lowered.endswith((".jpg", ".jpeg")):
        return "image/jpeg"
    if declared in ALLOWED_TYPES:
        return declared
    raise ValidationFailed("Upload a PDF, UTF-8 text file, PNG, or JPEG.")


def load_pages(data: bytes, filename: str, mime_type: str) -> list[PageText]:
    kind = sniff_type(filename, mime_type)
    if kind == "application/pdf":
        pages = extract_pdf_pages(data)
        missing = [page.page_number for page in pages if page_needs_ocr(page.text)]
        if missing and len(missing) == len(pages):
            logger.info("All %s pages look scanned. Running OCR.", len(pages))
            ocr_text = ocr_pdf_pages(data, missing)
            for page in pages:
                page.text = ocr_text.get(page.page_number, page.text)
                page.source = "ocr"
        elif missing:
            logger.info("Running OCR for sparse pages: %s", missing)
            ocr_text = ocr_pdf_pages(data, missing)
            for page in pages:
                if page.page_number in ocr_text and ocr_text[page.page_number]:
                    page.text = ocr_text[page.page_number]
                    page.source = "ocr"
        if not any(page.text.strip() for page in pages):
            raise ValidationFailed("No text could be extracted from this PDF.")
        return pages
    if kind == "text/plain":
        return extract_plain_text(data, filename)
    text = ocr_image(data)
    return [PageText(page_number=1, text=text, source="ocr")]


def build_chunks(pages: list[PageText], document_id: str) -> list[Chunk]:
    sections = split_sections(pages)
    if not sections:
        raise ValidationFailed("The document did not contain any usable text.")
    chunks = chunk_sections(sections, document_id=document_id)
    if not chunks:
        raise ValidationFailed("Chunking produced no sections.")
    return chunks
