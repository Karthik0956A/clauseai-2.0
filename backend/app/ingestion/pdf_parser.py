"""Extract text page by page so later chunks can cite a page number."""

import io

from pypdf import PdfReader
from pypdf.errors import PdfReadError

from app.errors import ValidationFailed
from app.ingestion.cleaner import clean_text
from app.ingestion.models import PageText


def extract_pdf_pages(data: bytes) -> list[PageText]:
    if not data:
        raise ValidationFailed("The uploaded PDF is empty.")
    try:
        reader = PdfReader(io.BytesIO(data))
    except PdfReadError as exc:
        raise ValidationFailed("The file is not a readable PDF.") from exc
    if reader.is_encrypted:
        try:
            reader.decrypt("")
        except Exception as exc:
            raise ValidationFailed("This PDF is encrypted and cannot be read.") from exc

    pages: list[PageText] = []
    for index, page in enumerate(reader.pages, start=1):
        try:
            raw = page.extract_text() or ""
        except Exception as exc:
            raise ValidationFailed(f"Could not read text on page {index}.") from exc
        pages.append(PageText(page_number=index, text=clean_text(raw), source="pdf"))
    if not pages:
        raise ValidationFailed("The PDF has no pages.")
    return pages


def extract_plain_text(data: bytes, filename: str) -> list[PageText]:
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise ValidationFailed(f"{filename} is not valid UTF-8 text.") from exc
    cleaned = clean_text(text)
    if not cleaned:
        raise ValidationFailed("The text file is empty.")
    return [PageText(page_number=1, text=cleaned, source="text")]
