import os
import json
import logging
from typing import Optional

from qdrant_client import QdrantClient
from qdrant_client.http import models as qm

logger = logging.getLogger("rag")

QDRANT_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "qdrant")

COLLECTIONS = ["diseases", "laboratory", "pharmacology", "clinical_practice"]
EMBEDDING_DIM = 384  # BAAI/bge-small-en-v1.5


def get_client() -> QdrantClient:
    os.makedirs(QDRANT_PATH, exist_ok=True)
    client = QdrantClient(path=QDRANT_PATH)
    return client


def init_collections(client: Optional[QdrantClient] = None):
    if client is None:
        client = get_client()
    for name in COLLECTIONS:
        existing = client.get_collections().collections
        if name not in [c.name for c in existing]:
            client.create_collection(
                collection_name=name,
                vectors_config=qm.VectorParams(
                    size=EMBEDDING_DIM,
                    distance=qm.Distance.COSINE,
                ),
            )
            logger.info(f"Created collection: {name}")
        else:
            logger.info(f"Collection already exists: {name}")


def upload_batch(client: QdrantClient, collection: str, chunks: list[dict], vectors: list[list[float]]):
    """Upload a batch of chunks + vectors to Qdrant."""
    points = []
    for i, (chunk, vector) in enumerate(zip(chunks, vectors)):
        payload = {
            "source_book": chunk.get("book", ""),
            "chapter": chunk.get("chapter", ""),
            "section": chunk.get("section", ""),
            "collection": collection,
            "page_number": str(chunk.get("page_number", "")),
            "medical_topic": "",
            "text": chunk.get("text", "")[:3000],
        }
        points.append(qm.PointStruct(
            id=hash(f"{collection}:{chunk.get('book','')}:{chunk.get('chapter','')}:{i}") % (2**63),
            vector=vector,
            payload=payload,
        ))
    client.upsert(collection_name=collection, points=points, wait=True)
    logger.info(f"Uploaded {len(points)} points to {collection}")


def collection_count(client: Optional[QdrantClient] = None, name: str = "") -> int:
    if client is None:
        client = get_client()
    try:
        info = client.get_collection(collection_name=name)
        return info.points_count
    except Exception:
        return 0


def get_stats(client: Optional[QdrantClient] = None) -> dict:
    if client is None:
        client = get_client()
    stats = {}
    for name in COLLECTIONS:
        stats[name] = collection_count(client, name)
    return stats
