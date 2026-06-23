from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, Float
from sqlalchemy.sql import func

from app.database import Base


class DrugEntry(Base):
    __tablename__ = "drug_database"

    id = Column(Integer, primary_key=True, index=True)
    brand_name = Column(String(500), nullable=True)
    generic_name = Column(String(500), nullable=False)
    drug_class = Column(String(255), nullable=True)
    indications = Column(Text, nullable=True)
    contraindications = Column(Text, nullable=True)
    side_effects = Column(Text, nullable=True)
    dosage_info = Column(Text, nullable=True)
    interactions = Column(Text, nullable=True)
    pregnancy_category = Column(String(10), nullable=True)
    rxcui = Column(String(50), nullable=True)
    embedding_id = Column(String(255), nullable=True)
    ingested_at = Column(DateTime(timezone=True), server_default=func.now())
