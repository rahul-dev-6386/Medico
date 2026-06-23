"""
Medical RAG Knowledge Base Ingestion Script
Run this on Lightning AI (GPU) to process all 8 medical PDFs.
Produces a qdrant_db/ directory that you download and place at backend/data/qdrant/
"""

import hashlib
import json
import logging
import os
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")
logger = logging.getLogger("lightning_rag")

# ── Config ──────────────────────────────────────────────────────────
BOOKS_DIR = "/content/books"  # Upload PDFs here on Lightning AI
QDRANT_PATH = "/content/qdrant_db"
EMBEDDING_MODEL = "BAAI/bge-small-en-v1.5"
CHUNK_SIZE = 750
CHUNK_OVERLAP = 125
BATCH_SIZE = 64
COLLECTIONS = ["diseases", "laboratory", "pharmacology", "clinical_practice"]

BOOK_MAP = {
    "diseases": [
        "Harrison's Principles of Internal Medicine|Disease Knowledge/Harrisons-Principles-of-Internal-Medicine-20th-Edition-Vol.1-Vol.2-Part-1.pdf",
        "Davidson's Principles and Practice of Medicine|Disease Knowledge/Davidsons-Principles-Practice-of-Medicine-PDFDrive.com-.pdf",
        "Current Medical Diagnosis and Treatment 2025|Disease Knowledge/current-medical-diagnosis-and-treatment-2025-1.pdf",
        "The Merck Manual of Diagnosis and Therapy|Report Intelligence/The_Merck_Manual_of_Diagnosis_and_Therapy_2011_-_19th_Edn........pdf",
    ],
    "laboratory": [
        "Oxford Handbook of Clinical and Laboratory Investigation|Report Intelligence/Oxford-Handbook-of-Clinical-and-Laboratory-Investigation.pdf",
        "The Merck Manual of Diagnosis and Therapy|Report Intelligence/The_Merck_Manual_of_Diagnosis_and_Therapy_2011_-_19th_Edn........pdf",
    ],
    "pharmacology": [
        "Goodman & Gilman's The Pharmacological Basis of Therapeutics|Pharmacology/Goodman-Gilmans-The-Pharmacological-Basis-of-Therapeutics-11th-Edition-2006.pdf",
        "Basic & Clinical Pharmacology|Pharmacology/Basic-Clinical-Pharmacology-2018.pdf",
    ],
    "clinical_practice": [
        "Oxford Handbook of Clinical Medicine|Clinical Practice/8205Oxford Handbook of Clinical Medicine 10th 2017 Edition_SamanSarKo - Copy.pdf",
    ],
}

# ── PDF Extraction ──────────────────────────────────────────────────

HEADER_FOOTER_PATTERNS = [
    re.compile(r"^\s*\d+\s*$"),
    re.compile(r"^\s*Page\s+\d+\s*$", re.I),
    re.compile(r"^\s*[A-Z\s]{10,}\s*$"),
    re.compile(r"^(www\.|http|©|Copyright|Printed)"),
    re.compile(r"^\s*-\s*\d+\s*-\s*$"),
    re.compile(r"^\s*\d+\s*of\s*\d+\s*$", re.I),
    re.compile(r"^\s*CHAPTER\s+\d+", re.I),
]
CHAPTER_RE = re.compile(r"^\s*(?:CHAPTER|Chapter|CH\.|Ch\.)?\s*(\d+|[IVXLCDM]+)[\s.:–-]*(.+)$", re.I)


def extract_chapters(pdf_path: str) -> list[dict]:
    import pdfplumber
    results = []
    current_chapter = "Front Matter"
    current_section = "Introduction"
    page_num = 0

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            page_num += 1
            text = page.extract_text()
            if not text:
                continue
            lines = text.split("\n")
            content = []
            for line in lines:
                s = line.strip()
                if not s:
                    content.append("")
                    continue
                if any(p.match(s) for p in HEADER_FOOTER_PATTERNS):
                    continue
                content.append(s)
            body = "\n".join(content)
            for line in content:
                m = CHAPTER_RE.match(line)
                if m:
                    title = m.group(2).strip().rstrip(".:–- ")
                    current_chapter = f"Chapter {m.group(1)}: {title}" if title else f"Chapter {m.group(1)}"
                    current_section = title or m.group(1)
                    break
            results.append({"chapter": current_chapter, "section": current_section, "text": body, "page_number": page_num})
    return _merge(results)


def _merge(pages):
    merged = []
    buf = None
    for p in pages:
        key = (p["chapter"], p["section"])
        if buf is None:
            buf = dict(p)
            continue
        if (buf["chapter"], buf["section"]) == key:
            buf["text"] += "\n\n" + p["text"]
        else:
            merged.append(buf)
            buf = dict(p)
    if buf:
        merged.append(buf)
    return merged

# ── Chunking ────────────────────────────────────────────────────────

PROTECTED = [
    re.compile(r"^\s*\|.+\|.+\|.*$", re.M),
    re.compile(r"\b\d+\s*[-–]\s*\d+\s*(?:mg|g|µg|mL|L|U|IU|mmol|mEq)"),
]


def chunk_section(section: dict) -> list[dict]:
    import tiktoken
    tokenizer = tiktoken.get_encoding("cl100k_base")
    text = section.get("text", "")
    if not text.strip():
        return []

    placeholders = {}
    for i, pat in enumerate(PROTECTED):
        def repl(m, idx=i):
            key = f"__P{idx}__"
            placeholders[key] = m.group(0)
            return key
        text = pat.sub(repl, text)

    paras = re.split(r"\n\s*\n", text)
    chunks = []
    cur = ""
    for para in paras:
        ps = para.strip()
        if not ps:
            continue
        t = len(tokenizer.encode(ps))
        ct = len(tokenizer.encode(cur)) if cur else 0
        if ct + t > CHUNK_SIZE and cur:
            chunks.append(cur.strip())
            prev = tokenizer.encode(cur)
            ov = prev[-min(CHUNK_OVERLAP, len(prev)):]
            cur = tokenizer.decode(ov) + "\n\n"
        cur += ("\n\n" if cur else "") + ps
    if cur.strip():
        chunks.append(cur.strip())

    result = []
    for i, ct in enumerate(chunks):
        for k, v in placeholders.items():
            ct = ct.replace(k, v)
        c = dict(section, text=ct, chunk_index=i)
        result.append(c)
    return result


def chunk_all(sections):
    all_c = []
    for sec in sections:
        all_c.extend(chunk_section(sec))
    return all_c

# ── Embedding ───────────────────────────────────────────────────────


def get_embedder():
    from sentence_transformers import SentenceTransformer
    logger.info(f"Loading model: {EMBEDDING_MODEL}")
    return SentenceTransformer(EMBEDDING_MODEL)


def embed_batch(model, texts):
    return [emb.tolist() for emb in model.encode(texts, batch_size=BATCH_SIZE, show_progress_bar=True)]

# ── Qdrant Upload ───────────────────────────────────────────────────


def init_qdrant():
    from qdrant_client import QdrantClient
    from qdrant_client.http import models as qm
    os.makedirs(QDRANT_PATH, exist_ok=True)
    client = QdrantClient(path=QDRANT_PATH)
    for name in COLLECTIONS:
        existing = client.get_collections().collections
        if name not in [c.name for c in existing]:
            client.create_collection(
                collection_name=name,
                vectors_config=qm.VectorParams(size=384, distance=qm.Distance.COSINE),
            )
            logger.info(f"Created collection: {name}")
    return client


def upload_batch(client, collection, chunks, vectors):
    from qdrant_client.http import models as qm
    points = []
    for i, (chunk, vec) in enumerate(zip(chunks, vectors)):
        points.append(qm.PointStruct(
            id=hash(f"{collection}:{chunk.get('book','')}:{chunk.get('chapter','')}:{i}") % (2**63),
            vector=vec,
            payload={
                "source_book": chunk.get("book", ""),
                "chapter": chunk.get("chapter", ""),
                "section": chunk.get("section", ""),
                "collection": collection,
                "page_number": str(chunk.get("page_number", "")),
                "medical_topic": "",
                "text": chunk.get("text", "")[:3000],
            },
        ))
    client.upsert(collection_name=collection, points=points, wait=True)
    logger.info(f"  Uploaded {len(points)} to {collection}")

# ── Book Processing ─────────────────────────────────────────────────


def process_book(book_name, rel_path, collection, model, client):
    pdf_path = os.path.join(BOOKS_DIR, rel_path)
    if not os.path.exists(pdf_path):
        logger.warning(f"  SKIP (not found): {pdf_path}")
        return 0
    logger.info(f"  Processing: {book_name}")
    t0 = time.time()
    sections = extract_chapters(pdf_path)
    for s in sections:
        s["book"] = book_name
    logger.info(f"    Sections: {len(sections)} ({time.time()-t0:.1f}s)")

    t0 = time.time()
    chunks = chunk_all(sections)
    logger.info(f"    Chunks: {len(chunks)} ({time.time()-t0:.1f}s)")
    if not chunks:
        return 0

    t0 = time.time()
    for i in range(0, len(chunks), BATCH_SIZE):
        batch = chunks[i:i + BATCH_SIZE]
        vecs = embed_batch(model, [c["text"] for c in batch])
        upload_batch(client, collection, batch, vecs)
        logger.info(f"    {min(i+BATCH_SIZE, len(chunks))}/{len(chunks)} ({time.time()-t0:.1f}s)")
    logger.info(f"  Done: {book_name} ({time.time()-t0:.1f}s)")
    return len(chunks)

# ── Main ────────────────────────────────────────────────────────────


def main():
    logger.info("=" * 60)
    logger.info("Medical RAG Ingestion Pipeline")
    logger.info("=" * 60)

    model = get_embedder()
    client = init_qdrant()

    targets = []
    for coll, books in BOOK_MAP.items():
        for entry in books:
            parts = entry.split("|")
            targets.append((parts[0], parts[1], coll))
    logger.info(f"Total book entries: {len(targets)}")

    total = 0
    with ThreadPoolExecutor(max_workers=2) as pool:
        fut = {pool.submit(process_book, *t, model, client): t for t in targets}
        for f in as_completed(fut):
            t = fut[f]
            try:
                n = f.result()
                total += n
                logger.info(f"  => {t[0]}: {n} chunks")
            except Exception as e:
                logger.error(f"  => {t[0]} FAILED: {e}")

    logger.info(f"\n=== Done: {total} total chunks ===")
    for coll in COLLECTIONS:
        try:
            info = client.get_collection(collection_name=coll)
            logger.info(f"  {coll}: {info.points_count} points")
        except Exception:
            pass
    logger.info(f"\nQdrant database saved to: {QDRANT_PATH}")
    logger.info("Download this directory and place it at backend/data/qdrant/")


if __name__ == "__main__":
    main()
