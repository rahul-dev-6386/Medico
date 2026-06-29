from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from datetime import date, timedelta
from typing import Optional

from app.core.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.user import User
from app.models.metrics import DailyMetric
from app.schemas.metrics import DailyMetricCreate, DailyMetricResponse, MetricStats
from sqlalchemy import func

router = APIRouter(prefix="/api/metrics", tags=["Daily Health Metrics"])


@router.post("", response_model=DailyMetricResponse, status_code=status.HTTP_201_CREATED)
def log_metric(
    data: DailyMetricCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = (
        db.query(DailyMetric)
        .filter(
            DailyMetric.user_id == current_user.id,
            DailyMetric.date == data.date,
        )
        .first()
    )
    if existing:
        for key, value in data.model_dump(exclude_none=True).items():
            setattr(existing, key, value)
        db.commit()
        db.refresh(existing)
        return existing

    metric = DailyMetric(user_id=current_user.id, **data.model_dump())
    db.add(metric)
    db.commit()
    db.refresh(metric)
    return metric


@router.get("", response_model=list[DailyMetricResponse])
def list_metrics(
    days: Optional[int] = Query(30, description="Number of days to look back"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    start_date = date.today() - timedelta(days=days)
    return (
        db.query(DailyMetric)
        .filter(
            DailyMetric.user_id == current_user.id,
            DailyMetric.date >= start_date,
        )
        .order_by(DailyMetric.date.desc())
        .all()
    )


@router.get("/latest", response_model=DailyMetricResponse)
def get_latest(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    metric = (
        db.query(DailyMetric)
        .filter(DailyMetric.user_id == current_user.id)
        .order_by(DailyMetric.date.desc())
        .first()
    )
    if not metric:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No metrics found")
    return metric


@router.get("/range", response_model=list[DailyMetricResponse])
def get_range(
    start_date: date,
    end_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(DailyMetric)
        .filter(
            DailyMetric.user_id == current_user.id,
            DailyMetric.date >= start_date,
            DailyMetric.date <= end_date,
        )
        .order_by(DailyMetric.date)
        .all()
    )


@router.get("/stats", response_model=MetricStats)
def get_stats(
    days: Optional[int] = Query(30),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    start_date = date.today() - timedelta(days=days)
    result = (
        db.query(
            func.avg(DailyMetric.sleep_hours).label("avg_sleep_hours"),
            func.avg(DailyMetric.water_ml).label("avg_water_ml"),
            func.avg(DailyMetric.weight_kg).label("avg_weight_kg"),
            func.avg(DailyMetric.exercise_min).label("avg_exercise_min"),
            func.avg(DailyMetric.steps).label("avg_steps"),
            func.avg(DailyMetric.mood).label("avg_mood"),
            func.avg(DailyMetric.energy_level).label("avg_energy"),
            func.avg(DailyMetric.blood_pressure_sys).label("avg_blood_pressure_sys"),
            func.avg(DailyMetric.blood_pressure_dia).label("avg_blood_pressure_dia"),
            func.avg(DailyMetric.blood_sugar).label("avg_blood_sugar"),
            func.avg(DailyMetric.heart_rate).label("avg_heart_rate"),
            func.avg(DailyMetric.oxygen_saturation).label("avg_oxygen_saturation"),
        )
        .filter(
            DailyMetric.user_id == current_user.id,
            DailyMetric.date >= start_date,
        )
        .first()
    )

    return MetricStats(
        avg_sleep_hours=round(result.avg_sleep_hours, 1) if result.avg_sleep_hours else None,
        avg_water_ml=round(result.avg_water_ml, 0) if result.avg_water_ml else None,
        avg_weight_kg=round(result.avg_weight_kg, 1) if result.avg_weight_kg else None,
        avg_exercise_min=round(result.avg_exercise_min, 0) if result.avg_exercise_min else None,
        avg_steps=round(result.avg_steps, 0) if result.avg_steps else None,
        avg_mood=round(result.avg_mood, 1) if result.avg_mood else None,
        avg_energy=round(result.avg_energy, 1) if result.avg_energy else None,
        avg_blood_pressure_sys=round(result.avg_blood_pressure_sys, 0) if result.avg_blood_pressure_sys else None,
        avg_blood_pressure_dia=round(result.avg_blood_pressure_dia, 0) if result.avg_blood_pressure_dia else None,
        avg_blood_sugar=round(result.avg_blood_sugar, 1) if result.avg_blood_sugar else None,
        avg_heart_rate=round(result.avg_heart_rate, 0) if result.avg_heart_rate else None,
        avg_oxygen_saturation=round(result.avg_oxygen_saturation, 1) if result.avg_oxygen_saturation else None,
    )
