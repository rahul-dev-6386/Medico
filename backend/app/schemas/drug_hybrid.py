import enum
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class SourceType(str, enum.Enum):
    VERIFIED = "VERIFIED"
    HYBRID = "HYBRID"
    AI_GENERATED = "AI_GENERATED"


class Confidence(str, enum.Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class DrugResponseMetadata(BaseModel):
    source_type: SourceType
    confidence: Confidence
    verified_sections: list[str] = []
    vector_sections: list[str] = []
    generated_sections: list[str] = []
    vector_sources: list[str] = []
    ai_model: Optional[str] = None
    cached: bool = False
    source_count: int = 0
    timestamp: datetime = datetime.utcnow()


class DrugHybridResponse(BaseModel):
    drug: dict[str, Any]
    metadata: DrugResponseMetadata
