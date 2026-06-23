from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.user import User
from app.services.routine_service import RoutineService

router = APIRouter(prefix="/api/routines", tags=["Personalized Routines"])


@router.post("/generate-daily")
def generate_daily(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = RoutineService(db)
    return service.generate_daily(current_user.id)


@router.post("/generate-weekly")
def generate_weekly(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = RoutineService(db)
    return service.generate_weekly(current_user.id)
