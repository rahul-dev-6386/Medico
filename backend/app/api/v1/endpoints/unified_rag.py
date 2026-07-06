from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.user import User
from app.models.medication import Medication
from app.services.context_fusion_service import ContextFusionService
from app.services.user_retriever import UserRetriever
from app.infrastructure.ai_provider_service import ai_provider

router = APIRouter(prefix="/api", tags=["Unified RAG"])


class RAGQueryRequest(BaseModel):
    query: str
    top_k_textbooks: int = 8
    top_k_user: int = 5


class RAGQueryResponse(BaseModel):
    query: str
    contexts: list[dict]
    prioritization: list[str]
    source_counts: dict[str, int]
    textbooks_used: list[str]


@router.post("/rag/query", response_model=RAGQueryResponse)
def rag_query(
    request: RAGQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    fusion = ContextFusionService(db)
    result = fusion.retrieve(
        query=request.query,
        user_id=current_user.id,
        top_k_textbooks=request.top_k_textbooks,
        top_k_user=request.top_k_user,
    )
    return RAGQueryResponse(
        query=request.query,
        contexts=result.contexts,
        prioritization=result.prioritization,
        source_counts=result.source_counts,
        textbooks_used=list(result.textbooks_used),
    )


class ReportQueryRequest(BaseModel):
    query: str
    top_k: int = 10
    report_type: Optional[str] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None


class ReportQueryResponse(BaseModel):
    query: str
    results: list[dict]


@router.post("/reports/query", response_model=ReportQueryResponse)
def reports_query(
    request: ReportQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    retriever = UserRetriever(db)
    date_from = datetime.fromisoformat(request.date_from) if request.date_from else None
    date_to = datetime.fromisoformat(request.date_to) if request.date_to else None
    results = retriever.search(
        query=request.query,
        user_id=current_user.id,
        top_k=request.top_k,
        report_type=request.report_type,
        date_from=date_from,
        date_to=date_to,
    )
    return ReportQueryResponse(query=request.query, results=results)


class CompareRequest(BaseModel):
    biomarker_names: list[str]


@router.post("/reports/compare")
def reports_compare(
    request: CompareRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Compare specific biomarkers across all user reports.
    Returns semantically relevant chunks, then LLM synthesizes.
    """
    retriever = UserRetriever(db)
    query_str = " ".join(request.biomarker_names)

    # Get relevant user chunks for each biomarker
    results = retriever.search(
        query=query_str,
        user_id=current_user.id,
        top_k=20,
    )

    if not results:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No matching report data found")

    context = "\n\n".join(
        f"Report #{r['report_id']} ({r.get('report_date', 'unknown date')}):\n{r['content'][:500]}"
        for r in results[:10]
    )

    prompt = (
        f"Biomarkers to compare: {', '.join(request.biomarker_names)}\n\n"
        f"User's medical report data:\n{context}\n\n"
        "Analyze the trend of these biomarkers across reports. "
        "Highlight any significant changes, abnormal values, or patterns. "
        "Be concise and clinical."
    )

    response = ai_provider.generate_response(
        prompt=prompt,
        system_instruction="You are a medical data analyst. Compare biomarker values across reports and identify trends.",
        temperature=0.3,
    )

    return {"query": query_str, "response": response, "sources": results[:5]}


class TimelineQueryRequest(BaseModel):
    query: str
    date_from: str
    date_to: str
    report_type: Optional[str] = None
    top_k: int = 15


@router.post("/timeline/query")
def timeline_query(
    request: TimelineQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Longitudinal timeline query — search user_report_chunks filtered by date_range + report_type.
    """
    retriever = UserRetriever(db)
    date_from = datetime.fromisoformat(request.date_from)
    date_to = datetime.fromisoformat(request.date_to)

    results = retriever.search(
        query=request.query,
        user_id=current_user.id,
        top_k=request.top_k,
        report_type=request.report_type,
        date_from=date_from,
        date_to=date_to,
    )

    if not results:
        return {"query": request.query, "response": "No data found in the specified time range.", "sources": []}

    context = "\n\n".join(
        f"[{r.get('report_date', 'unknown')}] Report #{r['report_id']} ({r.get('report_type', 'N/A')}):\n{r['content'][:500]}"
        for r in results[:10]
    )

    prompt = (
        f"Question: {request.query}\n\n"
        f"Patient timeline data ({request.date_from} to {request.date_to}):\n{context}\n\n"
        "Synthesize this longitudinal data into a clear timeline summary. "
        "Highlight trends, changes, and notable events."
    )

    response = ai_provider.generate_response(
        prompt=prompt,
        system_instruction="You are a medical timeline analyst. Summarize patient health trends over time.",
        temperature=0.3,
    )

    return {"query": request.query, "response": response, "sources": results[:5]}


class MedicationsQueryRequest(BaseModel):
    query: str


@router.post("/medications/query")
def medications_query(
    request: MedicationsQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Medication memory — queries medications table with LLM interpretation.
    """
    medications = (
        db.query(Medication)
        .filter(Medication.user_id == current_user.id, Medication.active == True)
        .all()
    )

    if not medications:
        return {"query": request.query, "response": "No active medications found.", "medications": []}

    meds_summary = "\n".join(
        f"- {m.name} ({m.dosage}, {m.frequency}) — started {m.start_date}, "
        f"reason: {m.reason or 'N/A'}, side effects: {m.side_effects or 'none reported'}"
        for m in medications
    )

    prompt = (
        f"Question: {request.query}\n\n"
        f"Patient's current medications:\n{meds_summary}\n\n"
        "Answer the question based on the patient's medication list. "
        "Be specific about dosages, frequencies, and any interactions or concerns."
    )

    response = ai_provider.generate_response(
        prompt=prompt,
        system_instruction="You are a clinical pharmacist. Answer medication questions based on the patient's active prescriptions.",
        temperature=0.3,
    )

    meds_list = [
        {
            "name": m.name,
            "dosage": m.dosage,
            "frequency": m.frequency,
            "reason": m.reason,
            "side_effects": m.side_effects,
        }
        for m in medications
    ]

    return {"query": request.query, "response": response, "medications": meds_list}
