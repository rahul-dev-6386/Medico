from sqlalchemy.orm import Session
from typing import Optional

from app.models.profile import PatientProfile
from app.models.metrics import DailyMetric
from app.models.medication import Medication
from app.services.ai_provider_service import ai_provider


class RoutineService:
    def __init__(self, db: Session):
        self.db = db

    def generate_daily(self, user_id: int) -> dict:
        profile = (
            self.db.query(PatientProfile)
            .filter(PatientProfile.user_id == user_id)
            .first()
        )
        latest_metrics = (
            self.db.query(DailyMetric)
            .filter(DailyMetric.user_id == user_id)
            .order_by(DailyMetric.date.desc())
            .first()
        )
        medications = (
            self.db.query(Medication)
            .filter(Medication.user_id == user_id, Medication.active == True)
            .all()
        )

        context = self._build_context(profile, latest_metrics, medications)

        prompt = (
            f"Based on the following patient profile, generate a personalized daily health routine.\n\n"
            f"Patient Context:\n{context}\n\n"
            f"Generate a daily plan with: wake up time, sleep time, water goals (ml), "
            f"walking goals (steps), exercise suggestions, and nutrition recommendations. "
            f"Respond in JSON format."
        )

        result = ai_provider.generate_daily_routine(context)
        return result

    def generate_weekly(self, user_id: int) -> dict:
        profile = (
            self.db.query(PatientProfile)
            .filter(PatientProfile.user_id == user_id)
            .first()
        )
        medications = (
            self.db.query(Medication)
            .filter(Medication.user_id == user_id, Medication.active == True)
            .all()
        )

        context = self._build_context(profile, None, medications)

        prompt = (
            f"Based on the following patient profile, generate a personalized weekly health plan.\n\n"
            f"Patient Context:\n{context}\n\n"
            f"Generate a weekly plan with: exercise schedule (per day), health targets, and progress review points. "
            f"Respond in JSON format."
        )

        result = ai_provider.generate_structured(
            prompt,
            system_instruction="You are a health routine generator. Generate practical, safe weekly plans.",
        )
        return result

    def _build_context(
        self,
        profile: Optional[PatientProfile],
        metrics: Optional[DailyMetric],
        medications: list,
    ) -> str:
        parts = []
        if profile:
            if profile.date_of_birth:
                from datetime import date
                today = date.today()
                age = today.year - profile.date_of_birth.year
                parts.append(f"Age: {age}")
            if profile.weight_kg:
                parts.append(f"Weight: {profile.weight_kg} kg")
            if profile.height_cm:
                parts.append(f"Height: {profile.height_cm} cm")
            if profile.chronic_diseases:
                parts.append(f"Conditions: {', '.join(profile.chronic_diseases)}")
            if profile.dietary_preferences:
                parts.append(f"Dietary Preferences: {profile.dietary_preferences}")
            if profile.activity_level:
                parts.append(f"Activity Level: {profile.activity_level}")
        if metrics:
            if metrics.sleep_hours:
                parts.append(f"Recent Sleep: {metrics.sleep_hours}h")
            if metrics.steps:
                parts.append(f"Recent Steps: {metrics.steps}")
        if medications:
            parts.append(
                f"Medications: {', '.join(f'{m.name} ({m.dosage})' for m in medications)}"
            )
        return "\n".join(parts) if parts else "New patient, no data yet."
