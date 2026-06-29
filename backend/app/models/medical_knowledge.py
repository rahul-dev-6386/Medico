from sqlalchemy import Column, Integer, String, Text, DateTime, Float
from sqlalchemy.sql import func

from app.core.database import Base


class MedicalGuideline(Base):
    __tablename__ = "medical_guidelines"

    id = Column(Integer, primary_key=True, index=True)
    source = Column(String(255), nullable=False)
    title = Column(String(500), nullable=False)
    specialty = Column(String(255), nullable=True)
    chunk_index = Column(Integer, default=0)
    content = Column(Text, nullable=False)
    embedding_id = Column(String(255), nullable=True)
    url = Column(String(500), nullable=True)
    ingested_at = Column(DateTime(timezone=True), server_default=func.now())
