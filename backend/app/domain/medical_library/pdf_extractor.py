import re
import fitz


HEADER_FOOTER_PATTERNS = [
    re.compile(r"^\s*\d+\s*$"),
    re.compile(r"^\s*Page\s+\d+\s*$", re.I),
    re.compile(r"^(www\.|http|©|Copyright|Printed|All rights reserved)"),
    re.compile(r"^\s*-\s*\d+\s*-\s*$"),
    re.compile(r"^\s*\d+\s*of\s*\d+\s*$", re.I),
]

CHAPTER_PATTERN = re.compile(
    r"^\s*(?:"
    r"(?:CHAPTER|Chapter|CH\.|Ch\.)\s+(\d+)\s*[.:–/\-]?\s*(.+?)"
    r"|"
    r"(?:SECTION|Section)\s+([IVXLCDM]+)\s*[.:–/\-]?\s*(.+?)"
    r")"
    r"\s*$", re.I
)

SECTION_PATTERN = re.compile(
    r"^\s*("
    r"\d+\.\d+(?:\.\d+)*\s+.+?"
    r"|"
    r"[A-Z][a-z]+(?:[ -][A-Z][a-z]+){1,4}"
    r"|"
    r"(?:Part|PART)\s+[IVXLCDM]+\s*[.:–]?\s*.+?"
    r")\s*$"
)

RUNNING_HEADER_THRESHOLD = 5


def _clean_text(text: str) -> str:
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[^\S\n]{2,}", " ", text)
    return text.strip()


def extract_chapters(pdf_path: str) -> list[dict]:
    doc = fitz.open(pdf_path)
    results = []
    current_chapter = "Front Matter"
    current_section = "Introduction"
    references_found = False
    last_accepted_chapter = None
    consequent_same_chapter = 0

    total_pages = len(doc)
    pages_with_text = sum(1 for i in range(total_pages) if doc[i].get_text("text").strip())
    if pages_with_text == 0:
        doc.close()
        raise ValueError(f"No extractable text found in {pdf_path}")

    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text("text")
        if not text.strip():
            continue

        lines = text.split("\n")
        content_lines = []
        chapter_candidates = []

        for line in lines:
            stripped = line.strip()
            if not stripped:
                content_lines.append("")
                continue

            stripped_clean = re.sub(r"[^\x20-\x7E]", "", stripped).strip()
            if not stripped_clean:
                content_lines.append("")
                continue

            if any(p.match(stripped) for p in HEADER_FOOTER_PATTERNS):
                if not CHAPTER_PATTERN.match(stripped) and not SECTION_PATTERN.match(stripped):
                    continue

            cm = CHAPTER_PATTERN.match(stripped)
            if cm:
                is_likely_heading = len(stripped) < 120 and stripped.startswith(
                    ("Chapter", "CHAPTER", "Section", "SECTION")
                )
                if not is_likely_heading:
                    pass
                else:
                    chapter_num = cm.group(1)
                    section_roman = cm.group(3)
                    title = (cm.group(2) or cm.group(4) or "").strip().rstrip(".:–- ")
                    title_clean = re.sub(r"\s+", " ", title)

                    if chapter_num and len(chapter_num) <= 4 and title_clean and len(title_clean) > 2:
                        if title_clean.startswith((")", ".", ",", "]")):
                            continue
                        chapter_title = f"Chapter {chapter_num}: {title_clean}"

                        if chapter_title == last_accepted_chapter:
                            consequent_same_chapter += 1
                        else:
                            consequent_same_chapter = 1

                        if consequent_same_chapter <= RUNNING_HEADER_THRESHOLD:
                            chapter_candidates.append((chapter_title, title_clean))
                            last_accepted_chapter = chapter_title

                    if section_roman and len(section_roman) <= 3 and title_clean and len(title_clean) > 2:
                        section_title = f"Section {section_roman}: {title_clean}"
                        if section_title != current_chapter:
                            chapter_candidates.append((section_title, title_clean))

            sm = SECTION_PATTERN.match(stripped)
            if sm and len(stripped) > 10 and len(stripped) < 150:
                section_candidates_local = []
                section_candidates_local.append(stripped.strip().rstrip(".: "))

            content_lines.append(stripped)

        if chapter_candidates:
            best_chapter, best_section = chapter_candidates[-1]
            current_chapter = best_chapter
            current_section = best_section

        body = "\n".join(content_lines)
        body = _clean_text(body)
        if not body:
            continue

        results.append({
            "book": "",
            "chapter": current_chapter,
            "section": current_section,
            "text": body,
            "page_number": page_num + 1,
        })

    doc.close()
    return _merge_sections(results)


def _merge_sections(pages: list[dict]) -> list[dict]:
    merged = []
    buffer = None
    for p in pages:
        key = (p["chapter"], p["section"])
        if buffer is None:
            buffer = {**p}
            continue
        if (buffer["chapter"], buffer["section"]) == key:
            buffer["text"] += "\n\n" + p["text"]
            buffer["page_number"] = min(buffer["page_number"], p["page_number"])
        else:
            merged.append(buffer)
            buffer = {**p}
    if buffer:
        merged.append(buffer)
    return merged
