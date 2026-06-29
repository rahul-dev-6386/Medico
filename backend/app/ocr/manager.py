import io
import logging
import cv2
import numpy as np
from PIL import Image
from typing import Optional

from app.ocr import preprocessing
from app.ocr import confidence as conf_module
from app.ocr import medical_postprocess

logger = logging.getLogger(__name__)

PADDOCR_THRESHOLD = 0.85
TROCR_THRESHOLD = 0.70


class OcrManager:
    def __init__(self):
        self._paddle = None
        self._trocr = None

    def _get_paddle(self):
        if self._paddle is None:
            from app.ocr import paddle_engine
            self._paddle = paddle_engine
        return self._paddle

    def _get_trocr(self):
        if self._trocr is None:
            from app.ocr import trocr_engine
            self._trocr = trocr_engine
        return self._trocr

    def _bytes_to_cv2(self, file_bytes: bytes) -> np.ndarray:
        arr = np.frombuffer(file_bytes, dtype=np.uint8)
        return cv2.imdecode(arr, cv2.IMREAD_COLOR)

    def _is_handwritten(self, image: np.ndarray, paddle_text: str, paddle_conf: float) -> bool:
        if paddle_conf < 0.6:
            return True
        if len(paddle_text.strip()) < 10:
            return True
        return False

    def extract_text(self, file_bytes: bytes, file_type: str) -> str:
        result = self.extract_structured(file_bytes, file_type)
        return result.get("raw_text", "")

    def extract_structured(self, file_bytes: bytes, file_type: str) -> dict:
        if file_type == "application/pdf":
            return self._process_pdf(file_bytes)

        if file_type in ("image/jpeg", "image/jpg", "image/png"):
            return self._process_image(file_bytes)

        return {
            "raw_text": "",
            "confidence": 0.0,
            "engine": "none",
            "structured_data": {},
        }

    def _process_image(self, file_bytes: bytes) -> dict:
        image = self._bytes_to_cv2(file_bytes)
        if image is None:
            return {"raw_text": "", "confidence": 0.0, "engine": "none", "structured_data": {}}

        processed = preprocessing.preprocess(image)
        processed = preprocessing.resize_for_ocr(processed)

        paddle = self._get_paddle()
        paddle_text, paddle_conf = paddle.run(processed)
        logger.info(f"PaddleOCR confidence: {paddle_conf}")

        is_handwritten = self._is_handwritten(image, paddle_text, paddle_conf)
        engine_used = "PaddleOCR"
        final_text = paddle_text
        final_conf = paddle_conf

        if is_handwritten or paddle_conf < PADDOCR_THRESHOLD:
            logger.info("Handwriting detected or low PaddleOCR confidence — falling back to TrOCR")
            trocr = self._get_trocr()
            trocr_text, trocr_conf = trocr.run(processed)
            logger.info(f"TrOCR confidence: {trocr_conf}")

            if trocr_conf > paddle_conf or trocr_conf >= TROCR_THRESHOLD:
                final_text = trocr_text
                final_conf = trocr_conf
                engine_used = "TrOCR"

        overall_conf = conf_module.assess(final_text, engine_used, paddle_conf, final_conf)
        result = medical_postprocess.postprocess(final_text, engine_used, overall_conf)
        return result

    def _process_pdf(self, file_bytes: bytes) -> dict:
        try:
            from pdf2image import convert_from_bytes
            images = convert_from_bytes(file_bytes, dpi=300)
        except Exception as e:
            logger.warning(f"PDF conversion failed, trying PyPDF2 fallback: {e}")
            return self._pdf_fallback(file_bytes)

        all_text = []
        all_conf = 0.0
        engine_used = "PaddleOCR"
        count = 0

        for page_image in images:
            arr = cv2.cvtColor(np.array(page_image), cv2.COLOR_RGB2BGR)
            processed = preprocessing.preprocess(arr)
            processed = preprocessing.resize_for_ocr(processed)

            paddle = self._get_paddle()
            paddle_text, paddle_conf = paddle.run(processed)
            is_handwritten = self._is_handwritten(arr, paddle_text, paddle_conf)
            page_text = paddle_text
            page_conf = paddle_conf

            if is_handwritten or paddle_conf < PADDOCR_THRESHOLD:
                trocr = self._get_trocr()
                trocr_text, trocr_conf = trocr.run(processed)
                if trocr_conf > paddle_conf or trocr_conf >= TROCR_THRESHOLD:
                    page_text = trocr_text
                    page_conf = trocr_conf
                    engine_used = "TrOCR"

            if page_text.strip():
                all_text.append(page_text)
                all_conf += page_conf
                count += 1

        if not all_text:
            return self._pdf_fallback(file_bytes)

        avg_conf = round(all_conf / count, 4) if count else 0.0
        combined = "\n\n".join(all_text)
        overall_conf = conf_module.assess(combined, engine_used, avg_conf)
        result = medical_postprocess.postprocess(combined, engine_used, overall_conf)
        return result

    def _pdf_fallback(self, file_bytes: bytes) -> dict:
        try:
            import PyPDF2
            reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
            text = ""
            for page in reader.pages:
                text += page.extract_text() or ""
            if text.strip():
                return {
                    "raw_text": text,
                    "confidence": 0.9,
                    "engine": "PyPDF2",
                    "structured_data": medical_postprocess.postprocess(
                        text, "PyPDF2", 0.9
                    ).get("structured_data", {}),
                }
        except Exception:
            pass
        return {"raw_text": "", "confidence": 0.0, "engine": "none", "structured_data": {}}
