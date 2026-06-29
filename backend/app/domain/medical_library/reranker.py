import logging
from typing import Optional

import torch
from sentence_transformers import CrossEncoder
from transformers import AutoTokenizer, AutoModelForSequenceClassification

logger = logging.getLogger("medical_library")

RERANKER_MODEL = "BAAI/bge-reranker-large"
_reranker: Optional[CrossEncoder] = None
_reranker_model = None
_reranker_tokenizer = None


def get_reranker() -> CrossEncoder:
    global _reranker
    if _reranker is None:
        device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Loading reranker model: {RERANKER_MODEL} on {device}")
        _reranker = CrossEncoder(RERANKER_MODEL, device=device)
        logger.info("Reranker loaded")
    return _reranker


def _get_direct_reranker():
    global _reranker_model, _reranker_tokenizer
    if _reranker_model is None:
        device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Loading reranker model (direct): {RERANKER_MODEL} on {device}")
        _reranker_tokenizer = AutoTokenizer.from_pretrained(RERANKER_MODEL)
        _reranker_model = AutoModelForSequenceClassification.from_pretrained(
            RERANKER_MODEL
        ).to(device)
        _reranker_model.eval()
        logger.info("Reranker model (direct) loaded")
    return _reranker_model, _reranker_tokenizer


def rerank(query: str, results: list[dict], top_k: int = 5) -> list[dict]:
    if not results:
        return []

    model, tokenizer = _get_direct_reranker()
    pairs = [(query, r.get("text", "")) for r in results]

    encoded = tokenizer(
        pairs,
        padding=True,
        truncation=True,
        max_length=512,
        return_tensors="pt",
    ).to(model.device)

    with torch.no_grad():
        outputs = model(**encoded)
        scores = outputs.logits.squeeze(-1).tolist()

    if isinstance(scores, float):
        scores = [scores]

    scored = []
    for i, score in enumerate(scores):
        scored.append({**results[i], "rerank_score": float(score)})

    scored.sort(key=lambda x: x["rerank_score"], reverse=True)
    return scored[:top_k]
