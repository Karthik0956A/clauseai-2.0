"""Normalize extracted contract text without dropping legal wording."""

import re

_HYPHEN_BREAK = re.compile(r"(\w)-\n(\w)")
_MULTISPACE = re.compile(r"[ \t]+")
_BLANK_LINES = re.compile(r"\n{3,}")


def clean_text(text: str) -> str:
    if not text:
        return ""
    cleaned = text.replace("\x00", " ")
    cleaned = _HYPHEN_BREAK.sub(r"\1\2", cleaned)
    cleaned = cleaned.replace("\r\n", "\n").replace("\r", "\n")
    cleaned = _MULTISPACE.sub(" ", cleaned)
    cleaned = _BLANK_LINES.sub("\n\n", cleaned)
    return cleaned.strip()
