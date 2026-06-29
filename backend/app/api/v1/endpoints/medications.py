from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.user import User
from app.models.medication import Medication, MedicationAdherence
from app.schemas.medication import (
    MedicationCreate,
    MedicationUpdate,
    MedicationResponse,
    AdherenceCreate,
)

router = APIRouter(prefix="/api/medications", tags=["Medication Management"])


@router.post("", response_model=MedicationResponse, status_code=status.HTTP_201_CREATED)
def add_medication(
    data: MedicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    medication = Medication(user_id=current_user.id, **data.model_dump())
    db.add(medication)
    db.commit()
    db.refresh(medication)
    return medication


@router.get("", response_model=list[MedicationResponse])
def list_medications(
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Medication).filter(Medication.user_id == current_user.id)
    if active_only:
        query = query.filter(Medication.active == True)
    return query.order_by(Medication.created_at.desc()).all()


@router.get("/{medication_id}", response_model=MedicationResponse)
def get_medication(
    medication_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    medication = (
        db.query(Medication)
        .filter(
            Medication.id == medication_id,
            Medication.user_id == current_user.id,
        )
        .first()
    )
    if not medication:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medication not found")
    return medication


@router.put("/{medication_id}", response_model=MedicationResponse)
def update_medication(
    medication_id: int,
    data: MedicationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    medication = (
        db.query(Medication)
        .filter(
            Medication.id == medication_id,
            Medication.user_id == current_user.id,
        )
        .first()
    )
    if not medication:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medication not found")

    for key, value in data.model_dump(exclude_none=True).items():
        setattr(medication, key, value)

    db.commit()
    db.refresh(medication)
    return medication


@router.delete("/{medication_id}")
def delete_medication(
    medication_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    medication = (
        db.query(Medication)
        .filter(
            Medication.id == medication_id,
            Medication.user_id == current_user.id,
        )
        .first()
    )
    if not medication:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medication not found")

    medication.active = False
    db.commit()
    return {"message": "Medication deactivated"}


@router.post("/{medication_id}/adherence")
def log_adherence(
    medication_id: int,
    data: AdherenceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    medication = (
        db.query(Medication)
        .filter(
            Medication.id == medication_id,
            Medication.user_id == current_user.id,
        )
        .first()
    )
    if not medication:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medication not found")

    adherence = MedicationAdherence(
        medication_id=medication_id,
        scheduled_time=data.scheduled_time,
        taken=data.taken,
        taken_at=data.scheduled_time if data.taken else None,
    )
    db.add(adherence)
    db.commit()
    return {"message": "Adherence logged"}
