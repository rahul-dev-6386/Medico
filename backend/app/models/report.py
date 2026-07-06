from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, JSON
from sqlalchemy.sql import func

from app.core.database import Base


class MedicalReport(Base):
    __tablename__ = "medical_reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=True)
    document_type = Column(String(50), nullable=True)
    file_type = Column(String(50), nullable=False)
    file_path = Column(String(500), nullable=False)
    original_filename = Column(String(255), nullable=False)
    extracted_text = Column(Text, nullable=True)
    ai_summary = Column(Text, nullable=True)
    structured_data = Column(JSON, nullable=True)
    health_score = Column(Integer, nullable=True)
    risk_scores = Column(JSON, nullable=True)
    processed = Column(Boolean, default=False)
    status = Column(String(20), default="pending")
    report_type = Column(String(100), nullable=True)
    error_message = Column(Text, nullable=True)
    processing_completed_at = Column(DateTime(timezone=True), nullable=True)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
