import logging
from datetime import datetime

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.infrastructure.embedding_provider import get_embedding_provider
from app.models.report import MedicalReport
from app.models.user_report_chunk import UserReportChunk
from app.ocr import ocr_manager
from app.services.classification_service import classification_service

logger = logging.getLogger("report_worker")

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)


def _chunk_semantically(text: str, max_chars: int = 1000, overlap: int = 200) -> list[str]:
    if not text:
        return []
    words = text.split()
    chunks = []
    start = 0
    while start < len(words):
        end = min(start + max_chars, len(words))
        chunk = " ".join(words[start:end])
        if chunk.strip():
            chunks.append(chunk.strip())
        start = end - overlap
        if start < 0:
            start = 0
    return chunks if chunks else [text]


def process_report(report_id: int) -> None:
    logger.info(f"Processing report {report_id}")
    db: Session = SessionLocal()
    try:
        report = db.query(MedicalReport).filter(MedicalReport.id == report_id).first()
        if not report:
            logger.error(f"Report {report_id} not found")
            return

        if report.status == "ready":
            logger.info(f"Report {report_id} already processed")
            return

        report.status = "processing"
        db.commit()

        file_bytes = open(report.file_path, "rb").read()
        file_type = report.file_type or "application/octet-stream"

        ocr_result = ocr_manager.extract_structured(file_bytes, file_type)
        extracted = ocr_result.get("raw_text", "")
        if not extracted:
            report.status = "error"
            report.error_message = "OCR returned no text"
            db.commit()
            return

        report.extracted_text = extracted

        classification_result = classification_service.classify(extracted, report.original_filename or "")
        report.document_type = classification_result.get("document_type", "General Medical Report")
        report.report_type = report.document_type

        structured = classification_service.extract_structured(extracted, report.document_type)
        report.structured_data = structured

        report.processed = True
        db.commit()

        db.refresh(report)

        provider = get_embedding_provider()
        chunks = _chunk_semantically(extracted)
        chunk_models = []
        for i, chunk_text in enumerate(chunks):
            embedding = provider.embed(chunk_text)
            chunk_model = UserReportChunk(
                user_id=report.user_id,
                report_id=report.id,
                chunk_index=i,
                content=chunk_text,
                embedding=embedding,
                report_type=report.document_type,
                language="en",
            )
            chunk_models.append(chunk_model)

        db.add_all(chunk_models)
        db.commit()

        report.status = "ready"
        report.processing_completed_at = datetime.utcnow()
        db.commit()

        logger.info(f"Report {report_id} processed: {len(chunks)} chunks, {len(chunk_models)} stored")

    except Exception as e:
        logger.exception(f"Failed to process report {report_id}: {e}")
        db.rollback()
        report = db.query(MedicalReport).filter(MedicalReport.id == report_id).first()
        if report:
            report.status = "error"
            report.error_message = str(e)
            db.commit()
    finally:
        db.close()
