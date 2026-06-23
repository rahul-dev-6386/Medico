from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey, JSON
from sqlalchemy.orm import relationship

from app.database import Base


class PatientProfile(Base):
    __tablename__ = "patient_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)

    date_of_birth = Column(Date, nullable=True)
    gender = Column(String(20), nullable=True)
    height_cm = Column(Float, nullable=True)
    weight_kg = Column(Float, nullable=True)
    blood_group = Column(String(10), nullable=True)

    allergies = Column(JSON, default=list)
    chronic_diseases = Column(JSON, default=list)
    previous_surgeries = Column(JSON, default=list)
    family_history = Column(JSON, default=list)
    current_medications = Column(JSON, default=list)

    smoking_status = Column(String(50), nullable=True)
    alcohol_consumption = Column(String(50), nullable=True)
    activity_level = Column(String(50), nullable=True)
    dietary_preferences = Column(String(255), nullable=True)

    user = relationship("User", backref="profile")
