from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Text
from sqlalchemy.sql import func

from app.core.database import Base


class MetricsEmbedding(Base):
    __tablename__ = "metrics_embeddings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    metric_type = Column(String(100), nullable=False)
    metric_date = Column(DateTime, nullable=False)
    summary = Column(Text, nullable=False)
    embedding_id = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
