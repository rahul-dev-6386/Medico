from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.user import User, UserRole
from app.models.profile import PatientProfile
from app.models.metrics import DailyMetric
from app.models.medication import Medication
from app.services.rag_service import rag_service

router = APIRouter(prefix="/api/knowledge", tags=["Medical Knowledge"])


class SearchRequest(BaseModel):
    query: str
    top_k: Optional[int] = 5


class QueryRequest(BaseModel):
    query: str


class IngestRequest(BaseModel):
    documents: list[str]


@router.post("/search")
def search_knowledge(
    data: SearchRequest,
    current_user: User = Depends(get_current_user),
):
    results = rag_service.search(data.query, data.top_k)
    return {"results": results}


@router.post("/query")
def query_knowledge(
    data: QueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = (
        db.query(PatientProfile)
        .filter(PatientProfile.user_id == current_user.id)
        .first()
    )
    medications = (
        db.query(Medication)
        .filter(Medication.user_id == current_user.id, Medication.active == True)
        .all()
    )

    user_context_parts = []
    if profile:
        if profile.chronic_diseases:
            user_context_parts.append(
                f"Conditions: {', '.join(profile.chronic_diseases)}"
            )
        if profile.allergies:
            user_context_parts.append(f"Allergies: {', '.join(profile.allergies)}")
    if medications:
        user_context_parts.append(
            f"Medications: {', '.join(f'{m.name} ({m.dosage})' for m in medications)}"
        )

    user_context = "\n".join(user_context_parts) if user_context_parts else ""

    answer = rag_service.query_with_context(data.query, user_context)
    return {"answer": answer}


@router.post("/ingest")
def ingest_documents(
    data: IngestRequest,
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in (UserRole.ADMIN, UserRole.DOCTOR):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and doctors can ingest documents",
        )
    rag_service.add_documents(data.documents)
    return {"message": f"Ingested {len(data.documents)} documents", "status": rag_service.get_status()}


@router.post("/rebuild-index")
def rebuild_index(
    data: IngestRequest,
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in (UserRole.ADMIN, UserRole.DOCTOR):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and doctors can rebuild the index",
        )
    rag_service.rebuild_index(data.documents)
    return {"message": "Index rebuilt", "status": rag_service.get_status()}


@router.get("/status")
def get_status():
    return rag_service.get_status()
