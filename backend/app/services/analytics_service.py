from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, timedelta
from typing import Optional

from app.models.metrics import DailyMetric
from app.models.medication import Medication, MedicationAdherence


class AnalyticsService:
    def __init__(self, db: Session):
        self.db = db

    def get_trend(self, user_id: int, metric: str, days: int = 30) -> list[dict]:
        start_date = date.today() - timedelta(days=days)
        metrics = (
            self.db.query(DailyMetric)
            .filter(
                DailyMetric.user_id == user_id,
                DailyMetric.date >= start_date,
            )
            .order_by(DailyMetric.date)
            .all()
        )

        return [
            {
                "date": m.date.isoformat(),
                "value": getattr(m, metric, None),
            }
            for m in metrics
        ]

    def get_scores(self, user_id: int, days: int = 30) -> dict:
        start_date = date.today() - timedelta(days=days)
        metrics = (
            self.db.query(DailyMetric)
            .filter(
                DailyMetric.user_id == user_id,
                DailyMetric.date >= start_date,
            )
            .all()
        )

        if not metrics:
            return {
                "exercise_consistency": 0,
                "hydration_score": 0,
                "sleep_score": 0,
                "days_tracked": 0,
            }

        days_tracked = len(metrics)
        days_with_exercise = sum(1 for m in metrics if m.exercise_min and m.exercise_min > 0)
        days_with_water = sum(1 for m in metrics if m.water_ml and m.water_ml >= 2000)
        days_with_good_sleep = sum(1 for m in metrics if m.sleep_hours and 7 <= m.sleep_hours <= 9)

        return {
            "exercise_consistency": round((days_with_exercise / days_tracked) * 100) if days_tracked > 0 else 0,
            "hydration_score": round((days_with_water / days_tracked) * 100) if days_tracked > 0 else 0,
            "sleep_score": round((days_with_good_sleep / days_tracked) * 100) if days_tracked > 0 else 0,
            "days_tracked": days_tracked,
        }

    def detect_patterns(self, user_id: int) -> list[dict]:
        patterns = []
        thirty_days_ago = date.today() - timedelta(days=30)
        metrics = (
            self.db.query(DailyMetric)
            .filter(
                DailyMetric.user_id == user_id,
                DailyMetric.date >= thirty_days_ago,
            )
            .order_by(DailyMetric.date)
            .all()
        )

        if len(metrics) < 7:
            return [{"message": "Not enough data to detect patterns. Track at least 7 days."}]

        sleep_values = [m.sleep_hours for m in metrics if m.sleep_hours]
        if len(sleep_values) >= 7:
            first_week = sum(sleep_values[:7]) / 7
            last_week = sum(sleep_values[-7:]) / 7
            if last_week < first_week * 0.75:
                patterns.append({
                    "type": "sleep_decline",
                    "severity": "warning",
                    "message": f"Your average sleep duration has decreased by {((first_week - last_week) / first_week * 100):.0f}% over the last 3 weeks.",
                })

        water_values = [m.water_ml for m in metrics if m.water_ml]
        if water_values:
            avg_water = sum(water_values) / len(water_values)
            if avg_water < 1500:
                patterns.append({
                    "type": "low_hydration",
                    "severity": "warning",
                    "message": f"Your average water intake ({avg_water:.0f} ml/day) is below the recommended 2000 ml/day.",
                })

        return patterns if patterns else [{"message": "No unhealthy patterns detected. Keep up the good work!"}]

    def generate_monthly_report(self, user_id: int, month: int, year: int) -> dict:
        metrics = (
            self.db.query(DailyMetric)
            .filter(
                DailyMetric.user_id == user_id,
                func.extract("month", DailyMetric.date) == month,
                func.extract("year", DailyMetric.date) == year,
            )
            .all()
        )

        if not metrics:
            return {"message": "No data for this month."}

        sleep_hours = [m.sleep_hours for m in metrics if m.sleep_hours]
        water_ml = [m.water_ml for m in metrics if m.water_ml]
        weight_kg = [m.weight_kg for m in metrics if m.weight_kg]
        exercise_min = [m.exercise_min for m in metrics if m.exercise_min]
        steps = [m.steps for m in metrics if m.steps]
        mood = [m.mood for m in metrics if m.mood]

        return {
            "month": month,
            "year": year,
            "days_tracked": len(metrics),
            "averages": {
                "sleep_hours": round(sum(sleep_hours) / len(sleep_hours), 1) if sleep_hours else None,
                "water_ml": round(sum(water_ml) / len(water_ml), 0) if water_ml else None,
                "weight_kg": round(sum(weight_kg) / len(weight_kg), 1) if weight_kg else None,
                "exercise_min": round(sum(exercise_min) / len(exercise_min), 0) if exercise_min else None,
                "steps": round(sum(steps) / len(steps), 0) if steps else None,
                "mood": round(sum(mood) / len(mood), 1) if mood else None,
            },
        }
