from sqlalchemy import Column, Integer, String, Text, DateTime, Float, ForeignKey, JSON, Boolean
from sqlalchemy.sql import func

from app.database import Base


class ReportChunk(Base):
    __tablename__ = "report_chunks"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("medical_reports.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    chunk_index = Column(Integer, default=0)
    content = Column(Text, nullable=False)
    chunk_type = Column(String(50), default="general")
    embedding_id = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class LabValue(Base):
    __tablename__ = "lab_values"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("medical_reports.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    test_name = Column(String(255), nullable=False)
    value = Column(Float, nullable=True)
    value_text = Column(String(255), nullable=True)
    unit = Column(String(50), nullable=True)
    reference_range = Column(String(255), nullable=True)
    is_abnormal = Column(Boolean, default=False)
    flag = Column(String(20), nullable=True)
    extracted_at = Column(DateTime(timezone=True), server_default=func.now())


