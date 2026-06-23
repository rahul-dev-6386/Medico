import hashlib
import json
from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func

from app.database import Base


class AICache(Base):
    __tablename__ = "ai_cache"

    id = Column(Integer, primary_key=True, index=True)
    cache_key = Column(String(64), nullable=False, unique=True, index=True)
    request_type = Column(String(50), nullable=False)
    prompt = Column(Text, nullable=True)
    provider = Column(String(20), nullable=False)
    response_data = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    @staticmethod
    def make_key(request_type: str, prompt: str, system_instruction: str = "") -> str:
        raw = f"{request_type}:::{prompt}:::{system_instruction}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()
