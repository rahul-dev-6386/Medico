from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime


class MedicationCreate(BaseModel):
    name: str
    dosage: str
    frequency: str
    times: Optional[List[str]] = None
    start_date: date
    end_date: Optional[date] = None
    notes: Optional[str] = None


class MedicationUpdate(BaseModel):
    name: Optional[str] = None
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    times: Optional[List[str]] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    notes: Optional[str] = None
    active: Optional[bool] = None


class MedicationResponse(BaseModel):
    id: int
    user_id: int
    name: str
    dosage: str
    frequency: str
    times: List[str] = []
    start_date: date
    end_date: Optional[date] = None
    notes: Optional[str] = None
    active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class AdherenceCreate(BaseModel):
    scheduled_time: datetime
    taken: bool
