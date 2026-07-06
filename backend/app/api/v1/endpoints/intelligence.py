from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.user import User
from app.models.report import MedicalReport
from app.models.biomarker import BiomarkerTracking, TimelineEvent, AIInsight
from app.models.report_chunk import LabValue
from app.services.report_intelligence_service import ReportIntelligenceService
from app.services.health_score_engine import HealthScoreEngine
from app.services.risk_predictor import risk_predictor
from app.services.query_router import QueryRouter
from app.infrastructure.vector_store import vector_store

router = APIRouter(prefix="/api/intelligence", tags=["Medical Intelligence"])


def _get_report_or_404(report_id: int, user_id: int, db: Session):
    report = db.query(MedicalReport).filter(
        MedicalReport.id == report_id,
        MedicalReport.user_id == user_id,
    ).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    return report


@router.get("/reports/{report_id}/summary")
def get_report_summary(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    report = _get_report_or_404(report_id, current_user.id, db)
    return {
        "document_type": report.document_type or "Unknown",
        "title": report.title or report.original_filename,
        "uploaded_at": report.uploaded_at.isoformat() if report.uploaded_at else None,
        "ai_summary": report.ai_summary,
        "health_score": report.health_score,
        "risk_scores": report.risk_scores,
        "structured_data": report.structured_data,
        "processed": report.processed,
    }


@router.get("/reports/{report_id}/lab-values")
def get_lab_values(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_report_or_404(report_id, current_user.id, db)
    labs = _get_biomarkers_for_report(report_id, current_user.id, db)
    return {"lab_values": labs}


def _get_biomarkers_for_report(report_id: int, user_id: int, db: Session) -> list[dict]:
    items = (
        db.query(BiomarkerTracking)
        .filter(BiomarkerTracking.report_id == report_id, BiomarkerTracking.user_id == user_id)
        .all()
    )
    if items:
        return [
            {
                "test_name": b.biomarker_name,
                "value": b.value,
                "value_text": b.value_text,
                "unit": b.unit,
                "reference_range": b.reference_range,
                "is_abnormal": b.is_abnormal,
                "flag": b.flag,
            }
            for b in items
        ]
    service = ReportIntelligenceService(db)
    return service.get_lab_values(report_id, user_id)


@router.get("/reports/{report_id}/risk-scores")
def get_risk_scores(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    report = _get_report_or_404(report_id, current_user.id, db)
    from app.services.report_intelligence_service import ReportIntelligenceService
    service = ReportIntelligenceService(db)
    report_risk = service.get_risk_score(report_id, current_user.id)
    ml_predictions = risk_predictor.predict_all(current_user.id, db)
    return {
        "report_risk_score": report_risk,
        "ml_predictions": ml_predictions,
        "structured_risk_scores": report.risk_scores or {},
    }


@router.get("/reports/{report_id}/biomarkers")
def get_biomarkers(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_report_or_404(report_id, current_user.id, db)
    labs = _get_biomarkers_for_report(report_id, current_user.id, db)
    return {
        "biomarkers": [
            {
                "name": l.get("test_name"),
                "value": l.get("value"),
                "value_text": l.get("value_text"),
                "unit": l.get("unit"),
                "reference_range": l.get("reference_range"),
                "flag": l.get("flag"),
                "is_abnormal": l.get("is_abnormal"),
            }
            for l in labs
        ]
    }


@router.get("/reports/{report_id}/biomarker-history")
def get_biomarker_history(
    report_id: int,
    biomarker: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_report_or_404(report_id, current_user.id, db)
    query = db.query(BiomarkerTracking).filter(
        BiomarkerTracking.user_id == current_user.id,
    )
    if biomarker:
        query = query.filter(BiomarkerTracking.biomarker_name.ilike(f"%{biomarker}%"))
    results = query.order_by(BiomarkerTracking.recorded_at.desc()).all()

    history = {}
    for r in results:
        if r.biomarker_name not in history:
            history[r.biomarker_name] = {
                "name": r.biomarker_name,
                "unit": r.unit,
                "points": [],
            }
        history[r.biomarker_name]["points"].append({
            "date": r.recorded_at.isoformat() if r.recorded_at else None,
            "value": r.value,
            "report_id": r.report_id,
        })
    return {"biomarker_history": list(history.values())}


@router.get("/reports/{report_id}/insights")
def get_insights(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_report_or_404(report_id, current_user.id, db)
    insights = (
        db.query(AIInsight)
        .filter(AIInsight.user_id == current_user.id, AIInsight.report_id == report_id)
        .order_by(AIInsight.created_at.desc())
        .all()
    )
    return {
        "insights": [
            {
                "type": i.insight_type,
                "title": i.title,
                "description": i.description,
                "trend": i.trend,
                "severity": i.severity,
                "created_at": i.created_at.isoformat() if i.created_at else None,
            }
            for i in insights
        ]
    }


@router.get("/reports/{report_id}/timeline")
def get_timeline(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_report_or_404(report_id, current_user.id, db)
    events = (
        db.query(TimelineEvent)
        .filter(
            TimelineEvent.user_id == current_user.id,
            TimelineEvent.report_id == report_id,
        )
        .order_by(TimelineEvent.event_date.desc())
        .all()
    )
    return {
        "timeline": [
            {
                "type": e.event_type,
                "title": e.title,
                "description": e.description,
                "severity": e.severity,
                "date": e.event_date.isoformat() if e.event_date else None,
            }
            for e in events
        ]
    }


@router.get("/reports/{report_id}/findings")
def get_findings(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    report = _get_report_or_404(report_id, current_user.id, db)
    structured = report.structured_data or {}
    labs = _get_biomarkers_for_report(report_id, current_user.id, db)
    abnormal_labs = [l for l in labs if l.get("is_abnormal")]
    findings_list = structured.get("findings", [])
    diagnosis_list = structured.get("diagnosis", [])
    recommendations = structured.get("recommendations", [])

    return {
        "findings": [
            {"section": "Diagnosis", "items": diagnosis_list if isinstance(diagnosis_list, list) else [diagnosis_list]},
            {"section": "Abnormal Findings", "items": [f"{l.get('test_name')}: {l.get('value_text')} {l.get('unit')} ({l.get('flag')})" for l in abnormal_labs]},
            {"section": "Clinical Findings", "items": findings_list if isinstance(findings_list, list) else []},
            {"section": "Recommendations", "items": recommendations if isinstance(recommendations, list) else []},
        ]
    }


@router.get("/reports/{report_id}/history")
def get_report_history(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    report = _get_report_or_404(report_id, current_user.id, db)
    all_reports = (
        db.query(MedicalReport)
        .filter(MedicalReport.user_id == current_user.id)
        .order_by(MedicalReport.uploaded_at.desc())
        .all()
    )
    return {
        "current_report": {
            "id": report.id,
            "title": report.title or report.original_filename,
            "document_type": report.document_type,
            "uploaded_at": report.uploaded_at.isoformat() if report.uploaded_at else None,
        },
        "total_reports": len(all_reports),
        "timeline": [
            {
                "id": r.id,
                "title": r.title or r.original_filename,
                "document_type": r.document_type,
                "date": r.uploaded_at.isoformat() if r.uploaded_at else None,
            }
            for r in all_reports
        ],
    }


@router.get("/patients/{user_id}/history")
def get_patient_history(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.id != user_id and current_user.role.value not in ("admin", "doctor"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    reports = (
        db.query(MedicalReport)
        .filter(MedicalReport.user_id == user_id)
        .order_by(MedicalReport.uploaded_at.desc())
        .all()
    )
    timeline = (
        db.query(TimelineEvent)
        .filter(TimelineEvent.user_id == user_id)
        .order_by(TimelineEvent.event_date.desc())
        .limit(50)
        .all()
    )
    insights = (
        db.query(AIInsight)
        .filter(AIInsight.user_id == user_id)
        .order_by(AIInsight.created_at.desc())
        .limit(20)
        .all()
    )
    return {
        "reports": [
            {
                "id": r.id,
                "title": r.title or r.original_filename,
                "document_type": r.document_type,
                "health_score": r.health_score,
                "uploaded_at": r.uploaded_at.isoformat() if r.uploaded_at else None,
            }
            for r in reports
        ],
        "timeline": [
            {
                "type": e.event_type,
                "title": e.title,
                "description": e.description,
                "severity": e.severity,
                "date": e.event_date.isoformat() if e.event_date else None,
            }
            for e in timeline
        ],
        "insights": [
            {
                "type": i.insight_type,
                "title": i.title,
                "description": i.description,
                "severity": i.severity,
            }
            for i in insights
        ],
    }


@router.get("/patients/{user_id}/comparison")
def get_patient_comparison(
    user_id: int,
    biomarker: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.id != user_id and current_user.role.value not in ("admin", "doctor"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    query = (
        db.query(BiomarkerTracking)
        .filter(BiomarkerTracking.user_id == user_id)
    )
    if biomarker:
        query = query.filter(BiomarkerTracking.biomarker_name.ilike(f"%{biomarker}%"))
    trackings = query.order_by(BiomarkerTracking.recorded_at.desc()).all()

    by_name = {}
    for t in trackings:
        if t.biomarker_name not in by_name:
            by_name[t.biomarker_name] = []
        by_name[t.biomarker_name].append(t)

    comparisons = []
    for name, entries in by_name.items():
        if len(entries) < 2:
            continue
        sorted_entries = sorted(entries, key=lambda x: x.recorded_at or x.id)
        latest = sorted_entries[-1]
        previous = sorted_entries[-2]
        diff = None
        status = "stable"
        if latest.value is not None and previous.value is not None:
            diff = round(latest.value - previous.value, 2)
            if abs(diff) < 0.01 * abs(previous.value):
                status = "stable"
            elif diff > 0:
                status = "worsened" if latest.is_abnormal else "improved"
            else:
                status = "improved" if not latest.is_abnormal else "worsened"

        comparisons.append({
            "biomarker": name,
            "previous": previous.value_text or str(previous.value),
            "current": latest.value_text or str(latest.value),
            "unit": latest.unit,
            "status": status,
            "change": f"{'+' if diff and diff > 0 else ''}{diff}" if diff is not None else "N/A",
            "unit": latest.unit or "",
        })

    return {"comparisons": comparisons}


@router.get("/reports/{report_id}/risk-score")
def get_risk_score(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    report = _get_report_or_404(report_id, current_user.id, db)
    from app.services.report_intelligence_service import ReportIntelligenceService
    service = ReportIntelligenceService(db)
    return service.get_risk_score(report_id, current_user.id)


@router.get("/reports/{report_id}/comparison")
def get_report_comparison(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_report_or_404(report_id, current_user.id, db)
    query = db.query(BiomarkerTracking).filter(
        BiomarkerTracking.user_id == current_user.id,
    )
    trackings = query.order_by(BiomarkerTracking.recorded_at.desc()).all()

    by_name = {}
    for t in trackings:
        if t.biomarker_name not in by_name:
            by_name[t.biomarker_name] = []
        by_name[t.biomarker_name].append(t)

    comparisons = []
    for name, entries in by_name.items():
        if len(entries) < 2:
            continue
        sorted_entries = sorted(entries, key=lambda x: x.recorded_at or x.id)
        latest = sorted_entries[-1]
        previous = sorted_entries[-2]
        diff = None
        status = "stable"
        if latest.value is not None and previous.value is not None:
            diff = round(latest.value - previous.value, 2)
            if abs(diff) < 0.01 * abs(previous.value):
                status = "stable"
            elif latest.is_abnormal and not previous.is_abnormal:
                status = "worsened"
            elif not latest.is_abnormal and previous.is_abnormal:
                status = "improved"
            elif diff > 0:
                status = "worsened"
            else:
                status = "improved"

        comparisons.append({
            "biomarker": name,
            "previous": previous.value_text or str(previous.value),
            "current": latest.value_text or str(latest.value),
            "unit": latest.unit or "",
            "status": status,
            "change": f"{'+' if diff and diff > 0 else ''}{diff}" if diff is not None else "N/A",
        })

    return {"comparisons": comparisons}


@router.get("/health-score")
def get_health_score(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    engine = HealthScoreEngine(db)
    return engine.calculate(current_user.id)


@router.get("/risk-predictions")
def get_risk_predictions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    predictions = risk_predictor.predict_all(current_user.id, db)
    if not predictions:
        return {"predictions": [], "message": "No risk predictions available. Train models first via setup script."}
    return {"predictions": predictions}


@router.post("/query")
def intelligent_query(
    query: str,
    use_reranker: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    router = QueryRouter(db)
    return router.route(query, current_user.id, use_reranker=use_reranker)


@router.get("/vector-store-status")
def get_vector_store_status():
    return vector_store.get_status()
