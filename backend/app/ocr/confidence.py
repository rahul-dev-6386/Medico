import logging

logger = logging.getLogger(__name__)


def assess(raw_text: str, engine: str, paddle_conf: float, trocr_conf: float = 0.0) -> float:
    confidence = paddle_conf if engine == "PaddleOCR" else trocr_conf

    if not raw_text or len(raw_text.strip()) < 3:
        return 0.0

    length_bonus = min(len(raw_text) / 500, 0.1)
    confidence = min(confidence + length_bonus, 1.0)

    return round(confidence, 4)
