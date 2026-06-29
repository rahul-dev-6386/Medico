"""
Standalone Medical Library Ingestion Script
Run on Lightning AI GPU: python lightning_library_ingest.py
"""
import json
import logging
import os
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Optional

import tiktoken
import torch
import fitz
from qdrant_client import QdrantClient
from qdrant_client.http import models as qm
from sentence_transformers import SentenceTransformer, CrossEncoder

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("library_ingest")

BOOKS_DIR = os.path.join(os.path.dirname(__file__), "books")
QDRANT_PATH = os.path.join(os.path.dirname(__file__), "backend", "data", "library_qdrant")

EMBEDDING_MODEL = "BAAI/bge-large-en-v1.5"
EMBEDDING_DIM = 1024
RERANKER_MODEL = "BAAI/bge-reranker-large"
CHUNK_SIZE = 750
CHUNK_OVERLAP = 125
BATCH_SIZE = 128
COLLECTIONS = ["diseases", "laboratory", "pharmacology", "clinical_practice"]

BOOK_MAP = {
    "diseases": [
        ("Harrison's Principles of Internal Medicine", "Disease Knowledge/Harrisons-Principles-of-Internal-Medicine-20th-Edition-Vol.1-Vol.2-Part-1.pdf"),
        ("Davidson's Principles and Practice of Medicine", "Disease Knowledge/Davidsons-Principles-Practice-of-Medicine-PDFDrive.com-.pdf"),
        ("Current Medical Diagnosis and Treatment 2025", "Disease Knowledge/current-medical-diagnosis-and-treatment-2025-1.pdf"),
        ("The Merck Manual of Diagnosis and Therapy", "Report Intelligence/The_Merck_Manual_of_Diagnosis_and_Therapy_2011_-_19th_Edn........pdf"),
    ],
    "laboratory": [
        ("Oxford Handbook of Clinical and Laboratory Investigation", "Report Intelligence/Oxford-Handbook-of-Clinical-and-Laboratory-Investigation.pdf"),
    ],
    "pharmacology": [
        ("Goodman & Gilman's The Pharmacological Basis of Therapeutics", "Pharmacology/Goodman-Gilmans-The-Pharmacological-Basis-of-Therapeutics-11th-Edition-2006.pdf"),
        ("Basic & Clinical Pharmacology", "Pharmacology/Basic-Clinical-Pharmacology-2018.pdf"),
    ],
    "clinical_practice": [
        ("Oxford Handbook of Clinical Medicine", "Clinical Practice/8205Oxford Handbook of Clinical Medicine 10th 2017 Edition_SamanSarKo - Copy.pdf"),
    ],
}

HEADER_FOOTER_PATTERNS = [
    re.compile(r"^\s*\d+\s*$"),
    re.compile(r"^\s*Page\s+\d+\s*$", re.I),
    re.compile(r"^\s*[A-Z\s]{10,}\s*$"),
    re.compile(r"^(www\.|http|©|Copyright|Printed|All rights reserved)"),
    re.compile(r"^\s*-\s*\d+\s*-\s*$"),
    re.compile(r"^\s*\d+\s*of\s*\d+\s*$", re.I),
    re.compile(r"^\s*(?:CHAPTER|Chapter|CH\.|Ch\.)\s+\d+", re.I),
    re.compile(r"^\s*Part\s+[IVXLCDM]+\b", re.I),
]

CHAPTER_RE = re.compile(
    r"^\s*(?:(?:CHAPTER|Chapter|CH\.|Ch\.)\s+)?(\d+|[IVXLCDM]+)\s*[.:–-]?\s*(.+)$", re.I
)
SECTION_RE = re.compile(r"^\s*((?:\d+\.)+\d*\s+.+|(?:[A-Z][a-z]+\s)+(?:[A-Z][a-z]+))\s*$")

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
device = "cuda" if torch.cuda.is_available() else "cpu"
logger.info(f"Device: {device}")


# ===== PDF EXTRACTION =====
def _clean_text(text: str) -> str:
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def extract_chapters(pdf_path: str) -> list[dict]:
    doc = fitz.open(pdf_path)
    results = []
    current_chapter = "Front Matter"
    current_section = "Introduction"
    references_found = False

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
            if any(p.match(stripped) for p in HEADER_FOOTER_PATTERNS):
                if not CHAPTER_RE.match(stripped) and not SECTION_RE.match(stripped):
                    continue
            cm = CHAPTER_RE.match(stripped)
            if cm:
                num = cm.group(1)
                title = cm.group(2).strip().rstrip(".:–- ")
                chapter_candidates.append((f"Chapter {num}: {title}" if title else f"Chapter {num}", title or f"Chapter {num}"))
            content_lines.append(stripped)

        if chapter_candidates:
            best_chapter, best_section = chapter_candidates[-1]
            current_chapter = best_chapter
            current_section = best_section

        body = _clean_text("\n".join(content_lines))
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
    merged = []
    buf = None
    for p in results:
        key = (p["chapter"], p["section"])
        if buf is None:
            buf = {**p}
            continue
        if (buf["chapter"], buf["section"]) == key:
            buf["text"] += "\n\n" + p["text"]
            buf["page_number"] = min(buf["page_number"], p["page_number"])
        else:
            merged.append(buf)
            buf = {**p}
    if buf:
        merged.append(buf)
    return merged


# ===== CHUNKING =====
def chunk_section(section: dict) -> list[dict]:
    text = section.get("text", "")
    if not text.strip():
        return []

    placeholders = {}
    for i, pattern in enumerate(PROTECTED_BLOCKS):
        def replacer(m, idx=i):
            key = f"__P{idx}_{hash(m.group(0)) % (2**32)}__"
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
        t_para = len(tokenizer.encode(para_stripped))
        t_cur = len(tokenizer.encode(current_chunk)) if current_chunk else 0

        if t_cur + t_para > CHUNK_SIZE and current_chunk:
            chunks.append(current_chunk.strip())
            prev_t = tokenizer.encode(current_chunk)
            overlap = prev_t[-min(CHUNK_OVERLAP, len(prev_t)):]
            current_chunk = (tokenizer.decode(overlap) + "\n\n") if overlap else ""
            sep = ""
            current_chunk += (para_stripped + "\n")
        else:
            sep = "\n\n" if current_chunk else ""
            current_chunk += sep + para_stripped

    if current_chunk.strip():
        chunks.append(current_chunk.strip())

    result = []
    for i, ct in enumerate(chunks):
        for k, v in placeholders.items():
            ct = ct.replace(k, v)
        result.append({**section, "text": ct, "chunk_index": i})
    return result


def chunk_all(sections: list[dict]) -> list[dict]:
    all_chunks = []
    for sec in sections:
        all_chunks.extend(chunk_section(sec))
    return all_chunks


# ===== QDRANT =====
def get_qdrant_client() -> QdrantClient:
    os.makedirs(QDRANT_PATH, exist_ok=True)
    return QdrantClient(path=QDRANT_PATH)


def init_collections(client: QdrantClient):
    for name in COLLECTIONS:
        existing = [c.name for c in client.get_collections().collections]
        if name not in existing:
            client.create_collection(
                collection_name=name,
                vectors_config=qm.VectorParams(
                    size=EMBEDDING_DIM,
                    distance=qm.Distance.COSINE,
                ),
                optimizers_config=qm.OptimizersConfigDiff(default_segment_number=2),
                hnsw_config=qm.HnswConfigDiff(m=32, ef_construct=200),
            )
            logger.info(f"Created collection: {name}")
        else:
            info = client.get_collection(collection_name=name)
            logger.info(f"Collection exists: {name} ({info.points_count} points)")


def upload_batch(client: QdrantClient, collection: str, chunks: list[dict], vectors: list[list[float]], global_start_index: int = 0):
    if len(chunks) != len(vectors):
        raise ValueError(f"Chunks/vectors mismatch: {len(chunks)} chunks vs {len(vectors)} vectors")

    points = []
    for offset, (chunk, vec) in enumerate(zip(chunks, vectors)):
        global_i = global_start_index + offset
        book_name = chunk.get("book", "")
        payload = {
            "source_book": book_name,
            "chapter": chunk.get("chapter", ""),
            "section": chunk.get("section", ""),
            "collection": collection,
            "page_number": str(chunk.get("page_number", "")),
            "medical_topic": "",
            "text": chunk.get("text", "")[:5000],
        }
        # Globally unique deterministic ID based on book + absolute chunk index
        pid = hash(f"lib:{collection}:{book_name}:{global_i}") % (2**63 - 1)
        points.append(qm.PointStruct(id=pid, vector=vec, payload=payload))
    response = client.upsert(collection_name=collection, points=points, wait=True)
    if response and hasattr(response, 'status') and response.status != 'ok':
        logger.error(f"Upload failed for batch starting at {global_start_index}: {response}")
    logger.info(f"Uploaded {len(points)} points to {collection} (batch start={global_start_index})")


# ===== EMBEDDING =====
_model = None


def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        logger.info(f"Loading {EMBEDDING_MODEL}...")
        _model = SentenceTransformer(EMBEDDING_MODEL, device=device)
        _model.max_seq_length = 512
        logger.info(f"Model loaded on {_model.device}")
    return _model


def embed_texts(texts: list[str]) -> list[list[float]]:
    model = get_model()
    embs = model.encode(texts, batch_size=BATCH_SIZE, show_progress_bar=True, normalize_embeddings=True)
    return [e.tolist() for e in embs]


# ===== PROCESS BOOK =====
def process_book(book_name: str, pdf_rel_path: str, collection: str, client: QdrantClient) -> dict:
    """Process a single book end-to-end. Returns dict with per-stage counts."""
    result = {
        "book_name": book_name,
        "sections": 0,
        "chunks_generated": 0,
        "embeddings_generated": 0,
        "vectors_uploaded": 0,
    }

    pdf_path = os.path.join(BOOKS_DIR, pdf_rel_path)
    if not os.path.exists(pdf_path):
        logger.warning(f"Book not found: {pdf_path}")
        return result

    logger.info(f"\n{'='*60}\nProcessing: {book_name}\nCollection: {collection}\n{'='*60}")

    t0 = time.time()
    sections = extract_chapters(pdf_path)
    for s in sections:
        s["book"] = book_name
    result["sections"] = len(sections)
    logger.info(f"Extracted {len(sections)} sections ({time.time()-t0:.1f}s)")

    t0 = time.time()
    chunks = chunk_all(sections)
    result["chunks_generated"] = len(chunks)
    logger.info(f"Created {len(chunks)} chunks ({time.time()-t0:.1f}s)")

    if not chunks:
        return result

    total_uploaded = 0
    total_embedded = 0
    t0 = time.time()

    for i in range(0, len(chunks), BATCH_SIZE):
        batch = chunks[i:i + BATCH_SIZE]
        texts = [c["text"] for c in batch]
        vectors = embed_texts(texts)
        total_embedded += len(vectors)
        if len(vectors) != len(batch):
            raise RuntimeError(
                f"Embedding count mismatch: got {len(vectors)} vectors for {len(batch)} texts "
                f"(batch starting at chunk {i})"
            )
        upload_batch(client, collection, batch, vectors, global_start_index=i)
        total_uploaded += len(batch)
        elapsed = time.time() - t0
        logger.info(f"  {total_uploaded}/{len(chunks)} ({elapsed:.1f}s, {total_uploaded/elapsed:.1f}/s)")

    result["embeddings_generated"] = total_embedded
    result["vectors_uploaded"] = total_uploaded
    logger.info(f"Done: {book_name} -> {total_uploaded} chunks in {time.time()-t0:.1f}s")
    return result


# ===== MAIN =====
def main(collections: Optional[list[str]] = None):
    logger.info(f"Medical Library Ingestion Pipeline")
    logger.info(f"Books dir: {BOOKS_DIR}")
    logger.info(f"Qdrant path: {QDRANT_PATH}")
    logger.info(f"Model: {EMBEDDING_MODEL} (dim={EMBEDDING_DIM})")
    logger.info(f"Device: {device}")

    # Delete old Qdrant data for clean state
    if os.path.exists(QDRANT_PATH):
        import shutil
        shutil.rmtree(QDRANT_PATH)
        logger.info("Deleted old Qdrant data")

    client = get_qdrant_client()
    init_collections(client)

    targets = []
    for coll, books in BOOK_MAP.items():
        if collections and coll not in collections:
            continue
        for book_name, pdf_rel in books:
            if "Davidson" in book_name:
                logger.info(f"Skipping {book_name} (OCR required)")
                continue
            targets.append((book_name, pdf_rel, coll))

    logger.info(f"Targets: {len(targets)} book entries")
    logger.info("Processing books SEQUENTIALLY (max_workers=1) to avoid GPU race conditions")

    books_report = []
    with ThreadPoolExecutor(max_workers=1) as pool:
        futures = {pool.submit(process_book, *t, client=client): t for t in targets}
        for f in as_completed(futures):
            t = futures[f]
            try:
                r = f.result()
                books_report.append(r)
                logger.info(f"  Completed: {t[0]} -> {r['vectors_uploaded']} uploaded / {r['chunks_generated']} chunks")
            except Exception as e:
                logger.error(f"  FAILED: {t[0]} -> {e}")
                import traceback
                logger.error(traceback.format_exc())

    logger.info(f"\n{'='*60}")
    logger.info("BOOK INGESTION REPORT")
    logger.info(f"{'='*60}")
    logger.info(f"{'Book':50s} {'Sect':>5s} {'Chnk':>5s} {'Emb':>5s} {'Upld':>5s}")
    logger.info(f"{'-'*70}")
    totals = {"sections": 0, "chunks_generated": 0, "embeddings_generated": 0, "vectors_uploaded": 0}
    for r in books_report:
        logger.info(f"{r['book_name']:50s} {r['sections']:5d} {r['chunks_generated']:5d} {r['embeddings_generated']:5d} {r['vectors_uploaded']:5d}")
        for k in totals:
            totals[k] += r[k]
    logger.info(f"{'-'*70}")
    logger.info(f"{'TOTAL':50s} {totals['sections']:5d} {totals['chunks_generated']:5d} {totals['embeddings_generated']:5d} {totals['vectors_uploaded']:5d}")

    logger.info(f"\n{'='*60}")
    logger.info(f"Total chunks generated: {totals['chunks_generated']}")
    logger.info(f"Total embeddings generated: {totals['embeddings_generated']}")
    logger.info(f"Total vectors uploaded: {totals['vectors_uploaded']}")

    # Validate per-book
    logger.info(f"\n{'='*60}")
    logger.info("VALIDATION: vectors_uploaded vs vectors_stored")
    logger.info(f"{'='*60}")
    for r in books_report:
        expected = r["vectors_uploaded"]
        book = r["book_name"]
        coll = None
        for c, blist in BOOK_MAP.items():
            for bn, _ in blist:
                if bn == book:
                    coll = c
                    break
        if coll:
            actual_stored = 0
            offset = None
            while True:
                results, offset = client.scroll(
                    collection_name=coll,
                    limit=1000,
                    offset=offset,
                    with_payload=["source_book"],
                    with_vectors=False,
                )
                if not results:
                    break
                actual_stored += sum(1 for pt in results if pt.payload.get("source_book") == book)
                if offset is None:
                    break
            status = "OK" if expected == actual_stored else "MISMATCH"
            logger.info(f"  {book:50s} uploaded={expected:5d} stored={actual_stored:5d} [{status}]")
            if expected != actual_stored:
                logger.error(f"  *** INGESTION FAILURE: {book}: {expected - actual_stored} chunks lost!")

    stats = {name: client.get_collection(name).points_count for name in COLLECTIONS}
    logger.info(f"\nCollection stats: {json.dumps(stats, indent=2)}")
    logger.info(f"{'='*60}")
    return stats


if __name__ == "__main__":
    main()
