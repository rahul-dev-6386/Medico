"""
SPL section code and title mapping to the DrugDocument schema.

DailyMed SPL XML uses structured section codes from the NLM
document type definition. We map by:
1. `code` attribute on `<section>` elements (preferred)
2. Section title text (fallback)

Section codes follow the format `{root}-{section}-{subsection}`.
See: https://dailymed.nlm.nih.gov/dailymed/spl-resources.cfm
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass
class SectionMapping:
    section_path: list[str]
    title_patterns: list[str]
    code_patterns: list[str]


SECTION_MAPPINGS: list[SectionMapping] = [
    SectionMapping(
        section_path=["basic_info", "generic_name"],
        title_patterns=["generic name", "active ingredient"],
        code_patterns=["34067-9", "34068-7"],
    ),
    SectionMapping(
        section_path=["basic_info", "brand_names"],
        title_patterns=["brand name", "proprietary name"],
        code_patterns=["72171-6", "34069-5"],
    ),
    SectionMapping(
        section_path=["basic_info", "active_ingredients"],
        title_patterns=["active ingredient"],
        code_patterns=["34068-7"],
    ),
    SectionMapping(
        section_path=["basic_info", "manufacturer"],
        title_patterns=["manufacturer", "labeler", "distributor"],
        code_patterns=["72172-4", "34070-3"],
    ),
    SectionMapping(
        section_path=["basic_info", "ndc_codes"],
        title_patterns=["ndc", "national drug code"],
        code_patterns=["72173-2", "34071-1"],
    ),
    SectionMapping(
        section_path=["basic_info", "dosage_form"],
        title_patterns=["dosage form", "dosage forms"],
        code_patterns=["34072-9"],
    ),
    SectionMapping(
        section_path=["basic_info", "route"],
        title_patterns=["route", "route of administration"],
        code_patterns=["34073-7"],
    ),
    SectionMapping(
        section_path=["basic_info", "strength"],
        title_patterns=["strength"],
        code_patterns=["34074-5"],
    ),
    SectionMapping(
        section_path=["basic_info", "dea_schedule"],
        title_patterns=["dea schedule", "controlled substance"],
        code_patterns=["34075-2", "72174-0"],
    ),
    SectionMapping(
        section_path=["clinical", "indications_and_usage"],
        title_patterns=["indications and usage", "indications", "uses"],
        code_patterns=["34067-9", "43690-4"],
    ),
    SectionMapping(
        section_path=["clinical", "limitations_of_use"],
        title_patterns=["limitations of use"],
        code_patterns=["34076-0"],
    ),
    SectionMapping(
        section_path=["clinical", "mechanism_of_action"],
        title_patterns=["mechanism of action", "clinical pharmacology"],
        code_patterns=["34077-8", "43691-2"],
    ),
    SectionMapping(
        section_path=["clinical", "clinical_pharmacology"],
        title_patterns=["clinical pharmacology"],
        code_patterns=["34078-6"],
    ),
    SectionMapping(
        section_path=["clinical", "pharmacokinetics"],
        title_patterns=["pharmacokinetics"],
        code_patterns=["34079-4"],
    ),
    SectionMapping(
        section_path=["clinical", "pharmacodynamics"],
        title_patterns=["pharmacodynamics"],
        code_patterns=["34080-2"],
    ),
    SectionMapping(
        section_path=["dosage", "adult_dosage"],
        title_patterns=["dosage and administration", "dosage", "adult dosage"],
        code_patterns=["34081-0", "43692-0"],
    ),
    SectionMapping(
        section_path=["dosage", "pediatric_dosage"],
        title_patterns=["pediatric use", "pediatric dosage", "children"],
        code_patterns=["34082-8"],
    ),
    SectionMapping(
        section_path=["dosage", "geriatric_dosage"],
        title_patterns=["geriatric use", "geriatric dosage", "elderly"],
        code_patterns=["34083-6"],
    ),
    SectionMapping(
        section_path=["dosage", "renal_adjustment"],
        title_patterns=["renal impairment", "renal dose", "renal adjustment"],
        code_patterns=["34084-4"],
    ),
    SectionMapping(
        section_path=["dosage", "hepatic_adjustment"],
        title_patterns=["hepatic impairment", "hepatic dose", "hepatic adjustment"],
        code_patterns=["34085-1"],
    ),
    SectionMapping(
        section_path=["dosage", "administration"],
        title_patterns=["administration", "how supplied", "storage and handling"],
        code_patterns=["34086-9", "43693-8"],
    ),
    SectionMapping(
        section_path=["dosage", "missed_dose"],
        title_patterns=["missed dose"],
        code_patterns=["34087-7"],
    ),
    SectionMapping(
        section_path=["safety", "contraindications"],
        title_patterns=["contraindications"],
        code_patterns=["34070-3", "43694-6"],
    ),
    SectionMapping(
        section_path=["safety", "boxed_warning"],
        title_patterns=["boxed warning", "black box warning", "warning"],
        code_patterns=["34088-5"],
    ),
    SectionMapping(
        section_path=["safety", "warnings"],
        title_patterns=["warnings and precautions", "warnings"],
        code_patterns=["34089-3", "43695-3"],
    ),
    SectionMapping(
        section_path=["safety", "precautions"],
        title_patterns=["precautions"],
        code_patterns=["34090-1"],
    ),
    SectionMapping(
        section_path=["safety", "adverse_reactions"],
        title_patterns=["adverse reactions", "side effects"],
        code_patterns=["34091-9", "43696-1"],
    ),
    SectionMapping(
        section_path=["safety", "serious_adverse_reactions"],
        title_patterns=["serious adverse reactions", "serious adverse events"],
        code_patterns=["34092-7"],
    ),
    SectionMapping(
        section_path=["interactions", "drug_interactions"],
        title_patterns=["drug interactions"],
        code_patterns=["34093-5", "43697-9"],
    ),
    SectionMapping(
        section_path=["interactions", "food_interactions"],
        title_patterns=["food interactions"],
        code_patterns=["34094-3"],
    ),
    SectionMapping(
        section_path=["interactions", "alcohol"],
        title_patterns=["alcohol"],
        code_patterns=["34095-0"],
    ),
    SectionMapping(
        section_path=["interactions", "herbal"],
        title_patterns=["herbal"],
        code_patterns=["34096-8"],
    ),
    SectionMapping(
        section_path=["pregnancy", "pregnancy"],
        title_patterns=["pregnancy", "use in specific populations"],
        code_patterns=["34097-6", "43698-7"],
    ),
    SectionMapping(
        section_path=["pregnancy", "lactation"],
        title_patterns=["lactation", "breast feeding", "nursing mothers"],
        code_patterns=["34098-4"],
    ),
    SectionMapping(
        section_path=["pregnancy", "fertility"],
        title_patterns=["fertility", "reproductive"],
        code_patterns=["34099-2"],
    ),
    SectionMapping(
        section_path=["monitoring", "required_laboratory_monitoring"],
        title_patterns=["laboratory monitoring", "lab tests", "laboratory tests"],
        code_patterns=["34100-8"],
    ),
    SectionMapping(
        section_path=["monitoring", "clinical_monitoring"],
        title_patterns=["clinical monitoring", "patient monitoring"],
        code_patterns=["34101-6"],
    ),
    SectionMapping(
        section_path=["patient_counseling", "instructions"],
        title_patterns=["patient counseling information", "information for patients"],
        code_patterns=["34102-4", "43699-5"],
    ),
    SectionMapping(
        section_path=["patient_counseling", "storage"],
        title_patterns=["storage", "how supplied"],
        code_patterns=["34103-2"],
    ),
    SectionMapping(
        section_path=["patient_counseling", "disposal"],
        title_patterns=["disposal", "discard"],
        code_patterns=["34104-0"],
    ),
    SectionMapping(
        section_path=["emergency", "overdose"],
        title_patterns=["overdosage", "overdose"],
        code_patterns=["34105-7", "43700-1"],
    ),
    SectionMapping(
        section_path=["emergency", "toxicity"],
        title_patterns=["toxicity"],
        code_patterns=["34106-5"],
    ),
    SectionMapping(
        section_path=["emergency", "antidote"],
        title_patterns=["antidote"],
        code_patterns=["34107-3"],
    ),
    SectionMapping(
        section_path=["references", "spl_set_id"],
        title_patterns=["set id", "spl set id"],
        code_patterns=["34108-1"],
    ),
    SectionMapping(
        section_path=["references", "label_version"],
        title_patterns=["label version", "version"],
        code_patterns=["34109-9"],
    ),
    SectionMapping(
        section_path=["references", "revision_date"],
        title_patterns=["revision date", "last revised"],
        code_patterns=["34110-7"],
    ),
]


def find_mapping(code: Optional[str], title: Optional[str]) -> Optional[SectionMapping]:
    if code:
        for m in SECTION_MAPPINGS:
            if code in m.code_patterns:
                return m
    if title:
        t = title.strip().lower()
        for m in SECTION_MAPPINGS:
            for pattern in m.title_patterns:
                if pattern in t:
                    return m
    return None
