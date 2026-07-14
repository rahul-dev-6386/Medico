import logging
from typing import Optional

logger = logging.getLogger("medical_library")

RERANKER_MODEL = "BAAI/bge-reranker-large"
_reranker_model = None
_reranker_tokenizer = None
_reranker_available = True


def _get_direct_reranker():
    global _reranker_model, _reranker_tokenizer, _reranker_available
    if _reranker_model is not None:
        return _reranker_model, _reranker_tokenizer
    if not _reranker_available:
        return None, None
    try:
        import torch
        from transformers import AutoTokenizer, AutoModelForSequenceClassification

        device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Loading reranker model (direct): {RERANKER_MODEL} on {device}")
        _reranker_tokenizer = AutoTokenizer.from_pretrained(RERANKER_MODEL)
        _reranker_model = AutoModelForSequenceClassification.from_pretrained(
            RERANKER_MODEL
        ).to(device)
        _reranker_model.eval()
        logger.info("Reranker model (direct) loaded")
    except Exception as e:
        logger.warning(f"Reranker unavailable (torch/transformers not installed): {e}")
        _reranker_available = False
        _reranker_model = None
        _reranker_tokenizer = None
    return _reranker_model, _reranker_tokenizer


def rerank(query: str, results: list[dict], top_k: int = 5) -> list[dict]:
    if not results:
        return []

    model, tokenizer = _get_direct_reranker()
    if model is None:
        return results[:top_k]

    import torch
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
