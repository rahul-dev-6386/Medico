import hashlib
import json
import os
import time
from typing import Optional

import google.generativeai as genai
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from app.core.config import settings

genai.configure(api_key=settings.GEMINI_API_KEY)


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
        self.model = settings.EMBEDDING_MODEL
        self.dimension = settings.EMBEDDING_DIMENSION
        self.batch_size = settings.MAX_EMBEDDING_BATCH
        self.cache = EmbeddingCache()
        self._rate_limit_remaining = 1500
        self._rate_limit_reset = time.time() + 60

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(Exception),
    )
    def embed(self, text: str) -> list[float]:
        cached = self.cache.get(text)
        if cached:
            return cached

        self._check_rate_limit()
        result = genai.embed_content(model=self.model, content=text)
        embedding = result["embedding"]
        self.cache.set(text, embedding)
        return embedding

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        results = []
        uncached_texts = []
        uncached_indices = []

        for i, text in enumerate(texts):
            cached = self.cache.get(text)
            if cached:
                results.append(cached)
            else:
                results.append(None)
                uncached_texts.append(text)
                uncached_indices.append(i)

        for start in range(0, len(uncached_texts), self.batch_size):
            batch = uncached_texts[start:start + self.batch_size]
            self._check_rate_limit()
            try:
                batch_result = genai.embed_content(
                    model=self.model,
                    content=batch,
                )
                embeddings = batch_result["embedding"]
                for j, emb in enumerate(embeddings):
                    idx = uncached_indices[start + j]
                    results[idx] = emb
                    self.cache.set(batch[j], emb)
            except Exception:
                for j, text in enumerate(batch):
                    idx = uncached_indices[start + j]
                    try:
                        emb = self.embed(text)
                        results[idx] = emb
                    except Exception:
                        results[idx] = [0.0] * self.dimension

        return results

    def _check_rate_limit(self):
        now = time.time()
        if now > self._rate_limit_reset:
            self._rate_limit_remaining = 1500
            self._rate_limit_reset = now + 60
        if self._rate_limit_remaining <= 0:
            sleep_time = self._rate_limit_reset - now
            if sleep_time > 0:
                time.sleep(sleep_time)
            self._rate_limit_remaining = 1500
            self._rate_limit_reset = time.time() + 60
        self._rate_limit_remaining -= 1

    def embed_document(self, text: str) -> dict:
        return {
            "embedding": self.embed(text),
            "dimension": self.dimension,
            "model": self.model,
        }


embedding_service = EmbeddingService()
