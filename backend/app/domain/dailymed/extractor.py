"""
Section extractor.

Maps parsed SPL section titles/codes to the structured DrugDocument schema
using the section mappings defined in sections.py.
"""

from __future__ import annotations

import logging
from typing import Any, Optional

from app.domain.dailymed.models import DrugDocument
from app.domain.dailymed.sections import find_mapping
from app.domain.dailymed.normalizer import normalize_text

logger = logging.getLogger("dailymed.extractor")


def extract(doc: DrugDocument, parsed: dict[str, Any]) -> DrugDocument:
    raw = {}
    _extract_basic_info(doc, parsed)
    _extract_clinical(doc, parsed, raw)
    _extract_dosage(doc, parsed, raw)
    _extract_safety(doc, parsed, raw)
    _extract_interactions(doc, parsed, raw)
    _extract_pregnancy(doc, parsed, raw)
    _extract_monitoring(doc, parsed, raw)
    _extract_patient_counseling(doc, parsed, raw)
    _extract_emergency(doc, parsed, raw)
    _extract_references(doc, parsed)

    doc.raw_sections = raw
    return doc


def _set_nested(obj: Any, path: list[str], value: Any) -> None:
    current = obj
    for key in path[:-1]:
        current = getattr(current, key, None)
        if current is None:
            return
    setattr(current, path[-1], value)


def _get_text(sections: dict, code: str, title_contains: str) -> Optional[str]:
    for key, entry in sections.items():
        if entry.get("code") == code:
            return entry.get("text")
        entry_title = (entry.get("title") or "").lower()
        if title_contains.lower() in entry_title:
            return entry.get("text")
        sub = entry.get("subsections", {})
        if sub:
            result = _get_text(sub, code, title_contains)
            if result:
                return result
    return None


def _append_text(doc: DrugDocument, path: list[str], text: str, raw: dict) -> None:
    cleaned = normalize_text(text)
    if not cleaned:
        return
    current = doc
    for key in path[:-1]:
        current = getattr(current, key, None)
        if current is None:
            return
    existing = getattr(current, path[-1], None)
    if existing:
        cleaned = f"{existing}\n\n{cleaned}"
    setattr(current, path[-1], cleaned)
    raw.setdefault(".".join(path), []).append(cleaned)


def _extract_basic_info(doc: DrugDocument, parsed: dict) -> None:
    set_id = parsed.get("set_id")
    if set_id:
        doc.set_id = set_id
        doc.references.spl_set_id = set_id

    if not doc.generic_name:
        title = parsed.get("title", "")
        if title:
            parts = title.split(" -")
            if len(parts) > 1:
                doc.generic_name = parts[1].strip()
                brand = parts[0].strip()
                if brand and brand.lower() != doc.generic_name.lower():
                    doc.basic_info.brand_names = [brand]
                    doc.brand_names = [brand]
            else:
                doc.generic_name = title.strip()

    manufacturer = parsed.get("manufacturer") or parsed.get("manufacturer")
    if manufacturer:
        doc.basic_info.manufacturer = manufacturer

    if parsed.get("active_ingredients"):
        doc.basic_info.active_ingredients = parsed["active_ingredients"]

    if parsed.get("ndc_codes"):
        doc.basic_info.ndc_codes = parsed["ndc_codes"]

    sections = parsed.get("sections", {})
    dosage_form = _get_text(sections, "34072-9", "dosage form")
    if dosage_form:
        doc.basic_info.dosage_form = normalize_text(dosage_form)

    route = _get_text(sections, "34073-7", "route")
    if route:
        doc.basic_info.route = normalize_text(route)


def _extract_clinical(doc: DrugDocument, parsed: dict, raw: dict) -> None:
    sections = parsed.get("sections", {})

    for code, title, path in [
        ("43690-4", "indications and usage", ["clinical", "indications_and_usage"]),
        ("34077-8", "mechanism of action", ["clinical", "mechanism_of_action"]),
        ("34078-6", "clinical pharmacology", ["clinical", "clinical_pharmacology"]),
        ("34079-4", "pharmacokinetics", ["clinical", "pharmacokinetics"]),
        ("34080-2", "pharmacodynamics", ["clinical", "pharmacodynamics"]),
    ]:
        text = _get_text(sections, code, title)
        if text:
            _append_text(doc, path, text, raw)


def _extract_dosage(doc: DrugDocument, parsed: dict, raw: dict) -> None:
    sections = parsed.get("sections", {})

    for code, title, path in [
        ("34081-0", "dosage and administration", ["dosage", "adult_dosage"]),
        ("34082-8", "pediatric use", ["dosage", "pediatric_dosage"]),
        ("34083-6", "geriatric use", ["dosage", "geriatric_dosage"]),
        ("34084-4", "renal impairment", ["dosage", "renal_adjustment"]),
        ("34085-1", "hepatic impairment", ["dosage", "hepatic_adjustment"]),
        ("34086-9", "administration", ["dosage", "administration"]),
        ("34087-7", "missed dose", ["dosage", "missed_dose"]),
    ]:
        text = _get_text(sections, code, title)
        if text:
            _append_text(doc, path, text, raw)


def _extract_safety(doc: DrugDocument, parsed: dict, raw: dict) -> None:
    sections = parsed.get("sections", {})

    for code, title, path in [
        ("43694-6", "contraindications", ["safety", "contraindications"]),
        ("34088-5", "boxed warning", ["safety", "boxed_warning"]),
        ("43695-3", "warnings and precautions", ["safety", "warnings"]),
        ("34090-1", "precautions", ["safety", "precautions"]),
        ("43696-1", "adverse reactions", ["safety", "adverse_reactions"]),
        ("34092-7", "serious adverse", ["safety", "serious_adverse_reactions"]),
    ]:
        text = _get_text(sections, code, title)
        if text:
            _append_text(doc, path, text, raw)


def _extract_interactions(doc: DrugDocument, parsed: dict, raw: dict) -> None:
    sections = parsed.get("sections", {})

    for code, title, path in [
        ("43697-9", "drug interactions", ["interactions", "drug_interactions"]),
        ("34094-3", "food interactions", ["interactions", "food_interactions"]),
        ("34095-0", "alcohol", ["interactions", "alcohol"]),
        ("34096-8", "herbal", ["interactions", "herbal"]),
    ]:
        text = _get_text(sections, code, title)
        if text:
            _append_text(doc, path, text, raw)


def _extract_pregnancy(doc: DrugDocument, parsed: dict, raw: dict) -> None:
    sections = parsed.get("sections", {})

    for code, title, path in [
        ("43698-7", "pregnancy", ["pregnancy", "pregnancy"]),
        ("34098-4", "lactation", ["pregnancy", "lactation"]),
        ("34099-2", "fertility", ["pregnancy", "fertility"]),
    ]:
        text = _get_text(sections, code, title)
        if text:
            _append_text(doc, path, text, raw)


def _extract_monitoring(doc: DrugDocument, parsed: dict, raw: dict) -> None:
    sections = parsed.get("sections", {})

    for code, title, path in [
        ("34100-8", "laboratory", ["monitoring", "required_laboratory_monitoring"]),
        ("34101-6", "clinical monitoring", ["monitoring", "clinical_monitoring"]),
    ]:
        text = _get_text(sections, code, title)
        if text:
            _append_text(doc, path, text, raw)


def _extract_patient_counseling(doc: DrugDocument, parsed: dict, raw: dict) -> None:
    sections = parsed.get("sections", {})

    for code, title, path in [
        ("43699-5", "patient counseling", ["patient_counseling", "instructions"]),
        ("34103-2", "storage", ["patient_counseling", "storage"]),
        ("34104-0", "disposal", ["patient_counseling", "disposal"]),
    ]:
        text = _get_text(sections, code, title)
        if text:
            _append_text(doc, path, text, raw)


def _extract_emergency(doc: DrugDocument, parsed: dict, raw: dict) -> None:
    sections = parsed.get("sections", {})

    for code, title, path in [
        ("43700-1", "overdosage", ["emergency", "overdose"]),
        ("34106-5", "toxicity", ["emergency", "toxicity"]),
        ("34107-3", "antidote", ["emergency", "antidote"]),
    ]:
        text = _get_text(sections, code, title)
        if text:
            _append_text(doc, path, text, raw)


def _extract_references(doc: DrugDocument, parsed: dict) -> None:
    if parsed.get("version_number"):
        doc.references.label_version = parsed["version_number"]
    if parsed.get("effective_time"):
        dt = parsed["effective_time"]
        if len(dt) >= 8:
            try:
                doc.references.revision_date = f"{dt[:4]}-{dt[4:6]}-{dt[6:8]}"
            except (ValueError, IndexError):
                pass
    if parsed.get("manufacturer"):
        doc.references.manufacturer = parsed["manufacturer"]
