from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, Float
from sqlalchemy.sql import func

from app.core.database import Base


class PubMedArticle(Base):
    __tablename__ = "pubmed_articles"

    id = Column(Integer, primary_key=True, index=True)
    pubmed_id = Column(String(50), unique=True, nullable=False)
    title = Column(String(500), nullable=False)
    authors = Column(JSON, default=list)
    abstract = Column(Text, nullable=True)
    journal = Column(String(500), nullable=True)
    publication_date = Column(DateTime, nullable=True)
    doi = Column(String(255), nullable=True)
    keywords = Column(JSON, default=list)
    mesh_terms = Column(JSON, default=list)
    chunk_index = Column(Integer, default=0)
    content_chunk = Column(Text, nullable=False)
    embedding_id = Column(String(255), nullable=True)
    ingested_at = Column(DateTime(timezone=True), server_default=func.now())
