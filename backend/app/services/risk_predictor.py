import json
import os
import pickle
import numpy as np
from typing import Optional, Any

from sqlalchemy.orm import Session
from datetime import date, timedelta

from app.config import settings
from app.models.metrics import DailyMetric
from app.models.profile import PatientProfile
from app.models.medication import Medication


class RiskPredictor:
    def __init__(self):
        self.models_dir = settings.MODELS_DIR
        self.models: dict[str, Any] = {}
        self._load_models()

    def _load_models(self):
        model_files = {
            "diabetes": "diabetes_model.pkl",
            "heart_disease": "heart_disease_model.pkl",
            "ckd": "ckd_model.pkl",
            "stroke": "stroke_model.pkl",
        }
        for name, filename in model_files.items():
            path = os.path.join(self.models_dir, filename)
            if os.path.exists(path):
                try:
                    with open(path, "rb") as f:
                        self.models[name] = pickle.load(f)
                except Exception:
                    self.models[name] = None
            else:
                self.models[name] = None

    def predict_diabetes_risk(self, user_id: int, db: Session) -> dict:
        features = self._extract_diabetes_features(user_id, db)
        return self._predict("diabetes", features, {
            "name": "Diabetes Risk",
            "description": "Type 2 diabetes risk assessment based on blood glucose, BMI, age, and lifestyle factors.",
            "source": "ADA Standards of Care — Diabetes Care 2024",
            "url": "https://diabetesjournals.org/care/issue/47/Supplement_1",
        })

    def predict_heart_disease_risk(self, user_id: int, db: Session) -> dict:
        features = self._extract_cardiac_features(user_id, db)
        return self._predict("heart_disease", features, {
            "name": "Cardiovascular Disease Risk",
            "description": "10-year ASCVD risk estimate based on blood pressure, cholesterol, age, smoking, and diabetes status.",
            "source": "AHA/ACC Guideline on the Assessment of Cardiovascular Risk — Circulation 2019",
            "url": "https://www.ahajournals.org/doi/10.1161/CIR.0000000000000678",
        })

    def predict_ckd_risk(self, user_id: int, db: Session) -> dict:
        features = self._extract_ckd_features(user_id, db)
        return self._predict("ckd", features, {
            "name": "Chronic Kidney Disease Risk",
            "description": "CKD risk based on GFR, creatinine, blood pressure, age, and diabetes status.",
            "source": "KDIGO 2024 Clinical Practice Guideline for the Evaluation and Management of CKD",
            "url": "https://kdigo.org/guidelines/ckd-evaluation-and-management/",
        })

    def predict_stroke_risk(self, user_id: int, db: Session) -> dict:
        features = self._extract_stroke_features(user_id, db)
        return self._predict("stroke", features, {
            "name": "Stroke Risk",
            "description": "Stroke risk assessment based on blood pressure, glucose, BMI, age, and lifestyle.",
            "source": "CDC Stroke Prevention Guidelines",
            "url": "https://www.cdc.gov/stroke/prevention.htm",
        })

    def predict_all(self, user_id: int, db: Session) -> list[dict]:
        results = [
            self.predict_diabetes_risk(user_id, db),
            self.predict_heart_disease_risk(user_id, db),
            self.predict_ckd_risk(user_id, db),
            self.predict_stroke_risk(user_id, db),
        ]
        return [r for r in results if r["risk_level"] != "unknown"]

    def _predict(self, model_name: str, features: list, model_info: dict) -> dict:
        model = self.models.get(model_name)
        if model is None or not features:
            return {
                "condition": model_info["name"],
                "risk_level": "unknown",
                "risk_score": None,
                "description": model_info["description"],
                "source": model_info["source"],
                "source_url": model_info["url"],
                "message": "Risk model not trained or insufficient data.",
            }

        try:
            X = np.array([features])
            proba = model.predict_proba(X)[0][1] if hasattr(model, "predict_proba") else model.predict(X)[0]
            risk_score = float(proba) * 100

            if risk_score >= 20:
                risk_level = "high"
            elif risk_score >= 10:
                risk_level = "moderate"
            else:
                risk_level = "low"

            return {
                "condition": model_info["name"],
                "risk_level": risk_level,
                "risk_score": round(risk_score, 1),
                "description": model_info["description"],
                "source": model_info["source"],
                "source_url": model_info["url"],
                "message": self._get_risk_message(model_name, risk_level, risk_score),
            }
        except Exception:
            return {
                "condition": model_info["name"],
                "risk_level": "unknown",
                "risk_score": None,
                "description": model_info["description"],
                "source": model_info["source"],
                "source_url": model_info["url"],
                "message": "Error running risk prediction.",
            }

    def _get_risk_message(self, model_name: str, level: str, score: float) -> str:
        messages = {
            "diabetes": {
                "high": f"Your estimated diabetes risk is {score:.0f}%. Consider HbA1c testing and lifestyle modifications.",
                "moderate": f"Your estimated diabetes risk is {score:.0f}%. Monitor blood sugar and maintain healthy weight.",
                "low": f"Your estimated diabetes risk is {score:.0f}%. Continue healthy lifestyle habits.",
            },
            "heart_disease": {
                "high": f"Your estimated CVD risk is {score:.0f}%. Consult your doctor about heart health management.",
                "moderate": f"Your estimated CVD risk is {score:.0f}%. Focus on blood pressure control and regular exercise.",
                "low": f"Your estimated CVD risk is {score:.0f}%. Maintain heart-healthy habits.",
            },
            "ckd": {
                "high": f"Your estimated CKD risk is {score:.0f}%. Monitor kidney function and consult a nephrologist.",
                "moderate": f"Your estimated CKD risk is {score:.0f}%. Stay hydrated and monitor blood pressure.",
                "low": f"Your estimated CKD risk is {score:.0f}%. Maintain healthy kidney habits.",
            },
            "stroke": {
                "high": f"Your estimated stroke risk is {score:.0f}%. Seek medical evaluation promptly.",
                "moderate": f"Your estimated stroke risk is {score:.0f}%. Manage blood pressure and avoid smoking.",
                "low": f"Your estimated stroke risk is {score:.0f}%. Continue healthy lifestyle.",
            },
        }
        return messages.get(model_name, {}).get(level, "")

    def _extract_diabetes_features(self, user_id: int, db: Session) -> list:
        profile = db.query(PatientProfile).filter(PatientProfile.user_id == user_id).first()
        recent = (
            db.query(DailyMetric)
            .filter(DailyMetric.user_id == user_id)
            .order_by(DailyMetric.date.desc())
            .first()
        )

        age = 0
        if profile and profile.date_of_birth:
            age = date.today().year - profile.date_of_birth.year

        bmi = 25.0
        if recent and recent.weight_kg:
            height_m = 1.7
            bmi = recent.weight_kg / (height_m ** 2)

        glucose = recent.blood_sugar if recent and recent.blood_sugar else 95.0
        bp = recent.blood_pressure_sys if recent and recent.blood_pressure_sys else 120.0
        exercise = recent.exercise_min if recent and recent.exercise_min else 0
        sleep = recent.sleep_hours if recent and recent.sleep_hours else 7.0

        return [age, bmi, glucose, bp, exercise, sleep]

    def _extract_cardiac_features(self, user_id: int, db: Session) -> list:
        profile = db.query(PatientProfile).filter(PatientProfile.user_id == user_id).first()
        recent = (
            db.query(DailyMetric)
            .filter(DailyMetric.user_id == user_id)
            .order_by(DailyMetric.date.desc())
            .first()
        )

        age = 0
        if profile and profile.date_of_birth:
            age = date.today().year - profile.date_of_birth.year

        bp_sys = recent.blood_pressure_sys if recent and recent.blood_pressure_sys else 120.0
        bp_dia = recent.blood_pressure_dia if recent and recent.blood_pressure_dia else 80.0
        cholesterol = 200.0
        glucose = recent.blood_sugar if recent and recent.blood_sugar else 95.0
        bmi = 25.0
        if recent and recent.weight_kg:
            height_m = 1.7
            bmi = recent.weight_kg / (height_m ** 2)

        smoker = 0
        heart_rate = recent.heart_rate if recent and recent.heart_rate else 75
        exercise = recent.exercise_min if recent and recent.exercise_min else 0

        return [age, bp_sys, bp_dia, cholesterol, glucose, bmi, smoker, heart_rate, exercise]

    def _extract_ckd_features(self, user_id: int, db: Session) -> list:
        profile = db.query(PatientProfile).filter(PatientProfile.user_id == user_id).first()
        recent = (
            db.query(DailyMetric)
            .filter(DailyMetric.user_id == user_id)
            .order_by(DailyMetric.date.desc())
            .first()
        )

        age = 0
        if profile and profile.date_of_birth:
            age = date.today().year - profile.date_of_birth.year

        bp_sys = recent.blood_pressure_sys if recent and recent.blood_pressure_sys else 120.0
        glucose = recent.blood_sugar if recent and recent.blood_sugar else 95.0
        bmi = 25.0
        if recent and recent.weight_kg:
            height_m = 1.7
            bmi = recent.weight_kg / (height_m ** 2)

        hemoglobin = 14.0
        albumin = 4.0
        sodium = 140.0

        return [age, bp_sys, glucose, bmi, hemoglobin, albumin, sodium]

    def _extract_stroke_features(self, user_id: int, db: Session) -> list:
        profile = db.query(PatientProfile).filter(PatientProfile.user_id == user_id).first()
        recent = (
            db.query(DailyMetric)
            .filter(DailyMetric.user_id == user_id)
            .order_by(DailyMetric.date.desc())
            .first()
        )

        age = 0
        if profile and profile.date_of_birth:
            age = date.today().year - profile.date_of_birth.year

        bp_sys = recent.blood_pressure_sys if recent and recent.blood_pressure_sys else 120.0
        glucose = recent.blood_sugar if recent and recent.blood_sugar else 95.0
        bmi = 25.0
        if recent and recent.weight_kg:
            height_m = 1.7
            bmi = recent.weight_kg / (height_m ** 2)

        smoker = 0
        heart_rate = recent.heart_rate if recent and recent.heart_rate else 75
        exercise = recent.exercise_min if recent and recent.exercise_min else 0
        sleep = recent.sleep_hours if recent and recent.sleep_hours else 7.0

        return [age, bp_sys, glucose, bmi, smoker, heart_rate, exercise, sleep]


risk_predictor = RiskPredictor()
