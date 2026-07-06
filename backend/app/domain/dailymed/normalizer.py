"""
Text normalizer for DailyMed section content.

Removes:
- Navigation artifacts
- Footers / headers
- Duplicate paragraphs
- Copyright notices
- Formatting artifacts
- References inside tables
- Empty sections

Normalizes:
- Whitespace
- Lists
- Headings
- Paragraphs
"""

from __future__ import annotations

import re
from typing import Optional


COPYRIGHT_PATTERNS = [
    r"(?i)copyright\s*(©|\(c\))?\s*\d{4}.*?(?:reserved|inc\.|corp|llc|ltd)",
    r"(?i)all\s+rights?\s+reserved",
    r"(?i)trademark.*?(?:is\s+a\s+trademark|registered)",
    r"(?i)registered\s+trademark",
    r"(?i)®|™",
]

FOOTER_PATTERNS = [
    r"(?i)page\s+\d+\s+of\s+\d+",
    r"(?i)rev(?:ised)?\s*:?\s*\d{4}",
    r"^\s*-\s*\d+\s*-\s*$",
    r"(?i)references?\s*:?\s*\d+\s*[-–]\s*\d+",
]

NAV_PATTERNS = [
    r"(?i)click\s+here\s+to\s+go\s+to",
    r"(?i)see\s+section\s+\d+",
    r"(?i)back\s+to\s+top",
    r"(?i)table\s+of\s+contents",
]

TABLE_REFERENCE_PATTERNS = [
    r"\[?table\s+\d+\]?",
    r"\[?figure\s+\d+\]?",
    r"\[?see\s+table\]?",
]

EMPTY_PATTERNS = [
    r"^\s*$",
    r"^\s*n/?a\s*$",
    r"^\s*none\s*$",
    r"^\s*not\s+applicable\s*$",
    r"^\s*not\s+available\s*$",
    r"^\s*not\s+reported\s*$",
    r"^\s*unknown\s*$",
]


def normalize_text(text: Optional[str]) -> Optional[str]:
    if not text:
        return None

    original_lines = text.split("\n")
    cleaned_lines: list[str] = []
    seen_paragraphs: set[str] = set()

    for line in original_lines:
        stripped = line.strip()

        stripped = _remove_patterns(stripped, COPYRIGHT_PATTERNS)
        stripped = _remove_patterns(stripped, FOOTER_PATTERNS)
        stripped = _remove_patterns(stripped, NAV_PATTERNS)
        stripped = _remove_patterns(stripped, TABLE_REFERENCE_PATTERNS)

        stripped = stripped.strip()
        if not stripped:
            continue
        if any(re.match(p, stripped) for p in EMPTY_PATTERNS):
            continue

        # Collapse whitespace within line
        stripped = re.sub(r"\s+", " ", stripped)

        # Deduplicate paragraphs
        paragraph_key = stripped.lower()[:100]
        if paragraph_key in seen_paragraphs:
            continue
        seen_paragraphs.add(paragraph_key)

        cleaned_lines.append(stripped)

    result = "\n".join(cleaned_lines)
    result = re.sub(r"\n{3,}", "\n\n", result)
    result = result.strip()

    return result if result else None


def _remove_patterns(text: str, patterns: list[str]) -> str:
    for pat in patterns:
        try:
            text = re.sub(pat, "", text)
        except re.error:
            pass
    return text
