from pydantic import BaseModel
from typing import Optional
from datetime import datetime


from pydantic import Field


class MedicalReportResponse(BaseModel):
    id: int
    user_id: int
    title: Optional[str] = None
    file_type: str
    original_filename: str
    extracted_text: Optional[str] = None
    ai_summary: Optional[str] = None
    document_type: Optional[str] = None
    health_score: Optional[int] = None
    structured_data: Optional[dict] = None
    risk_scores: Optional[dict] = None
    processed: bool
    uploaded_at: datetime

    class Config:
        from_attributes = True
