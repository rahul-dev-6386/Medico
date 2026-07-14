import logging
from typing import Optional

from app.core.config import settings

logger = logging.getLogger("medical_library")

GEMINI_MODEL = "models/gemini-embedding-001"
GEMINI_DIM = 768

LOCAL_MODEL_NAME = "BAAI/bge-large-en-v1.5"
LOCAL_DIM = 1024

_local_model = None


def _get_provider() -> str:
    return getattr(settings, "LIBRARY_EMBEDDING_PROVIDER", "gemini")


def get_model():
    """Return local SentenceTransformer model if using local provider, else None."""
    if _get_provider() != "local":
        return None
    global _local_model
    if _local_model is None:
        from sentence_transformers import SentenceTransformer
        logger.info(f"Loading local embedding model: {LOCAL_MODEL_NAME}")
        _local_model = SentenceTransformer(LOCAL_MODEL_NAME)
        _local_model.max_seq_length = 512
        logger.info(f"Local embedding model loaded: {LOCAL_MODEL_NAME}")
    return _local_model


def get_embedding_dim() -> int:
    if _get_provider() == "gemini":
        return GEMINI_DIM
    return LOCAL_DIM


def embed_texts(texts: list[str], batch_size: int = 256) -> list[list[float]]:
    provider = _get_provider()

    if provider == "gemini":
        import google.generativeai as genai
        api_key = settings.GEMINI_API_KEY
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY not set")
        genai.configure(api_key=api_key)

        results = []
        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            for text in batch:
                result = genai.embed_content(model=GEMINI_MODEL, content=text)
                results.append(result["embedding"])
            logger.info(
                f"  Embedded batch {i // batch_size + 1}: {len(batch)} texts "
                f"({len(results)}/{len(texts)} total)"
            )
        return results

    model = get_model()
    embeddings = model.encode(
        texts,
        batch_size=batch_size,
        show_progress_bar=True,
        normalize_embeddings=True,
    )
    return [emb.tolist() for emb in embeddings]


def embed_query(query: str) -> list[float]:
    provider = _get_provider()

    if provider == "gemini":
        import google.generativeai as genai
        api_key = settings.GEMINI_API_KEY
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY not set")
        genai.configure(api_key=api_key)
        result = genai.embed_content(model=GEMINI_MODEL, content=query)
        return result["embedding"]

    model = get_model()
    emb = model.encode(query, normalize_embeddings=True, show_progress_bar=False)
    return emb.tolist()
