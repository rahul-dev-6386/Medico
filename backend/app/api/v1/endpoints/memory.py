from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.user import User
from app.services.memory_service import MemoryService

router = APIRouter(prefix="/api/memory", tags=["Long-Term Memory"])


class MemoryCreate(BaseModel):
    category: str
    key: str
    value: str


class MemoryUpdate(BaseModel):
    value: str


@router.get("")
def get_memory(
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = MemoryService(db)
    if category:
        return service.get_by_category(current_user.id, category)
    return service.get_all(current_user.id)


@router.post("", status_code=status.HTTP_201_CREATED)
def create_memory(
    data: MemoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = MemoryService(db)
    entry = service.create(current_user.id, data.category, data.key, data.value)
    return entry


@router.put("/{entry_id}")
def update_memory(
    entry_id: int,
    data: MemoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = MemoryService(db)
    entry = service.update(entry_id, current_user.id, data.value)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Memory entry not found")
    return entry


@router.delete("/{entry_id}")
def delete_memory(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = MemoryService(db)
    if not service.delete(entry_id, current_user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Memory entry not found")
    return {"message": "Memory entry deleted"}
