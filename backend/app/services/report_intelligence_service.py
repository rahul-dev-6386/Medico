import re
from typing import Optional, Any

from sqlalchemy.orm import Session

from app.models.report import MedicalReport
from app.models.report_chunk import ReportChunk, LabValue
from app.models.biomarker import BiomarkerTracking
from app.services.embedding_service import embedding_service
from app.services.vector_store import vector_store
from app.services.citation_engine import CitationEngine


LAB_PATTERNS = [
    (r"(hemoglobin|hgb)\s*:?\s*([0-9.]+)\s*(g/dL|g/L)?", "Hemoglobin", "g/dL"),
    (r"(wbc|white blood cell count)\s*:?\s*([0-9.]+)\s*(x?10[39]/[uµ]L|K/uL)?", "WBC", "x10³/µL"),
    (r"(platelet|plt)\s*:?\s*([0-9.]+)\s*(x?10[39]/[uµ]L|K/uL)?", "Platelets", "x10³/µL"),
    (r"(glucose|blood sugar|fbs|rbs)\s*:?\s*([0-9.]+)\s*(mg/dL|mmol/L)?", "Glucose", "mg/dL"),
    (r"(hbA1c|a1c|hemoglobin a1c|glycated hemoglobin)\s*:?\s*([0-9.]+)\s*(%|mmol/mol)?", "HbA1c", "%"),
    (r"(cholesterol|total cholesterol|tc)\s*:?\s*([0-9.]+)\s*(mg/dL|mmol/L)?", "Total Cholesterol", "mg/dL"),
    (r"(ldl|ldl-c|ldl cholesterol)\s*:?\s*([0-9.]+)\s*(mg/dL|mmol/L)?", "LDL", "mg/dL"),
    (r"(hdl|hdl-c|hdl cholesterol)\s*:?\s*([0-9.]+)\s*(mg/dL|mmol/L)?", "HDL", "mg/dL"),
    (r"(triglycerides?|tg)\s*:?\s*([0-9.]+)\s*(mg/dL|mmol/L)?", "Triglycerides", "mg/dL"),
    (r"(creatinine|serum creatinine)\s*:?\s*([0-9.]+)\s*(mg/dL|umol/L)?", "Creatinine", "mg/dL"),
    (r"(bun|blood urea nitrogen)\s*:?\s*([0-9.]+)\s*(mg/dL|mmol/L)?", "BUN", "mg/dL"),
    (r"(gfr|eGFR|estimated GFR)\s*:?\s*([0-9.]+)\s*(mL/min/1.73m2)?", "eGFR", "mL/min/1.73m²"),
    (r"(sodium|na)\s*:?\s*([0-9.]+)\s*(mEq/L|mmol/L)?", "Sodium", "mEq/L"),
    (r"(potassium|k)\s*:?\s*([0-9.]+)\s*(mEq/L|mmol/L)?", "Potassium", "mEq/L"),
    (r"(calcium|ca)\s*:?\s*([0-9.]+)\s*(mg/dL|mmol/L)?", "Calcium", "mg/dL"),
    (r"(bilirubin|total bilirubin)\s*:?\s*([0-9.]+)\s*(mg/dL|umol/L)?", "Bilirubin", "mg/dL"),
    (r"(alt|sgpt|alanine aminotransferase)\s*:?\s*([0-9.]+)\s*(U/L|IU/L)?", "ALT", "U/L"),
    (r"(ast|sgot|aspartate aminotransferase)\s*:?\s*([0-9.]+)\s*(U/L|IU/L)?", "AST", "U/L"),
    (r"(alkaline phosphatase|alp|alk phos)\s*:?\s*([0-9.]+)\s*(U/L|IU/L)?", "ALP", "U/L"),
    (r"(tsh|thyroid stimulating hormone)\s*:?\s*([0-9.]+)\s*(uIU/mL|mIU/L)?", "TSH", "mIU/L"),
    (r"(vitamin d|25-hydroxy vitamin d|25-oh vit d)\s*:?\s*([0-9.]+)\s*(ng/mL|nmol/L)?", "Vitamin D", "ng/mL"),
    (r"(ferritin)\s*:?\s*([0-9.]+)\s*(ng/mL|ug/L)?", "Ferritin", "ng/mL"),
    (r"(b12|vitamin b12|cobalamin)\s*:?\s*([0-9.]+)\s*(pg/mL|pmol/L)?", "Vitamin B12", "pg/mL"),
]

ABNORMAL_FLAGS = {
    "Hemoglobin": (12.0, 17.5),
    "WBC": (4.0, 11.0),
    "Platelets": (150, 450),
    "Glucose": (70, 100),
    "HbA1c": (4.0, 5.7),
    "Total Cholesterol": (125, 200),
    "LDL": (0, 100),
    "HDL": (40, 60),
    "Triglycerides": (0, 150),
    "Creatinine": (0.6, 1.2),
    "BUN": (7, 20),
    "eGFR": (60, 120),
    "Sodium": (135, 145),
    "Potassium": (3.5, 5.1),
    "Calcium": (8.5, 10.5),
    "Bilirubin": (0.1, 1.2),
    "ALT": (7, 56),
    "AST": (10, 40),
    "ALP": (44, 147),
    "TSH": (0.4, 4.0),
    "Vitamin D": (30, 100),
    "Ferritin": (20, 250),
    "Vitamin B12": (200, 900),
}


class ReportIntelligenceService:
    def __init__(self, db: Session):
        self.db = db

    def process_report(self, report_id: int, user_id: int):
        report = (
            self.db.query(MedicalReport)
            .filter(MedicalReport.id == report_id, MedicalReport.user_id == user_id)
            .first()
        )
        if not report or not report.extracted_text:
            return

        try:
            self._chunk_and_embed(report, user_id)
        except Exception:
            pass
        self._extract_lab_values(report, user_id)

    def _chunk_and_embed(self, report: MedicalReport, user_id: int):
        self.db.query(ReportChunk).filter(ReportChunk.report_id == report.id).delete()
        text = report.extracted_text
        words = text.split()
        chunk_size = 300
        overlap = 50
        max_chunks = 50
        chunk_count = 0

        for i in range(0, len(words), chunk_size - overlap):
            if chunk_count >= max_chunks:
                break
            chunk_text = " ".join(words[i:i + chunk_size])
            if not chunk_text.strip():
                continue

            embedding_data = embedding_service.embed_document(chunk_text)
            embedding_id = f"report_{report.id}_{chunk_count}"

            chunk = ReportChunk(
                report_id=report.id,
                user_id=user_id,
                chunk_index=chunk_count,
                content=chunk_text,
                embedding_id=embedding_id,
            )
            self.db.add(chunk)
            self.db.flush()

            vector_store.upsert(
                embedding_id=embedding_id,
                embedding=embedding_data["embedding"],
                payload={
                    "type": "report",
                    "report_id": report.id,
                    "user_id": user_id,
                    "chunk_index": chunk_count,
                },
            )
            chunk_count += 1
        self.db.commit()

    def _extract_lab_values(self, report: MedicalReport, user_id: int):
        self.db.query(LabValue).filter(LabValue.report_id == report.id).delete()
        text = report.extracted_text

        for pattern, test_name, default_unit in LAB_PATTERNS:
            for match in re.finditer(pattern, text, re.IGNORECASE):
                value_str = match.group(2)
                unit = match.group(3) if match.lastindex and match.group(3) else default_unit
                try:
                    value = float(value_str)
                except ValueError:
                    continue

                flag = None
                ref_range = None
                if test_name in ABNORMAL_FLAGS:
                    low, high = ABNORMAL_FLAGS[test_name]
                    ref_range = f"{low}-{high} {unit}"
                    if value < low:
                        flag = "LOW"
                    elif value > high:
                        flag = "HIGH"
                    else:
                        flag = "NORMAL"

                lab = LabValue(
                    report_id=report.id,
                    user_id=user_id,
                    test_name=test_name,
                    value=value,
                    value_text=str(value),
                    unit=unit,
                    reference_range=ref_range,
                    is_abnormal=flag not in (None, "NORMAL"),
                    flag=flag,
                )
                self.db.add(lab)
        self.db.commit()

    def _get_biomarker_tracking(self, report_id: int, user_id: int) -> list[dict]:
        items = (
            self.db.query(BiomarkerTracking)
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
        return []

    def get_lab_values(self, report_id: int, user_id: int) -> list[dict]:
        results = self._get_biomarker_tracking(report_id, user_id)
        if results:
            return results

        labs = (
            self.db.query(LabValue)
            .filter(LabValue.report_id == report_id, LabValue.user_id == user_id)
            .all()
        )
        return [
            {
                "id": l.id,
                "test_name": l.test_name,
                "value": l.value,
                "value_text": l.value_text,
                "unit": l.unit,
                "reference_range": l.reference_range,
                "is_abnormal": l.is_abnormal,
                "flag": l.flag,
            }
            for l in labs
        ]

    def get_findings(self, report_id: int, user_id: int) -> list[dict]:
        labs = self.get_lab_values(report_id, user_id)
        findings = []
        for lab in labs:
            if lab["is_abnormal"]:
                findings.append({
                    "type": "abnormal_lab",
                    "test": lab["test_name"],
                    "value": lab["value_text"],
                    "unit": lab["unit"],
                    "flag": lab["flag"],
                    "reference_range": lab["reference_range"],
                    "severity": "high" if lab["flag"] == "HIGH" else "low",
                })
        return findings

    def get_risk_score(self, report_id: int, user_id: int) -> dict:
        labs = self.get_lab_values(report_id, user_id)
        score = 100
        reasons = []
        for lab in labs:
            if lab["is_abnormal"]:
                severity_penalty = 10 if lab["flag"] == "HIGH" else 5
                score -= severity_penalty
                reasons.append({
                    "test": lab["test_name"],
                    "flag": lab["flag"],
                    "penalty": severity_penalty,
                    "message": f"{lab['test_name']} is {lab['flag'].lower()} ({lab['value_text']} {lab['unit']}, ref: {lab['reference_range']})",
                })

        risk_level = "low"
        if score < 60:
            risk_level = "high"
        elif score < 80:
            risk_level = "moderate"

        return {
            "score": max(0, score),
            "risk_level": risk_level,
            "abnormal_count": len([l for l in labs if l["is_abnormal"]]),
            "total_labs": len(labs),
            "reasons": reasons,
        }

    def get_history(self, report_id: int, user_id: int) -> dict:
        report = (
            self.db.query(MedicalReport)
            .filter(MedicalReport.id == report_id, MedicalReport.user_id == user_id)
            .first()
        )
        if not report:
            return {}

        all_reports = (
            self.db.query(MedicalReport)
            .filter(MedicalReport.user_id == user_id)
            .order_by(MedicalReport.uploaded_at.desc())
            .all()
        )

        timeline = []
        for r in all_reports:
            timeline.append({
                "id": r.id,
                "title": r.title or r.original_filename,
                "date": r.uploaded_at.isoformat() if r.uploaded_at else None,
            })

        return {
            "current_report": {
                "id": report.id,
                "title": report.title or report.original_filename,
                "uploaded_at": report.uploaded_at.isoformat() if report.uploaded_at else None,
            },
            "total_reports": len(all_reports),
            "timeline": timeline,
        }

    def get_insights(self, report_id: int, user_id: int) -> list[dict]:
        labs = self.get_lab_values(report_id, user_id)
        insights = []
        abnormal = [l for l in labs if l["is_abnormal"]]

        if not abnormal:
            insights.append({
                "type": "normal",
                "title": "All values within normal range",
                "description": "No abnormal lab values detected in this report.",
            })
            return insights

        for lab in abnormal:
            insight = {
                "type": "abnormal",
                "title": f"{lab['test_name']} is {lab['flag'].lower()}",
                "description": f"Your {lab['test_name']} level is {lab['value_text']} {lab['unit']} ({lab['flag'].lower()}). "
                              f"Normal range: {lab['reference_range']}.",
                "recommendation": self._get_recommendation(lab["test_name"], lab["flag"]),
            }
            insights.append(insight)

        return insights

    def get_biomarkers(self, report_id: int, user_id: int) -> list[dict]:
        labs = self.get_lab_values(report_id, user_id)
        biomarkers = []
        for lab in labs:
            biomarkers.append({
                "name": lab["test_name"],
                "value": lab["value"],
                "value_text": lab["value_text"],
                "unit": lab["unit"],
                "reference_range": lab["reference_range"],
                "flag": lab["flag"],
                "is_abnormal": lab["is_abnormal"],
            })
        return biomarkers

    def _get_recommendation(self, test_name: str, flag: str) -> str:
        recommendations = {
            "Hemoglobin": {
                "LOW": "Consider iron-rich foods (spinach, red meat, legumes). Consult your doctor about possible anemia.",
                "HIGH": "Elevated hemoglobin may require further evaluation. Consult your doctor.",
            },
            "HbA1c": {
                "HIGH": "This suggests elevated blood sugar levels. Consult your doctor about diabetes management.",
            },
            "Glucose": {
                "HIGH": "Elevated blood sugar. Monitor your carbohydrate intake and consult your doctor.",
                "LOW": "Low blood sugar. Eat a small snack and monitor symptoms. Consult your doctor if persistent.",
            },
            "LDL": {
                "HIGH": "Consider dietary changes: reduce saturated fats, increase fiber. Consult your doctor about cholesterol management.",
            },
            "HDL": {
                "LOW": "Increase aerobic exercise and consume healthy fats (avocado, nuts, olive oil).",
            },
            "Triglycerides": {
                "HIGH": "Reduce sugar and refined carbs, increase omega-3 intake. Consult your doctor.",
            },
            "Creatinine": {
                "HIGH": "May indicate kidney stress. Stay hydrated and consult your doctor.",
            },
            "eGFR": {
                "LOW": "May indicate reduced kidney function. Consult your doctor for further evaluation.",
            },
        }

        recs = recommendations.get(test_name, {})
        return recs.get(flag, "Consult your doctor for interpretation of this result.")
