import logging
from typing import Optional

import torch
from sentence_transformers import SentenceTransformer

logger = logging.getLogger("medical_library")

MODEL_NAME = "BAAI/bge-large-en-v1.5"
EMBEDDING_DIM = 1024
_model: Optional[SentenceTransformer] = None
_device: Optional[str] = None


def get_device() -> str:
    global _device
    if _device is None:
        _device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Embedding device: {_device}")
    return _device


def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        logger.info(f"Loading embedding model: {MODEL_NAME}")
        _model = SentenceTransformer(MODEL_NAME, device=get_device())
        _model.max_seq_length = 512
        logger.info(f"Embedding model loaded: {MODEL_NAME} on {_model.device}")
    return _model


def embed_texts(texts: list[str], batch_size: int = 256) -> list[list[float]]:
    model = get_model()
    prefixed = [f"{t}" for t in texts]
    embeddings = model.encode(
        prefixed,
        batch_size=batch_size,
        show_progress_bar=True,
        normalize_embeddings=True,
    )
    return [emb.tolist() for emb in embeddings]


def embed_query(query: str) -> list[float]:
    model = get_model()
    emb = model.encode(query, normalize_embeddings=True, show_progress_bar=False)
    return emb.tolist()
