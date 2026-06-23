import json
from typing import Optional

from app.services.ai_provider_service import ai_provider


DOCUMENT_TYPES = [
    "Blood Test Report",
    "Prescription",
    "X-Ray",
    "MRI",
    "CT Scan",
    "ECG",
    "Vaccination Record",
    "Discharge Summary",
    "Medical Certificate",
    "Insurance Document",
    "General Medical Report",
]


class ClassificationService:
    def classify(self, text: str, filename: str = "") -> dict:
        prompt = (
            "Classify this medical document into exactly one of these types:\n"
            + "\n".join(f"- {t}" for t in DOCUMENT_TYPES)
            + "\n\nReturn ONLY valid JSON:\n"
            '{"document_type": "<type>", "confidence": <0-100>, "reasoning": "<brief reason>"}\n\n'
            f"Filename: {filename}\n"
            f"Document text:\n{text[:3000]}"
        )
        result = ai_provider.generate_structured(prompt)
        if result.get("document_type") not in DOCUMENT_TYPES:
            return {"document_type": "General Medical Report", "confidence": 50, "reasoning": "Fallback classification"}
        return result

    def extract_structured(self, text: str, document_type: str) -> dict:
        prompt = self._build_extraction_prompt(text, document_type)
        result = ai_provider.generate_structured(prompt)
        if result.get("error"):
            return self._fallback_extract(text, document_type)
        return result

    def _build_extraction_prompt(self, text: str, document_type: str) -> str:
        type_specific = {
            "Blood Test Report": (
                "Extract: patient_info (name, age, sex), lab_values (array of {test_name, value, unit, reference_range, flag}), "
                "diagnosis (array), findings (array), recommendations (array), biomarkers (array of {name, value, unit, status})"
            ),
            "Prescription": (
                "Extract: patient_info (name, age, sex), diagnosis (array), medications (array of {name, dosage, frequency, duration, instructions}), "
                "recommendations (array), doctor_info (name, registration)"
            ),
            "X-Ray": (
                "Extract: patient_info (name, age, sex), body_part, findings (array), impression (string), "
                "recommendations (array), confidence (string)"
            ),
            "MRI": (
                "Extract: patient_info (name, age, sex), body_part, findings (array), impression (string), "
                "recommendations (array), confidence (string)"
            ),
            "CT Scan": (
                "Extract: patient_info (name, age, sex), body_part, findings (array), impression (string), "
                "recommendations (array), confidence (string)"
            ),
            "ECG": (
                "Extract: patient_info (name, age, sex), heart_rate, rhythm, findings (array), "
                "diagnosis (array), recommendations (array)"
            ),
            "Vaccination Record": (
                "Extract: patient_info (name, age, sex), vaccines (array of {name, date, dose, next_due}), "
                "notes (string)"
            ),
            "Discharge Summary": (
                "Extract: patient_info (name, age, sex), admission_date, discharge_date, diagnosis (array), "
                "procedures (array), medications (array of {name, dosage, frequency, duration}), "
                "follow_up_plan (string), recommendations (array)"
            ),
            "Medical Certificate": (
                "Extract: patient_info (name, age, sex), certificate_type, diagnosis (array), "
                "valid_from, valid_until, restrictions (array), doctor_info (name, registration)"
            ),
            "Insurance Document": (
                "Extract: patient_info (name, age, sex), policy_number, provider, coverage_details (array), "
                "validity_period, claims (array)"
            ),
            "General Medical Report": (
                "Extract: patient_info (name, age, sex), diagnosis (array), findings (array), "
                "recommendations (array), lab_values (array of {test_name, value, unit})"
            ),
        }
        extraction_guide = type_specific.get(document_type, type_specific["General Medical Report"])
        return (
            f"Document type: {document_type}\n\n"
            f"{extraction_guide}\n\n"
            "Also extract always: health_score (0-100 based on overall health indicators), "
            "risk_scores (object with keys: diabetes, heart_disease, kidney_disease, liver_disease, hypertension, vitamin_deficiency, obesity; each 0-100), "
            "follow_up_tests (array of strings), timeline_events (array of {date, event, type}), "
            "abnormal_values (array of {test, value, unit, severity})\n\n"
            "Return ONLY valid JSON. No markdown. No explanations.\n\n"
            f"Document text:\n{text[:5000]}"
        )

    def _fallback_extract(self, text: str, document_type: str) -> dict:
        result = {
            "document_type": document_type,
            "patient_info": self._extract_patient_info(text),
            "diagnosis": self._extract_diagnosis(text),
            "findings": [],
            "recommendations": self._extract_recommendations(text),
            "lab_values": self._extract_lab_values(text),
            "biomarkers": [],
            "risk_scores": {
                "diabetes": 50, "heart_disease": 50, "kidney_disease": 50,
                "liver_disease": 50, "hypertension": 50, "vitamin_deficiency": 50,
                "obesity": 50,
            },
            "health_score": 50,
            "follow_up_tests": [],
            "abnormal_values": [],
            "timeline_events": [],
        }
        return result

    def _extract_patient_info(self, text: str) -> dict:
        info = {"name": "", "age": None, "sex": ""}
        m = __import__("re").search(r"(?:Patient|Name)\s*:\s*([A-Za-z\s]+?)(?:\s*\|)", text)
        if m:
            info["name"] = m.group(1).strip()
        m = __import__("re").search(r"(?:DOB|Age)\s*:\s*(\d{4}|\d+)", text)
        if m:
            try:
                info["age"] = int(__import__("datetime").datetime.now().year - int(m.group(1))) if len(m.group(1)) == 4 else int(m.group(1))
            except ValueError:
                pass
        if "male" in text.lower():
            info["sex"] = "Male"
        elif "female" in text.lower():
            info["sex"] = "Female"
        return info

    def _extract_diagnosis(self, text: str) -> list:
        m = __import__("re").search(r"(?:DIAGNOSIS|Diagnosis)\s*:\s*(.+)", text)
        if m:
            return [d.strip() for d in m.group(1).split(",")]
        return []

    def _extract_recommendations(self, text: str) -> list:
        m = __import__("re").search(r"(?:RECOMMENDATIONS|Recommendations)\s*:\s*(.+)", text)
        if m:
            return [r.strip() for r in m.group(1).split(",")]
        return []

    def _extract_lab_values(self, text: str) -> list:
        values = []
        table_start = None
        table_end = None
        lines = text.split("\n")
        for i, line in enumerate(lines):
            if "TEST" in line and "RESULT" in line:
                table_start = i
            if table_start is not None and ("DIAGNOSIS" in line or "DIAGNOSIS:" in line):
                table_end = i
                break
        if table_start is None:
            return values
        if table_end is None:
            table_end = len(lines)

        for line in lines[table_start + 1:table_end]:
            line = line.strip()
            if not line or line.startswith("-"):
                continue
            parts = line.split()
            if len(parts) < 2:
                continue
            value_idx = None
            for i, p in enumerate(parts):
                cleaned = p.replace(",", "").replace("<", "").replace(">", "")
                try:
                    float(cleaned)
                    value_idx = i
                    break
                except ValueError:
                    continue
            if value_idx is None or value_idx < 1:
                continue

            name = " ".join(parts[:value_idx])
            value_str = parts[value_idx]
            rest = parts[value_idx + 1:]

            flag = ""
            reference_range = ""
            unit = ""
            if rest:
                last = rest[-1]
                if last in ("Normal", "HIGH", "LOW", "normal", "high", "low"):
                    flag = last.capitalize() if last.islower() else last
                    rest = rest[:-1]
                if rest:
                    maybe_unit = rest[-1]
                    if "/" in maybe_unit:
                        unit = maybe_unit
                        reference_range = " ".join(rest[:-1])
                    else:
                        reference_range = " ".join(rest)
            entry = {"test_name": name.strip(), "value": value_str, "flag": flag}
            if unit:
                entry["unit"] = unit
            if reference_range:
                entry["reference_range"] = reference_range.strip()
            values.append(entry)
        return values


classification_service = ClassificationService()
