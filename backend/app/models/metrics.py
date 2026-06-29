from sqlalchemy import Column, Integer, Float, Date, ForeignKey, DateTime
from sqlalchemy.sql import func

from app.core.database import Base


class DailyMetric(Base):
    __tablename__ = "daily_metrics"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False)

    sleep_hours = Column(Float, nullable=True)
    water_ml = Column(Float, nullable=True)
    weight_kg = Column(Float, nullable=True)
    exercise_min = Column(Integer, nullable=True)
    steps = Column(Integer, nullable=True)
    mood = Column(Integer, nullable=True)
    energy_level = Column(Integer, nullable=True)

    blood_pressure_sys = Column(Integer, nullable=True)
    blood_pressure_dia = Column(Integer, nullable=True)
    blood_sugar = Column(Float, nullable=True)
    heart_rate = Column(Integer, nullable=True)
    oxygen_saturation = Column(Float, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
