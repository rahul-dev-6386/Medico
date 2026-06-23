from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime


class DailyMetricCreate(BaseModel):
    date: date
    sleep_hours: Optional[float] = None
    water_ml: Optional[float] = None
    weight_kg: Optional[float] = None
    exercise_min: Optional[int] = None
    steps: Optional[int] = None
    mood: Optional[int] = None
    energy_level: Optional[int] = None
    blood_pressure_sys: Optional[int] = None
    blood_pressure_dia: Optional[int] = None
    blood_sugar: Optional[float] = None
    heart_rate: Optional[int] = None
    oxygen_saturation: Optional[float] = None


class DailyMetricResponse(BaseModel):
    id: int
    user_id: int
    date: date
    sleep_hours: Optional[float] = None
    water_ml: Optional[float] = None
    weight_kg: Optional[float] = None
    exercise_min: Optional[int] = None
    steps: Optional[int] = None
    mood: Optional[int] = None
    energy_level: Optional[int] = None
    blood_pressure_sys: Optional[int] = None
    blood_pressure_dia: Optional[int] = None
    blood_sugar: Optional[float] = None
    heart_rate: Optional[int] = None
    oxygen_saturation: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True


class MetricStats(BaseModel):
    avg_sleep_hours: Optional[float] = None
    avg_water_ml: Optional[float] = None
    avg_weight_kg: Optional[float] = None
    avg_exercise_min: Optional[float] = None
    avg_steps: Optional[float] = None
    avg_mood: Optional[float] = None
    avg_energy: Optional[float] = None
    avg_blood_pressure_sys: Optional[float] = None
    avg_blood_pressure_dia: Optional[float] = None
    avg_blood_sugar: Optional[float] = None
    avg_heart_rate: Optional[float] = None
    avg_oxygen_saturation: Optional[float] = None
