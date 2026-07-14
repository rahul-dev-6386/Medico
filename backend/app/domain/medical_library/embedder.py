import logging

from app.infrastructure.embedding_service import embedding_service

logger = logging.getLogger("medical_library")


def embed_texts(texts: list[str], batch_size: int = 256) -> list[list[float]]:
    return embedding_service.embed_batch(texts)


def embed_query(query: str) -> list[float]:
    return embedding_service.embed(query)
