import logging
from typing import Optional

from app.rag.embedder import embed_query
from app.rag import indexer

logger = logging.getLogger("rag")


def search(
    query: str,
    collection: Optional[str] = None,
    top_k: int = 5,
    score_threshold: float = 0.0,
) -> list[dict]:
    """Semantic search across Qdrant collections."""
    client = indexer.get_client()
    query_vec = embed_query(query)

    collections = [collection] if collection else indexer.COLLECTIONS
    results = []

    for coll in collections:
        try:
            hits = client.search(
                collection_name=coll,
                query_vector=query_vec,
                limit=top_k,
                score_threshold=score_threshold,
            )
            for h in hits:
                results.append({
                    "score": round(h.score, 4),
                    "collection": coll,
                    "source_book": h.payload.get("source_book", ""),
                    "chapter": h.payload.get("chapter", ""),
                    "section": h.payload.get("section", ""),
                    "page_number": h.payload.get("page_number", ""),
                    "text": h.payload.get("text", ""),
                })
        except Exception as e:
            logger.warning(f"Search failed on {coll}: {e}")

    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:top_k]


def format_citation(result: dict) -> str:
    """Format a search result into a citation string."""
    parts = []
    if result.get("source_book"):
        parts.append(f"Book: {result['source_book']}")
    if result.get("chapter"):
        parts.append(f"Chapter: {result['chapter']}")
    if result.get("section"):
        parts.append(f"Section: {result['section']}")
    if result.get("page_number"):
        parts.append(f"Page: {result['page_number']}")
    return "\n".join(parts)
