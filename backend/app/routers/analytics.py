from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.user import User
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/api/analytics", tags=["Health Analytics"])


@router.get("/trends")
def get_trends(
    type: str = Query("sleep_hours", description="Metric name"),
    days: Optional[int] = Query(30),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = AnalyticsService(db)
    return service.get_trend(current_user.id, type, days)


@router.get("/scores")
def get_scores(
    days: Optional[int] = Query(30),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = AnalyticsService(db)
    return service.get_scores(current_user.id, days)


@router.get("/patterns")
def get_patterns(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = AnalyticsService(db)
    return service.detect_patterns(current_user.id)


@router.get("/monthly-report")
def get_monthly_report(
    month: int,
    year: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = AnalyticsService(db)
    return service.generate_monthly_report(current_user.id, month, year)
