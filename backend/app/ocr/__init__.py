import logging

logger = logging.getLogger(__name__)

_ocr_manager = None


def _get_manager():
    global _ocr_manager
    if _ocr_manager is None:
        from app.ocr.manager import OcrManager
        _ocr_manager = OcrManager()
    return _ocr_manager


def extract_text(file_bytes: bytes, file_type: str) -> str:
    return _get_manager().extract_text(file_bytes, file_type)


def extract_structured(file_bytes: bytes, file_type: str) -> dict:
    return _get_manager().extract_structured(file_bytes, file_type)


ocr_manager = _get_manager()
