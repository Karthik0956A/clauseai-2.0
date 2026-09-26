"""OCR for scanned pages. Fails clearly when Tesseract or Poppler is missing."""

import io
import logging

from app.errors import ExternalServiceError, ValidationFailed
from app.ingestion.cleaner import clean_text

logger = logging.getLogger(__name__)

_MIN_TEXT_CHARS = 20


def page_needs_ocr(text: str) -> bool:
    return len((text or "").strip()) < _MIN_TEXT_CHARS


def ocr_pdf_pages(data: bytes, page_numbers: list[int]) -> dict[int, str]:
    """Return OCR text keyed by 1-based page number."""
    if not page_numbers:
        return {}
    try:
        import pytesseract
        from pdf2image import convert_from_bytes
    except ImportError as exc:
        raise ExternalServiceError(
            "OCR requires the pytesseract and pdf2image packages, plus the Tesseract and Poppler binaries."
        ) from exc

    try:
        images = convert_from_bytes(data)
    except Exception as exc:
        raise ExternalServiceError(
            "Could not render PDF pages for OCR. Install Poppler and ensure it is on PATH."
        ) from exc

    found: dict[int, str] = {}
    for number in page_numbers:
        if number < 1 or number > len(images):
            raise ValidationFailed(f"Page {number} is outside the document.")
        try:
            text = pytesseract.image_to_string(images[number - 1])
        except pytesseract.TesseractNotFoundError as exc:
            raise ExternalServiceError(
                "Tesseract is not installed. Scanned pages cannot be read until the tesseract binary is available."
            ) from exc
        except Exception as exc:
            logger.exception("OCR failed on page %s", number)
            raise ExternalServiceError(f"OCR failed on page {number}.") from exc
        found[number] = clean_text(text)
    return found


def ocr_image(data: bytes) -> str:
    try:
        import pytesseract
        from PIL import Image
    except ImportError as exc:
        raise ExternalServiceError(
            "Image OCR requires Pillow, pytesseract, and the Tesseract binary."
        ) from exc
    try:
        image = Image.open(io.BytesIO(data))
        text = pytesseract.image_to_string(image)
    except pytesseract.TesseractNotFoundError as exc:
        raise ExternalServiceError(
            "Tesseract is not installed, so this image cannot be read."
        ) from exc
    except Exception as exc:
        raise ExternalServiceError("Could not read text from the uploaded image.") from exc
    cleaned = clean_text(text)
    if not cleaned:
        raise ValidationFailed("OCR did not find any text in the image.")
    return cleaned
