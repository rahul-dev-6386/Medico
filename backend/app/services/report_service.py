import os
import uuid
from typing import Optional
from sqlalchemy.orm import Session
from fastapi import UploadFile
from datetime import datetime

from app.models.report import MedicalReport
from app.models.report_chunk import ReportChunk, LabValue
from app.models.biomarker import BiomarkerTracking, TimelineEvent, AIInsight
from app.ocr import ocr_manager
from app.core.config import settings
from app.services.classification_service import classification_service
from app.infrastructure.ai_provider_service import ai_provider
from app.infrastructure.embedding_service import embedding_service
from app.infrastructure.vector_store import vector_store
from app.services.health_score_engine import HealthScoreEngine
from app.services.risk_predictor import risk_predictor


class ReportService:
    def __init__(self, db: Session):
        self.db = db

    async def upload(self, user_id: int, file: UploadFile) -> MedicalReport:
        file_bytes = await file.read()
        file_ext = os.path.splitext(file.filename)[1]
        file_id = str(uuid.uuid4())
        file_name = f"{file_id}{file_ext}"

        upload_dir = settings.UPLOAD_DIR
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, file_name)

        with open(file_path, "wb") as f:
            f.write(file_bytes)

        report = MedicalReport(
            user_id=user_id,
            title=os.path.splitext(file.filename)[0],
            file_type=file.content_type or "application/octet-stream",
            file_path=file_path,
            original_filename=file.filename,
        )
        self.db.add(report)
        self.db.commit()
        self.db.refresh(report)

        ocr_result = ocr_manager.extract_structured(file_bytes, file.content_type or "")
        extracted = ocr_result.get("raw_text", "")
        if not extracted:
            self.db.commit()
            return report

        report.extracted_text = extracted

        classification_result = classification_service.classify(extracted, file.filename)
        report.document_type = classification_result.get("document_type", "General Medical Report")

        structured = classification_service.extract_structured(extracted, report.document_type)
        report.structured_data = structured

        health_score = structured.get("health_score")
        if health_score is not None:
            report.health_score = min(100, max(0, int(health_score)))

        risk_scores = structured.get("risk_scores", {})
        if risk_scores:
            report.risk_scores = risk_scores

        summary_prompt = (
            f"Document type: {report.document_type}\n"
            f"Structured data: {structured}\n\n"
            "Generate 2-3 concise sentences summarizing this medical document's key findings. "
            "Focus on actionable medical information only. No markdown."
        )
        report.ai_summary = ai_provider.generate_response(
            prompt=summary_prompt,
            system_instruction="You are a medical report summarizer. Be concise and clinical.",
        )

        report.processed = True
        self.db.commit()
        self.db.refresh(report)

        from app.services.report_intelligence_service import ReportIntelligenceService
        try:
            intelligence = ReportIntelligenceService(self.db)
            intelligence.process_report(report.id, user_id)
        except Exception:
            pass

        self._store_biomarkers(report.id, user_id, structured)
        self._store_timeline_events(report.id, user_id, structured, report.document_type)
        self._store_insights(report.id, user_id, structured)
        self._store_in_vector_store(report.id, user_id, extracted, structured)

        return report

    def _store_biomarkers(self, report_id: int, user_id: int, structured: dict):
        biomarkers = structured.get("biomarkers", [])
        lab_values = structured.get("lab_values", [])
        for item in biomarkers + lab_values:
            name = item.get("name") or item.get("test_name")
            if not name:
                continue
            raw_value = item.get("value")
            numeric_value = None
            if raw_value is not None:
                try:
                    numeric_value = float(raw_value)
                except (ValueError, TypeError):
                    numeric_value = None
            tracking = BiomarkerTracking(
                user_id=user_id,
                report_id=report_id,
                biomarker_name=name,
                value=numeric_value,
                value_text=str(raw_value or ""),
                unit=item.get("unit", ""),
                reference_range=item.get("reference_range", item.get("range", "")),
                is_abnormal=item.get("flag") not in (None, "", "normal", "NORMAL"),
                flag=item.get("flag"),
            )
            self.db.add(tracking)
        self.db.commit()

    def _store_timeline_events(self, report_id: int, user_id: int, structured: dict, doc_type: str):
        timeline_events = structured.get("timeline_events", [])
        for event in timeline_events:
            try:
                evt_date = datetime.fromisoformat(event["date"]) if event.get("date") else datetime.utcnow()
            except (ValueError, KeyError):
                evt_date = datetime.utcnow()
            te = TimelineEvent(
                user_id=user_id,
                report_id=report_id,
                event_type=event.get("type", doc_type.lower().replace(" ", "_")),
                title=event.get("event", f"{doc_type} Uploaded"),
                description=event.get("description", ""),
                severity=event.get("severity", "info"),
                event_date=evt_date,
            )
            self.db.add(te)

        diagnoses = structured.get("diagnosis", [])
        for d in diagnoses:
            if isinstance(d, str):
                te = TimelineEvent(
                    user_id=user_id,
                    report_id=report_id,
                    event_type="diagnosis",
                    title=d,
                    description=f"Diagnosed from {doc_type}",
                    severity="info",
                    event_date=datetime.utcnow(),
                )
                self.db.add(te)

        abnormal = structured.get("abnormal_values", [])
        for a in abnormal:
            te = TimelineEvent(
                user_id=user_id,
                report_id=report_id,
                event_type="abnormal_value",
                title=f"{a.get('test', 'Value')} is abnormal",
                description=f"{a.get('test')}: {a.get('value')} {a.get('unit')} — {a.get('severity', 'abnormal')}",
                severity=a.get("severity", "warning"),
                event_date=datetime.utcnow(),
            )
            self.db.add(te)

        if not timeline_events and not diagnoses and not abnormal:
            te = TimelineEvent(
                user_id=user_id,
                report_id=report_id,
                event_type="upload",
                title=f"{doc_type} Uploaded",
                description=f"Medical {doc_type.lower()} processed and analyzed",
                severity="info",
                event_date=datetime.utcnow(),
            )
            self.db.add(te)

        self.db.commit()

    def _store_insights(self, report_id: int, user_id: int, structured: dict):
        risk_scores = structured.get("risk_scores", {})
        for condition, score in risk_scores.items():
            if score is None:
                continue
            level = "good" if score < 30 else "attention" if score < 60 else "critical"
            label = condition.replace("_", " ").title()
            insight = AIInsight(
                user_id=user_id,
                report_id=report_id,
                insight_type="risk",
                title=f"{label} Risk: {int(score)}%",
                description=f"Your {label.lower()} risk score is {int(score)}%. {'Low risk.' if level == 'good' else 'Moderate risk — monitor closely.' if level == 'attention' else 'High risk — consult your doctor.'}",
                trend="stable",
                severity=level,
            )
            self.db.add(insight)

        abnormal = structured.get("abnormal_values", [])
        for a in abnormal:
            insight = AIInsight(
                user_id=user_id,
                report_id=report_id,
                insight_type="abnormal",
                title=f"{a.get('test')} is {a.get('severity', 'abnormal')}",
                description=f"{a.get('test')}: {a.get('value')} {a.get('unit')} — outside normal range.",
                trend="worsened",
                severity=a.get("severity", "warning"),
            )
            self.db.add(insight)

        follow_up = structured.get("follow_up_tests", [])
        for test in follow_up:
            insight = AIInsight(
                user_id=user_id,
                report_id=report_id,
                insight_type="follow_up",
                title=f"Follow-up: {test}",
                description=f"Recommended follow-up test based on report findings.",
                trend="stable",
                severity="info",
            )
            self.db.add(insight)

        self.db.commit()

    def _store_in_vector_store(self, report_id: int, user_id: int, text: str, structured: dict):
        try:
            summary_text = f"Report {report_id}: {structured.get('diagnosis', [])} | {structured.get('findings', [])} | Meds: {structured.get('medications', [])}"
            emb = embedding_service.embed(summary_text)
            vector_store.upsert(
                embedding_id=f"report_summary_{report_id}",
                embedding=emb,
                payload={
                    "type": "report_summary",
                    "report_id": report_id,
                    "user_id": user_id,
                    "document_type": structured.get("document_type", ""),
                    "diagnosis": structured.get("diagnosis", []),
                    "findings": structured.get("findings", []),
                },
            )
        except Exception:
            pass

    def get_user_reports(self, user_id: int) -> list[MedicalReport]:
        return (
            self.db.query(MedicalReport)
            .filter(MedicalReport.user_id == user_id)
            .order_by(MedicalReport.uploaded_at.desc())
            .all()
        )

    def get_report(self, report_id: int, user_id: int) -> Optional[MedicalReport]:
        return (
            self.db.query(MedicalReport)
            .filter(
                MedicalReport.id == report_id, MedicalReport.user_id == user_id
            )
            .first()
        )

    def delete_report(self, report_id: int, user_id: int) -> bool:
        report = self.get_report(report_id, user_id)
        if not report:
            return False
        if os.path.exists(report.file_path):
            os.remove(report.file_path)
        self.db.query(ReportChunk).filter(ReportChunk.report_id == report_id).delete()
        self.db.query(LabValue).filter(LabValue.report_id == report_id).delete()
        self.db.query(BiomarkerTracking).filter(BiomarkerTracking.report_id == report_id).delete()
        self.db.query(TimelineEvent).filter(TimelineEvent.report_id == report_id).delete()
        self.db.query(AIInsight).filter(AIInsight.report_id == report_id).delete()
        self.db.delete(report)
        self.db.commit()
        return True
