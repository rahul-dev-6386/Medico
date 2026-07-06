from __future__ import annotations

from datetime import date
from typing import Any, Optional

from pydantic import BaseModel, Field, field_serializer


class BasicInfo(BaseModel):
    generic_name: Optional[str] = None
    brand_names: list[str] = Field(default_factory=list)
    active_ingredients: list[dict[str, Any]] = Field(default_factory=list)
    manufacturer: Optional[str] = None
    ndc_codes: list[str] = Field(default_factory=list)
    rxcui: Optional[str] = None
    dosage_form: Optional[str] = None
    route: Optional[str] = None
    strength: Optional[str] = None
    dea_schedule: Optional[str] = None


class ClinicalSection(BaseModel):
    indications_and_usage: Optional[str] = None
    limitations_of_use: Optional[str] = None
    mechanism_of_action: Optional[str] = None
    clinical_pharmacology: Optional[str] = None
    pharmacokinetics: Optional[str] = None
    pharmacodynamics: Optional[str] = None


class DosageSection(BaseModel):
    adult_dosage: Optional[str] = None
    pediatric_dosage: Optional[str] = None
    geriatric_dosage: Optional[str] = None
    renal_adjustment: Optional[str] = None
    hepatic_adjustment: Optional[str] = None
    administration: Optional[str] = None
    missed_dose: Optional[str] = None


class SafetySection(BaseModel):
    contraindications: Optional[str] = None
    boxed_warning: Optional[str] = None
    warnings: Optional[str] = None
    precautions: Optional[str] = None
    adverse_reactions: Optional[str] = None
    serious_adverse_reactions: Optional[str] = None


class InteractionsSection(BaseModel):
    drug_interactions: Optional[str] = None
    food_interactions: Optional[str] = None
    alcohol: Optional[str] = None
    herbal: Optional[str] = None


class PregnancySection(BaseModel):
    pregnancy: Optional[str] = None
    lactation: Optional[str] = None
    fertility: Optional[str] = None


class MonitoringSection(BaseModel):
    required_laboratory_monitoring: Optional[str] = None
    clinical_monitoring: Optional[str] = None


class PatientCounselingSection(BaseModel):
    instructions: Optional[str] = None
    storage: Optional[str] = None
    disposal: Optional[str] = None


class EmergencySection(BaseModel):
    overdose: Optional[str] = None
    toxicity: Optional[str] = None
    antidote: Optional[str] = None


class ReferencesSection(BaseModel):
    spl_set_id: Optional[str] = None
    label_version: Optional[str] = None
    revision_date: Optional[str] = None
    manufacturer: Optional[str] = None


class DrugDocument(BaseModel):
    model_config = {"ser_json_timedelta": "iso8601", "ser_json_bytes": "utf8", "revalidate_instances": "never"}

    set_id: str
    generic_name: str
    brand_names: list[str] = Field(default_factory=list)
    basic_info: BasicInfo = Field(default_factory=BasicInfo)
    clinical: ClinicalSection = Field(default_factory=ClinicalSection)
    dosage: DosageSection = Field(default_factory=DosageSection)
    safety: SafetySection = Field(default_factory=SafetySection)
    interactions: InteractionsSection = Field(default_factory=InteractionsSection)
    pregnancy: PregnancySection = Field(default_factory=PregnancySection)
    monitoring: MonitoringSection = Field(default_factory=MonitoringSection)
    patient_counseling: PatientCounselingSection = Field(default_factory=PatientCounselingSection)
    emergency: EmergencySection = Field(default_factory=EmergencySection)
    references: ReferencesSection = Field(default_factory=ReferencesSection)

    raw_sections: dict[str, Any] = Field(default_factory=dict)

    ingestion_timestamp: Optional[str] = None

    def to_flat_dict(self) -> dict[str, Any]:
        flat: dict[str, Any] = {}
        for section_name in ("basic_info", "clinical", "dosage", "safety", "interactions", "pregnancy", "monitoring", "patient_counseling", "emergency", "references"):
            section = getattr(self, section_name, None)
            if section:
                flat.update(section.model_dump(exclude_none=True))
        flat["set_id"] = self.set_id
        flat["generic_name"] = self.generic_name
        flat["brand_names"] = self.brand_names
        return flat
