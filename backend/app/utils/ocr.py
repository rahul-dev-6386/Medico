import io
from typing import Optional
import pytesseract
from PIL import Image
import PyPDF2


def extract_text_from_pdf(file_bytes: bytes) -> str:
    text = ""
    pdf_file = io.BytesIO(file_bytes)
    reader = PyPDF2.PdfReader(pdf_file)
    for page in reader.pages:
        text += page.extract_text() or ""
    return text


def extract_text_from_image(file_bytes: bytes) -> str:
    image = Image.open(io.BytesIO(file_bytes))
    text = pytesseract.image_to_string(image)
    return text


def extract_text(file_bytes: bytes, file_type: str) -> Optional[str]:
    if file_type == "application/pdf":
        return extract_text_from_pdf(file_bytes)
    elif file_type in ("image/jpeg", "image/png", "image/jpg"):
        return extract_text_from_image(file_bytes)
    return None
