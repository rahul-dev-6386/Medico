import io
import logging
import torch
import numpy as np
from PIL import Image
from typing import Optional

logger = logging.getLogger(__name__)

_ppocr = None


def _get_engine():
    global _ppocr
    if _ppocr is not None:
        return _ppocr
    try:
        from paddleocr import PaddleOCR
        logger.info("Initializing PaddleOCR (this may take a moment on first load)...")
        _ppocr = PaddleOCR(
            use_angle_cls=True,
            lang="en",
            use_gpu=torch.cuda.is_available(),
            show_log=False,
            det_db_thresh=0.3,
            det_db_box_thresh=0.5,
            rec_batch_num=6,
        )
        logger.info("PaddleOCR ready")
    except Exception as e:
        logger.warning(f"PaddleOCR initialization failed: {e}")
        _ppocr = None
    return _ppocr


def run(image: np.ndarray) -> tuple[str, float]:
    engine = _get_engine()
    if engine is None:
        return "", 0.0

    try:
        result = engine.ocr(image, cls=True)
    except Exception as e:
        logger.warning(f"PaddleOCR inference failed: {e}")
        return "", 0.0

    if not result or not result[0]:
        return "", 0.0

    lines = []
    confidences = []
    for line in result[0]:
        bbox, (text, conf) = line
        if conf < 0.3:
            continue
        lines.append(text)
        confidences.append(conf)

    if not lines:
        return "", 0.0

    full_text = "\n".join(lines)
    avg_confidence = sum(confidences) / len(confidences)
    return full_text, round(avg_confidence, 4)
