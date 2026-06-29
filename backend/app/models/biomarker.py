from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func

from app.core.database import Base


class BiomarkerTracking(Base):
    __tablename__ = "biomarker_tracking"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    report_id = Column(Integer, ForeignKey("medical_reports.id"), nullable=False)
    biomarker_name = Column(String(255), nullable=False)
    value = Column(Float, nullable=True)
    value_text = Column(String(255), nullable=True)
    unit = Column(String(50), nullable=True)
    reference_range = Column(String(255), nullable=True)
    is_abnormal = Column(Boolean, default=False)
    flag = Column(String(20), nullable=True)
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())


class TimelineEvent(Base):
    __tablename__ = "timeline_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    report_id = Column(Integer, ForeignKey("medical_reports.id"), nullable=True)
    event_type = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    severity = Column(String(20), default="info")
    event_date = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AIInsight(Base):
    __tablename__ = "ai_insights"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    report_id = Column(Integer, ForeignKey("medical_reports.id"), nullable=True)
    insight_type = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    trend = Column(String(20), nullable=True)
    severity = Column(String(20), default="info")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
