import json
import logging
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Optional

from app.rag.pdf_extractor import extract_chapters
from app.rag.chunker import chunk_all_sections
from app.rag.embedder import embed_texts
from app.rag import indexer

logger = logging.getLogger("rag")

BOOKS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "books")

# Map: collection -> list of (book name, pdf filename relative to books/<category>/)
BOOK_MAP = {
    "diseases": [
        ("Harrison's Principles of Internal Medicine", "Disease Knowledge/Harrisons-Principles-of-Internal-Medicine-20th-Edition-Vol.1-Vol.2-Part-1.pdf"),
        ("Davidson's Principles and Practice of Medicine", "Disease Knowledge/Davidsons-Principles-Practice-of-Medicine-PDFDrive.com-.pdf"),
        ("Current Medical Diagnosis and Treatment 2025", "Disease Knowledge/current-medical-diagnosis-and-treatment-2025-1.pdf"),
        ("The Merck Manual of Diagnosis and Therapy", "Report Intelligence/The_Merck_Manual_of_Diagnosis_and_Therapy_2011_-_19th_Edn........pdf"),
    ],
    "laboratory": [
        ("Oxford Handbook of Clinical and Laboratory Investigation", "Report Intelligence/Oxford-Handbook-of-Clinical-and-Laboratory-Investigation.pdf"),
        ("The Merck Manual of Diagnosis and Therapy", "Report Intelligence/The_Merck_Manual_of_Diagnosis_and_Therapy_2011_-_19th_Edn........pdf"),
    ],
    "pharmacology": [
        ("Goodman & Gilman's The Pharmacological Basis of Therapeutics", "Pharmacology/Goodman-Gilmans-The-Pharmacological-Basis-of-Therapeutics-11th-Edition-2006.pdf"),
        ("Basic & Clinical Pharmacology", "Pharmacology/Basic-Clinical-Pharmacology-2018.pdf"),
    ],
    "clinical_practice": [
        ("Oxford Handbook of Clinical Medicine", "Clinical Practice/8205Oxford Handbook of Clinical Medicine 10th 2017 Edition_SamanSarKo - Copy.pdf"),
    ],
}


def process_book(book_name: str, pdf_rel_path: str, collection: str) -> int:
    """Extract, chunk, embed, and upload a single book. Returns chunk count."""
    pdf_path = os.path.join(BOOKS_DIR, pdf_rel_path)
    if not os.path.exists(pdf_path):
        logger.warning(f"Book not found: {pdf_path}")
        return 0

    logger.info(f"Processing: {book_name} ({pdf_path})")

    # Phase 1: Extract
    t0 = time.time()
    sections = extract_chapters(pdf_path)
    for s in sections:
        s["book"] = book_name
    logger.info(f"  Extracted {len(sections)} sections in {time.time()-t0:.1f}s")

    # Phase 2: Chunk
    t0 = time.time()
    chunks = chunk_all_sections(sections)
    logger.info(f"  Created {len(chunks)} chunks in {time.time()-t0:.1f}s")

    if not chunks:
        return 0

    # Phase 3: Embed + upload in batches
    client = indexer.get_client()
    batch_size = 64
    total = 0
    t0 = time.time()
    for i in range(0, len(chunks), batch_size):
        batch = chunks[i : i + batch_size]
        texts = [c["text"] for c in batch]
        vectors = embed_texts(texts)
        indexer.upload_batch(client, collection, batch, vectors)
        total += len(batch)
        logger.info(f"  Uploaded {total}/{len(chunks)} chunks ({time.time()-t0:.1f}s elapsed)")

    logger.info(f"  Done: {book_name} -> {total} chunks in {time.time()-t0:.1f}s")
    return total


def run_ingestion(collections: Optional[list[str]] = None, max_workers: int = 2):
    """Run full ingestion pipeline for specified collections (or all)."""
    client = indexer.get_client()
    indexer.init_collections(client)

    targets = []
    for coll, books in BOOK_MAP.items():
        if collections and coll not in collections:
            continue
        for book_name, pdf_rel in books:
            targets.append((book_name, pdf_rel, coll))

    logger.info(f"Ingesting {len(targets)} book entries across targets")

    total_chunks = 0
    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        futures = {pool.submit(process_book, *t): t for t in targets}
        for f in as_completed(futures):
            t = futures[f]
            try:
                n = f.result()
                total_chunks += n
                logger.info(f"  -> {t[0]}: {n} chunks")
            except Exception as e:
                logger.error(f"  -> {t[0]} FAILED: {e}")

    logger.info(f"\n=== Ingestion complete: {total_chunks} total chunks ===")
    stats = indexer.get_stats(client)
    logger.info(f"Collection stats: {json.dumps(stats, indent=2)}")
    return stats


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")
    run_ingestion()
