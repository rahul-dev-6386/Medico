from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.user import User
from app.models.profile import PatientProfile
from app.schemas.profile import (
    PatientProfileCreate,
    PatientProfileResponse,
    MedicalHistoryUpdate,
    LifestyleUpdate,
)

router = APIRouter(prefix="/api/profile", tags=["Patient Profile"])


@router.post("", response_model=PatientProfileResponse, status_code=status.HTTP_201_CREATED)
def create_profile(
    data: PatientProfileCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = (
        db.query(PatientProfile)
        .filter(PatientProfile.user_id == current_user.id)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Profile already exists",
        )

    profile = PatientProfile(user_id=current_user.id, **data.model_dump(exclude_none=True))
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@router.get("", response_model=PatientProfileResponse)
def get_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = (
        db.query(PatientProfile)
        .filter(PatientProfile.user_id == current_user.id)
        .first()
    )
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )
    return profile


@router.put("", response_model=PatientProfileResponse)
def update_profile(
    data: PatientProfileCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = (
        db.query(PatientProfile)
        .filter(PatientProfile.user_id == current_user.id)
        .first()
    )
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )

    for key, value in data.model_dump(exclude_none=True).items():
        setattr(profile, key, value)

    db.commit()
    db.refresh(profile)
    return profile


@router.get("/medical-history")
def get_medical_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = (
        db.query(PatientProfile)
        .filter(PatientProfile.user_id == current_user.id)
        .first()
    )
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return {
        "allergies": profile.allergies or [],
        "chronic_diseases": profile.chronic_diseases or [],
        "previous_surgeries": profile.previous_surgeries or [],
        "family_history": profile.family_history or [],
        "current_medications": profile.current_medications or [],
    }


@router.put("/medical-history")
def update_medical_history(
    data: MedicalHistoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = (
        db.query(PatientProfile)
        .filter(PatientProfile.user_id == current_user.id)
        .first()
    )
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    for key, value in data.model_dump(exclude_none=True).items():
        setattr(profile, key, value)

    db.commit()
    return {"message": "Medical history updated successfully"}
