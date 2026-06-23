import logging
from typing import Optional

from sentence_transformers import SentenceTransformer

logger = logging.getLogger("rag")

MODEL_NAME = "BAAI/bge-small-en-v1.5"
_model: Optional[SentenceTransformer] = None


def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        logger.info(f"Loading embedding model: {MODEL_NAME}")
        _model = SentenceTransformer(MODEL_NAME)
    return _model


def embed_texts(texts: list[str], batch_size: int = 64) -> list[list[float]]:
    """Generate embeddings for a list of texts. Returns list of vectors."""
    model = get_model()
    # BGE models perform better with this prefix for retrieval
    prefixed = [f"{t}" for t in texts]
    embeddings = model.encode(prefixed, batch_size=batch_size, show_progress_bar=False)
    return [emb.tolist() for emb in embeddings]


def embed_query(query: str) -> list[float]:
    """Generate embedding for a query string."""
    model = get_model()
    emb = model.encode(query, show_progress_bar=False)
    return emb.tolist()
