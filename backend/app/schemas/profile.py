from pydantic import BaseModel
from typing import Optional, List
from datetime import date


class PatientProfileCreate(BaseModel):
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    blood_group: Optional[str] = None


class MedicalHistoryUpdate(BaseModel):
    allergies: Optional[List[str]] = None
    chronic_diseases: Optional[List[str]] = None
    previous_surgeries: Optional[List[str]] = None
    family_history: Optional[List[str]] = None
    current_medications: Optional[List[str]] = None


class LifestyleUpdate(BaseModel):
    smoking_status: Optional[str] = None
    alcohol_consumption: Optional[str] = None
    activity_level: Optional[str] = None
    dietary_preferences: Optional[str] = None


class PatientProfileResponse(BaseModel):
    id: int
    user_id: int
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    blood_group: Optional[str] = None
    allergies: List[str] = []
    chronic_diseases: List[str] = []
    previous_surgeries: List[str] = []
    family_history: List[str] = []
    current_medications: List[str] = []
    smoking_status: Optional[str] = None
    alcohol_consumption: Optional[str] = None
    activity_level: Optional[str] = None
    dietary_preferences: Optional[str] = None

    class Config:
        from_attributes = True
