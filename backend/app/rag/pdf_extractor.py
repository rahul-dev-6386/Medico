import re
import pdfplumber


def extract_chapters(pdf_path: str) -> list[dict]:
    """Extract text from PDF organized by chapters and sections.
    Returns list of {book, chapter, section, text, page_number, heading_level}.
    """
    results = []
    current_chapter = "Front Matter"
    current_section = "Introduction"
    chapter_stack = []
    page_num = 0

    # Patterns likely to be headers/footers/repeated boilerplate
    header_footer_patterns = [
        re.compile(r"^\s*\d+\s*$"),                     # bare page number
        re.compile(r"^\s*Page\s+\d+\s*$", re.I),
        re.compile(r"^\s*[A-Z\s]{10,}\s*$"),              # all-caps running head
        re.compile(r"^(www\.|http|©|Copyright|Printed)"),
        re.compile(r"^\s*-\s*\d+\s*-\s*$"),
        re.compile(r"^\s*\d+\s*of\s*\d+\s*$", re.I),
        re.compile(r"^\s*CHAPTER\s+\d+", re.I),
        re.compile(r"^\s*Part\s+[IVXLCDM]+\b", re.I),
    ]

    chapter_heading = re.compile(
        r"^\s*(?:CHAPTER|Chapter|CH\.|Ch\.)?\s*"
        r"(\d+|[IVXLCDM]+)"
        r"[\s.:–-]*"
        r"(.+)$", re.I
    )
    section_heading = re.compile(
        r"^\s*((?:\d+\.)+\d*\s+.+|(?:(?:[A-Z][a-z]+\s)+[A-Z][a-z]+))\s*$"
    )

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            page_num += 1
            text = page.extract_text()
            if not text:
                continue

            lines = text.split("\n")
            content_lines = []

            for line in lines:
                stripped = line.strip()
                if not stripped:
                    content_lines.append("")
                    continue

                # Skip headers / footers / page numbers
                if any(p.match(stripped) for p in header_footer_patterns):
                    # But don't skip if it looks like a real chapter heading
                    if not chapter_heading.match(stripped) and not section_heading.match(stripped):
                        continue

                content_lines.append(stripped)

            # Join into paragraphs
            body = "\n".join(content_lines)

            # Try to detect chapter headings in this page
            for line in content_lines:
                m = chapter_heading.match(line)
                if m:
                    num = m.group(1)
                    title = m.group(2).strip().rstrip(".:–- ")
                    chapter_title = f"Chapter {num}: {title}" if title else f"Chapter {num}"
                    current_chapter = chapter_title
                    current_section = title or f"Chapter {num}"
                    chapter_stack = [current_chapter, ""]
                    break
                # Detect sections
                sm = section_heading.match(line)
                if sm and len(line) > 10 and len(line) < 120:
                    current_section = line.strip().rstrip(".: ")
                    if len(chapter_stack) == 0:
                        chapter_stack = [current_chapter, current_section]
                    elif len(chapter_stack) == 1:
                        chapter_stack.append(current_section)
                    else:
                        chapter_stack[-1] = current_section

            results.append({
                "book": "",
                "chapter": current_chapter,
                "section": current_section,
                "text": body,
                "page_number": page_num,
            })

    return _merge_sections(results)


def _merge_sections(pages: list[dict]) -> list[dict]:
    """Merge same chapter+section across pages into single entries."""
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
