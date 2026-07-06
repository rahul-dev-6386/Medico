import hashlib
import json
import logging
import os
from typing import Optional

from app.core.config import settings
from app.infrastructure.embedding_provider import get_embedding_provider

logger = logging.getLogger("embedding_service")


class EmbeddingCache:
    def __init__(self, cache_dir: str = None):
        self.cache_dir = cache_dir or settings.CACHE_DIR
        os.makedirs(self.cache_dir, exist_ok=True)

    def _key(self, text: str) -> str:
        return hashlib.sha256(text.encode("utf-8")).hexdigest()

    def _path(self, key: str) -> str:
        return os.path.join(self.cache_dir, f"{key}.json")

    def get(self, text: str) -> Optional[list[float]]:
        path = self._path(self._key(text))
        if os.path.exists(path):
            with open(path) as f:
                return json.load(f)
        return None

    def set(self, text: str, embedding: list[float]):
        path = self._path(self._key(text))
        with open(path, "w") as f:
            json.dump(embedding, f)


class EmbeddingService:
    def __init__(self):
        self.provider = get_embedding_provider()
        self.dimension = self.provider.dimensions
        self.cache = EmbeddingCache()

    def embed(self, text: str) -> list[float]:
        cached = self.cache.get(text)
        if cached:
            return cached
        embedding = self.provider.embed(text)
        self.cache.set(text, embedding)
        return embedding

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        results = []
        uncached = []
        indices = []
        for i, text in enumerate(texts):
            cached = self.cache.get(text)
            if cached:
                results.append(cached)
            else:
                results.append(None)
                uncached.append(text)
                indices.append(i)
        if uncached:
            embeddings = self.provider.embed_batch(uncached)
            for idx, text, emb in zip(indices, uncached, embeddings):
                results[idx] = emb
                self.cache.set(text, emb)
        return results

    def embed_document(self, text: str) -> dict:
        embedding = self.embed(text)
        return {
            "embedding": embedding,
            "dimension": self.dimension,
            "model": self.provider.model_name,
        }


logger.info(f"Embedding service ready (provider={get_embedding_provider().model_name})")
embedding_service = EmbeddingService()
