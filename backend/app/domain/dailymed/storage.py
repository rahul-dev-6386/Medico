"""
PostgreSQL + Qdrant storage for DailyMed drug documents.

Stores one row per drug in drug_database.
Stores vector embeddings in Qdrant for semantic search.
"""

from __future__ import annotations

import logging
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.drug_database import DrugEntry
from app.domain.dailymed.models import DrugDocument
from app.infrastructure.embedding_service import embedding_service
from app.infrastructure.vector_store import vector_store

logger = logging.getLogger("dailymed.storage")


def store_drug_document(doc: DrugDocument, db: Optional[Session] = None) -> bool:
    own_session = False
    if db is None:
        db = SessionLocal()
        own_session = True

    try:
        generic_name = doc.generic_name
        if not generic_name:
            logger.warning(f"No generic name for set_id={doc.set_id}, skipping storage")
            return False

        existing = db.query(DrugEntry).filter(DrugEntry.generic_name == generic_name).first()

        flat = _doc_to_flat(doc)

        if existing:
            merged = False
            for key, value in flat.items():
                old = getattr(existing, key, None)
                if old is None and value is not None:
                    setattr(existing, key, value)
                    merged = True
            if merged:
                _update_embedding(existing, flat)
                db.commit()
            return True

        entry = DrugEntry(
            generic_name=generic_name,
            embedding_id=f"drug_{generic_name.lower().replace(' ', '_')}",
        )
        for key, value in flat.items():
            if value is not None:
                setattr(entry, key, value)

        db.add(entry)
        db.flush()

        text_for_embedding = _build_embedding_text(doc)
        embedding_data = embedding_service.embed_document(text_for_embedding)

        vector_store.upsert(
            embedding_id=entry.embedding_id,
            embedding=embedding_data["embedding"],
            payload=_vector_payload(entry, doc),
        )
        db.commit()
        return True

    except Exception as e:
        logger.error(f"Failed to store drug {doc.generic_name}: {e}")
        if own_session:
            db.rollback()
        return False
    finally:
        if own_session:
            db.close()


def _doc_to_flat(doc: DrugDocument) -> dict[str, Any]:
    flat: dict[str, Any] = {}

    if doc.brand_names:
        flat["brand_name"] = doc.brand_names[0] if doc.brand_names else None
        flat["brand_names"] = doc.brand_names

    if doc.basic_info.manufacturer:
        flat["drug_class"] = doc.basic_info.manufacturer
    if doc.basic_info.rxcui:
        flat["rxcui"] = doc.basic_info.rxcui

    if doc.clinical.indications_and_usage:
        flat["indications"] = doc.clinical.indications_and_usage
    if doc.clinical.mechanism_of_action:
        flat["mechanism_of_action"] = doc.clinical.mechanism_of_action
    if doc.clinical.pharmacodynamics:
        flat["pharmacodynamics"] = doc.clinical.pharmacodynamics
    if doc.clinical.pharmacokinetics:
        flat["pharmacokinetics"] = doc.clinical.pharmacokinetics

    if doc.dosage.adult_dosage:
        flat["adult_dose"] = doc.dosage.adult_dosage
    if doc.dosage.pediatric_dosage:
        flat["pediatric_dose"] = doc.dosage.pediatric_dosage
    if doc.dosage.geriatric_dosage:
        flat["geriatric_dose"] = doc.dosage.geriatric_dosage
    if doc.dosage.renal_adjustment:
        flat["renal_dose_adjustment"] = doc.dosage.renal_adjustment
    if doc.dosage.hepatic_adjustment:
        flat["hepatic_dose_adjustment"] = doc.dosage.hepatic_adjustment
    if doc.dosage.administration:
        flat["administration"] = doc.dosage.administration
    if doc.dosage.missed_dose:
        flat["missed_dose_instructions"] = doc.dosage.missed_dose

    if doc.safety.contraindications:
        flat["contraindications"] = doc.safety.contraindications
    if doc.safety.boxed_warning:
        flat["boxed_warning"] = doc.safety.boxed_warning
    if doc.safety.warnings:
        flat["warnings"] = doc.safety.warnings
    if doc.safety.precautions:
        flat["precautions"] = doc.safety.precautions
    if doc.safety.adverse_reactions:
        flat["common_side_effects"] = doc.safety.adverse_reactions
        flat["side_effects"] = doc.safety.adverse_reactions
    if doc.safety.serious_adverse_reactions:
        flat["serious_side_effects"] = doc.safety.serious_adverse_reactions

    if doc.interactions.drug_interactions:
        flat["drug_interactions"] = doc.interactions.drug_interactions
    if doc.interactions.food_interactions:
        flat["food_interactions"] = doc.interactions.food_interactions
    if doc.interactions.alcohol:
        flat["alcohol_interactions"] = doc.interactions.alcohol
    if doc.interactions.herbal:
        flat["herbal_interactions"] = doc.interactions.herbal

    if doc.pregnancy.pregnancy:
        flat["pregnancy"] = doc.pregnancy.pregnancy
    if doc.pregnancy.lactation:
        flat["breastfeeding"] = doc.pregnancy.lactation
    if doc.pregnancy.fertility:
        flat["fertility"] = doc.pregnancy.fertility

    if doc.monitoring.required_laboratory_monitoring:
        flat["required_monitoring"] = doc.monitoring.required_laboratory_monitoring
        flat["laboratory_tests"] = doc.monitoring.required_laboratory_monitoring

    if doc.patient_counseling.instructions:
        flat["patient_instructions"] = doc.patient_counseling.instructions
    if doc.patient_counseling.storage:
        flat["storage_instructions"] = doc.patient_counseling.storage
    if doc.patient_counseling.disposal:
        flat["disposal_instructions"] = doc.patient_counseling.disposal

    if doc.emergency.overdose:
        flat["overdose_instructions"] = doc.emergency.overdose
    if doc.emergency.toxicity:
        flat["toxicity"] = doc.emergency.toxicity
    if doc.emergency.antidote:
        flat["antidote"] = doc.emergency.antidote

    if doc.references.manufacturer:
        flat["data_sources"] = {"dailymed": ["dailymed"]}
    if doc.references.revision_date:
        flat["last_updated"] = doc.references.revision_date

    return flat


def _build_embedding_text(doc: DrugDocument) -> str:
    parts: list[str] = []
    if doc.generic_name:
        parts.append(f"Generic Name: {doc.generic_name}")
    if doc.brand_names:
        parts.append(f"Brand Names: {', '.join(doc.brand_names)}")
    if doc.clinical.indications_and_usage:
        parts.append(f"Indications: {doc.clinical.indications_and_usage}")
    if doc.clinical.mechanism_of_action:
        parts.append(f"Mechanism of Action: {doc.clinical.mechanism_of_action}")
    if doc.safety.warnings:
        parts.append(f"Warnings: {doc.safety.warnings}")
    if doc.interactions.drug_interactions:
        parts.append(f"Drug Interactions: {doc.interactions.drug_interactions}")
    if doc.clinical.clinical_pharmacology:
        parts.append(f"Clinical Pharmacology: {doc.clinical.clinical_pharmacology}")
    if doc.patient_counseling.instructions:
        parts.append(f"Patient Counseling: {doc.patient_counseling.instructions}")
    return "\n\n".join(parts)


def _update_embedding(entry: DrugEntry, flat: dict) -> None:
    text = _build_embedding_text_from_flat(flat)
    try:
        emb = embedding_service.embed_document(text)
        vector_store.upsert(
            embedding_id=entry.embedding_id,
            embedding=emb["embedding"],
            payload=_vector_payload_from_flat(flat),
        )
    except Exception as e:
        logger.warning(f"Embedding update failed: {e}")


def _build_embedding_text_from_flat(flat: dict) -> str:
    parts = []
    for key in ("generic_name", "brand_name", "indications", "mechanism_of_action",
                 "warnings", "drug_interactions", "patient_instructions"):
        val = flat.get(key)
        if val:
            parts.append(f"{key.replace('_', ' ').title()}: {val}")
    return "\n\n".join(parts)


def _vector_payload(entry: DrugEntry, doc: DrugDocument) -> dict:
    return {
        "type": "drug_dailymed",
        "set_id": doc.set_id,
        "generic_name": entry.generic_name,
        "brand_name": doc.brand_names[0] if doc.brand_names else "",
        "manufacturer": doc.basic_info.manufacturer or "",
        "dosage_form": doc.basic_info.dosage_form or "",
        "route": doc.basic_info.route or "",
    }


def _vector_payload_from_flat(flat: dict) -> dict:
    return {
        "type": "drug_dailymed",
        "generic_name": flat.get("generic_name", ""),
        "brand_name": flat.get("brand_name", ""),
    }
