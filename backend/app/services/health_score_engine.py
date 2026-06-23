from datetime import date, timedelta
from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.metrics import DailyMetric
from app.models.medication import Medication, MedicationAdherence
from app.models.report import MedicalReport
from app.models.report_chunk import LabValue
from app.models.profile import PatientProfile


class HealthScoreEngine:
    def __init__(self, db: Session):
        self.db = db

    def calculate(self, user_id: int) -> dict:
        components = {}
        total_score = 0.0
        total_weight = 0.0

        metrics_score, metrics_weight = self._score_metrics(user_id)
        if metrics_weight > 0:
            components["metrics"] = {
                "score": metrics_score,
                "weight": metrics_weight,
                "max_score": 100,
            }
            total_score += metrics_score * metrics_weight
            total_weight += metrics_weight

        labs_score, labs_weight = self._score_labs(user_id)
        if labs_weight > 0:
            components["lab_results"] = {
                "score": labs_score,
                "weight": labs_weight,
                "max_score": 100,
            }
            total_score += labs_score * labs_weight
            total_weight += labs_weight

        medication_score, medication_weight = self._score_medications(user_id)
        if medication_weight > 0:
            components["medication_adherence"] = {
                "score": medication_score,
                "weight": medication_weight,
                "max_score": 100,
            }
            total_score += medication_score * medication_weight
            total_weight += medication_weight

        conditions_score, conditions_weight = self._score_conditions(user_id)
        if conditions_weight > 0:
            components["conditions_management"] = {
                "score": conditions_score,
                "weight": conditions_weight,
                "max_score": 100,
            }
            total_score += conditions_score * conditions_weight
            total_weight += conditions_weight

        overall = round(total_score / total_weight, 1) if total_weight > 0 else 50.0
        risk_factors = self._identify_risk_factors(user_id, components)

        level = "excellent" if overall >= 90 else "good" if overall >= 75 else "fair" if overall >= 60 else "poor"

        return {
            "overall_score": overall,
            "level": level,
            "components": components,
            "risk_factors": risk_factors,
        }

    def _score_metrics(self, user_id: int) -> tuple[float, float]:
        start = date.today() - timedelta(days=30)
        metrics = (
            self.db.query(DailyMetric)
            .filter(DailyMetric.user_id == user_id, DailyMetric.date >= start)
            .all()
        )
        if not metrics:
            return 0.0, 0.0

        scores = []
        for m in metrics:
            day_score = 0.0
            day_count = 0

            if m.sleep_hours is not None:
                if 7 <= m.sleep_hours <= 9:
                    day_score += 100
                elif 6 <= m.sleep_hours <= 10:
                    day_score += 60
                else:
                    day_score += 30
                day_count += 1

            if m.water_ml is not None:
                if m.water_ml >= 2000:
                    day_score += 100
                elif m.water_ml >= 1500:
                    day_score += 60
                else:
                    day_score += 30
                day_count += 1

            if m.exercise_min is not None:
                if m.exercise_min >= 30:
                    day_score += 100
                elif m.exercise_min >= 15:
                    day_score += 60
                else:
                    day_score += 30
                day_count += 1

            if m.weight_kg is not None and m.weight_kg > 0:
                day_count += 1

            if m.blood_pressure_sys is not None and m.blood_pressure_dia is not None:
                if m.blood_pressure_sys < 120 and m.blood_pressure_dia < 80:
                    day_score += 100
                elif m.blood_pressure_sys < 130 and m.blood_pressure_dia < 85:
                    day_score += 70
                else:
                    day_score += 40
                day_count += 1

            if m.blood_sugar is not None:
                if 70 <= m.blood_sugar <= 100:
                    day_score += 100
                elif 100 < m.blood_sugar <= 126:
                    day_score += 60
                else:
                    day_score += 30
                day_count += 1

            if m.heart_rate is not None:
                if 60 <= m.heart_rate <= 100:
                    day_score += 100
                else:
                    day_score += 50
                day_count += 1

            if day_count > 0:
                scores.append(day_score / day_count)

        if not scores:
            return 0.0, 0.0

        avg = sum(scores) / len(scores)
        weight = min(len(metrics) / 14, 1.0) * 0.35
        return avg, weight

    def _score_labs(self, user_id: int) -> tuple[float, float]:
        latest_report = (
            self.db.query(MedicalReport)
            .filter(MedicalReport.user_id == user_id, MedicalReport.processed == True)
            .order_by(MedicalReport.uploaded_at.desc())
            .first()
        )
        if not latest_report:
            return 0.0, 0.0

        labs = (
            self.db.query(LabValue)
            .filter(LabValue.report_id == latest_report.id)
            .all()
        )
        if not labs:
            return 0.0, 0.0

        normal = sum(1 for l in labs if not l.is_abnormal)
        total = len(labs)
        score = (normal / total) * 100 if total > 0 else 0
        weight = 0.25
        return score, weight

    def _score_medications(self, user_id: int) -> tuple[float, float]:
        medications = (
            self.db.query(Medication)
            .filter(Medication.user_id == user_id, Medication.active == True)
            .all()
        )
        if not medications:
            return 100.0, 0.0

        total_adherence = 0
        total_scheduled = 0
        for med in medications:
            adherence = (
                self.db.query(MedicationAdherence)
                .filter(MedicationAdherence.medication_id == med.id)
                .count()
            )
            taken = (
                self.db.query(MedicationAdherence)
                .filter(
                    MedicationAdherence.medication_id == med.id,
                    MedicationAdherence.taken == True,
                )
                .count()
            )
            total_adherence += taken
            total_scheduled += adherence

        if total_scheduled == 0:
            return 100.0, 0.05

        score = (total_adherence / total_scheduled) * 100
        weight = 0.15
        return score, weight

    def _score_conditions(self, user_id: int) -> tuple[float, float]:
        profile = (
            self.db.query(PatientProfile)
            .filter(PatientProfile.user_id == user_id)
            .first()
        )
        if not profile or not profile.chronic_diseases:
            return 100.0, 0.0

        num_conditions = len(profile.chronic_diseases)
        base_score = 100 - (num_conditions * 10)
        score = max(base_score, 50)
        weight = 0.25
        return score, weight

    def _identify_risk_factors(self, user_id: int, components: dict) -> list[dict]:
        risk_factors = []

        if "metrics" in components and components["metrics"]["score"] < 60:
            risk_factors.append({
                "factor": "poor_health_metrics",
                "severity": "high" if components["metrics"]["score"] < 40 else "moderate",
                "message": "Health metrics (sleep, hydration, exercise) are below recommended levels.",
            })

        if "lab_results" in components and components["lab_results"]["score"] < 70:
            risk_factors.append({
                "factor": "abnormal_lab_values",
                "severity": "high" if components["lab_results"]["score"] < 50 else "moderate",
                "message": "Multiple lab values are outside normal range.",
            })

        if "medication_adherence" in components and components["medication_adherence"]["score"] < 80:
            risk_factors.append({
                "factor": "low_medication_adherence",
                "severity": "moderate",
                "message": "Medication adherence is below 80%. Consider setting reminders.",
            })

        start = date.today() - timedelta(days=90)
        recent_metrics = (
            self.db.query(DailyMetric)
            .filter(DailyMetric.user_id == user_id, DailyMetric.date >= start)
            .all()
        )
        if recent_metrics:
            bp_readings = [(m.blood_pressure_sys, m.blood_pressure_dia) for m in recent_metrics if m.blood_pressure_sys and m.blood_pressure_dia]
            if bp_readings:
                avg_sys = sum(b[0] for b in bp_readings) / len(bp_readings)
                if avg_sys > 130:
                    risk_factors.append({
                        "factor": "elevated_blood_pressure",
                        "severity": "high" if avg_sys > 140 else "moderate",
                        "message": f"Your average systolic blood pressure ({avg_sys:.0f} mmHg) is elevated.",
                    })

        return risk_factors
