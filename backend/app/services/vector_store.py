import os
import pickle
import warnings
from typing import Optional

import numpy as np
from app.config import settings

try:
    from qdrant_client import QdrantClient
    from qdrant_client.http import models as qdrant_models
    QDRANT_AVAILABLE = True
except ImportError:
    QDRANT_AVAILABLE = False

try:
    import faiss
    FAISS_AVAILABLE = True
except ImportError:
    FAISS_AVAILABLE = False


class VectorStore:
    def __init__(self):
        self.dimension = settings.EMBEDDING_DIMENSION
        self.collection = settings.QDRANT_COLLECTION
        self.qdrant_client: Optional[QdrantClient] = None
        self.faiss_index = None
        self.faiss_id_map = {}
        self.faiss_next_id = 0
        self._use_faiss = False
        self._initialized = False

    def initialize(self):
        if QDRANT_AVAILABLE and not self._use_faiss:
            try:
                self.qdrant_client = QdrantClient(
                    url=settings.QDRANT_URL,
                    api_key=settings.QDRANT_API_KEY,
                    check_compatibility=False,
                )
                self._ensure_qdrant_collection()
                self._initialized = True
                return
            except Exception:
                pass

        if FAISS_AVAILABLE:
            self._use_faiss = True
            self._load_faiss()
            if self.faiss_index is None:
                import faiss
                self.faiss_index = faiss.IndexFlatIP(self.dimension)
            self._initialized = True

    def _ensure_qdrant_collection(self):
        collections = self.qdrant_client.get_collections().collections
        names = [c.name for c in collections]
        if self.collection not in names:
            self.qdrant_client.create_collection(
                collection_name=self.collection,
                vectors_config=qdrant_models.VectorParams(
                    size=self.dimension,
                    distance=qdrant_models.Distance.COSINE,
                ),
            )

    def _load_faiss(self):
        index_path = os.path.join(settings.FAISS_INDEX_PATH, "index.faiss")
        map_path = os.path.join(settings.FAISS_INDEX_PATH, "id_map.pkl")
        if os.path.exists(index_path) and os.path.exists(map_path):
            self.faiss_index = faiss.read_index(index_path)
            with open(map_path, "rb") as f:
                self.faiss_id_map = pickle.load(f)
            self.faiss_next_id = max(self.faiss_id_map.values()) + 1 if self.faiss_id_map else 0

    def _save_faiss(self):
        if self.faiss_index is None:
            return
        os.makedirs(settings.FAISS_INDEX_PATH, exist_ok=True)
        faiss.write_index(self.faiss_index, os.path.join(settings.FAISS_INDEX_PATH, "index.faiss"))
        with open(os.path.join(settings.FAISS_INDEX_PATH, "id_map.pkl"), "wb") as f:
            pickle.dump(self.faiss_id_map, f)

    def upsert(self, embedding_id: str, embedding: list[float], payload: dict = None):
        if not self._initialized:
            self.initialize()

        if not self._use_faiss and self.qdrant_client:
            self.qdrant_client.upsert(
                collection_name=self.collection,
                points=[qdrant_models.PointStruct(
                    id=hash(embedding_id) % (2**63),
                    vector=embedding,
                    payload=payload or {},
                )],
            )
            return

        if self.faiss_index is None:
            self.faiss_index = faiss.IndexFlatIP(self.dimension)
        vec = np.array([embedding], dtype=np.float32)
        faiss.normalize_L2(vec)
        fid = self.faiss_next_id
        self.faiss_index.add(vec)
        self.faiss_id_map[fid] = {"id": embedding_id, "payload": payload or {}}
        self.faiss_next_id += 1
        self._save_faiss()

    def search(self, query_embedding: list[float], top_k: int = 5) -> list[dict]:
        if not self._initialized:
            self.initialize()

        if not self._use_faiss and self.qdrant_client:
            hits = self.qdrant_client.search(
                collection_name=self.collection,
                query_vector=query_embedding,
                limit=top_k,
            )
            return [
                {
                    "id": hit.id,
                    "score": hit.score,
                    "payload": hit.payload,
                }
                for hit in hits
            ]

        if self.faiss_index is None or self.faiss_index.ntotal == 0:
            return []

        vec = np.array([query_embedding], dtype=np.float32)
        faiss.normalize_L2(vec)
        scores, indices = self.faiss_index.search(vec, min(top_k, self.faiss_index.ntotal))

        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx in self.faiss_id_map and idx >= 0:
                entry = self.faiss_id_map[idx]
                results.append({
                    "id": entry["id"],
                    "score": float(score),
                    "payload": entry["payload"],
                })
        return sorted(results, key=lambda x: x["score"], reverse=True)

    def delete_collection(self):
        if not self._initialized:
            return
        if not self._use_faiss and self.qdrant_client:
            try:
                self.qdrant_client.delete_collection(collection_name=self.collection)
            except Exception:
                pass
        self.faiss_index = None
        self.faiss_id_map = {}
        self.faiss_next_id = 0

    def get_status(self) -> dict:
        if not self._initialized:
            self.initialize()
        if not self._use_faiss and self.qdrant_client:
            try:
                info = self.qdrant_client.get_collection(collection_name=self.collection)
                return {
                    "backend": "qdrant",
                    "points_count": info.points_count,
                    "dimension": self.dimension,
                }
            except Exception:
                pass
        if self.faiss_index:
            return {
                "backend": "faiss",
                "points_count": self.faiss_index.ntotal,
                "dimension": self.dimension,
            }
        return {
            "backend": "none",
            "points_count": 0,
            "dimension": self.dimension,
        }


vector_store = VectorStore()
