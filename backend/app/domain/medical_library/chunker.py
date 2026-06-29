import re
import tiktoken

CHUNK_SIZE = 750
CHUNK_OVERLAP = 125

PROTECTED_BLOCKS = [
    re.compile(r"^\s*\|.+\|.+\|.*$", re.M),
    re.compile(r"^\s*(?:Normal|Abnormal|Result|Range|Reference).*", re.I),
    re.compile(r"\b\d+\s*[-–]\s*\d+\s*(?:mg|g|µg|mL|L|U|IU|mmol|mEq|ng|pg)"),
    re.compile(r"(?:Diagnostic Criteria|Diagnosis|ICD-?\d*)[\s\S]{0,200}(?:\n\s*(?:•|-|\d+\.))"),
    re.compile(r"(?:Treatment|Dosage|Administration|Contraindications)[\s\S]{0,300}(?:\n\s*(?:•|-|\d+\.))"),
    re.compile(r"(?:Normal Values|Reference Range|Laboratory Values)[\s\S]{0,300}(?:\n\s*(?:•|-|\d+\.|\|))"),
    re.compile(r"(?:Staging|Classification|Grades?)[\s\S]{0,300}(?:\n\s*(?:•|-|\d+\.|\|))"),
]

tokenizer = tiktoken.get_encoding("cl100k_base")


def chunk_section(section: dict) -> list[dict]:
    text = section.get("text", "")
    if not text.strip():
        return []

    placeholders = {}
    for i, pattern in enumerate(PROTECTED_BLOCKS):

        def replacer(m, idx=i):
            key = f"__PROTECTED_{idx}_{hash(m.group(0)) % (2**32)}__"
            placeholders[key] = m.group(0)
            return key

        text = pattern.sub(replacer, text)

    paragraphs = re.split(r"\n\s*\n", text)
    chunks = []
    current_chunk = ""

    for para in paragraphs:
        para_stripped = para.strip()
        if not para_stripped:
            continue

        is_heading = len(para_stripped) < 120 and not para_stripped.rstrip().endswith(".")
        tokens_para = len(tokenizer.encode(para_stripped))
        tokens_current = len(tokenizer.encode(current_chunk)) if current_chunk else 0

        if tokens_current + tokens_para > CHUNK_SIZE and current_chunk:
            chunks.append(current_chunk.strip())
            prev_tokens = tokenizer.encode(current_chunk)
            overlap_tokens = prev_tokens[-min(CHUNK_OVERLAP, len(prev_tokens)):]
            current_chunk = tokenizer.decode(overlap_tokens) + "\n\n" if overlap_tokens else ""
            if is_heading and current_chunk:
                current_chunk += para_stripped + "\n"
            elif is_heading:
                current_chunk = para_stripped + "\n"
            else:
                current_chunk += para_stripped + "\n"
        else:
            sep = "\n\n" if current_chunk else ""
            current_chunk += sep + para_stripped

    if current_chunk.strip():
        chunks.append(current_chunk.strip())

    result = []
    for i, chunk_text in enumerate(chunks):
        for key, val in placeholders.items():
            chunk_text = chunk_text.replace(key, val)
        chunk = {**section, "text": chunk_text, "chunk_index": i}
        result.append(chunk)

    return result


def chunk_all_sections(sections: list[dict]) -> list[dict]:
    all_chunks = []
    for sec in sections:
        all_chunks.extend(chunk_section(sec))
    return all_chunks
