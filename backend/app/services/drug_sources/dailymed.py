import logging
from typing import Any

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from app.services.drug_sources.base import AbstractDrugSource

logger = logging.getLogger("drug_sources.dailymed")

DAILYMED_BASE = "https://dailymed.nlm.nih.gov/dailymed/services/v2"


class DailyMedSource(AbstractDrugSource):
    """DailyMed — NIH's structured product labeling (SPL) data source.
    Highest priority source — richest clinical data.
    """

    @property
    def source_name(self) -> str:
        return "dailymed"

    @retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=1, max=5))
    def search_by_name(self, name: str) -> dict[str, Any] | None:
        try:
            url = f"{DAILYMED_BASE}/spls.json"
            params = {"drug_name": name, "limit": 5}
            with httpx.Client(timeout=15.0) as client:
                resp = client.get(url, params=params)
            if resp.status_code != 200:
                return None
            data = resp.json()
            spls = data.get("data", [])
            if not spls:
                return None

            # Prefer exact name match; fall back to first result
            name_lower = name.lower()
            best = None
            for spl in spls:
                title = (spl.get("title") or "").lower()
                if name_lower in title:
                    best = spl
                    break
            if not best:
                best = spls[0]

            setid = best.get("setid")
            if not setid:
                return None

            return self._fetch_spl_details(setid)
        except Exception as e:
            logger.warning(f"DailyMed search failed for {name}: {e}")
            return None

    def _fetch_spl_details(self, setid: str) -> dict[str, Any] | None:
        """Fetch full SPL details by setid."""
        result: dict[str, Any] = {}
        try:
            # Get SPL metadata
            url = f"{DAILYMED_BASE}/spls.json"
            params = {"setid": setid}
            with httpx.Client(timeout=15.0) as client:
                resp = client.get(url, params=params)
            if resp.status_code == 200:
                data = resp.json()
                spls = data.get("data", [])
                if spls:
                    spl = spls[0]
                    result["generic_name"] = spl.get("generic_name")
                    title = spl.get("title", "")
                    if title:
                        # title is often "Brand Name - generic name"
                        result["brand_name"] = title.split(" -")[0].strip()
                    if spl.get("brand_name"):
                        result["brand_names"] = [spl["brand_name"]]
                    result["drug_class"] = spl.get("pharm_class_epc") or spl.get("pharm_class_pe")
                    result["pharmacologic_class"] = spl.get("pharm_class_epc")
                    result["therapeutic_class"] = spl.get("pharm_class_pe")

            # Get application notes (indications, dosage, etc.)
            url = f"{DAILYMED_BASE}/spls/{setid}/applicationnotes.json"
            with httpx.Client(timeout=15.0) as client:
                resp = client.get(url, params={"pagesize": 50})
            if resp.status_code == 200:
                notes_data = resp.json()
                notes = notes_data.get("data", [])
                section_map = {
                    "INDICATIONS AND USAGE": "indications",
                    "CONTRAINDICATIONS": "contraindications",
                    "DOSAGE AND ADMINISTRATION": "adult_dose",
                    "ADVERSE REACTIONS": "common_side_effects",
                    "DRUG INTERACTIONS": "drug_interactions",
                    "WARNINGS": "warnings",
                    "WARNINGS AND PRECAUTIONS": "warnings",
                    "BOXED WARNING": "boxed_warning",
                    "USE IN SPECIFIC POPULATIONS": "pregnancy",
                    "PREGNANCY": "pregnancy",
                    "LACTATION": "breastfeeding",
                    "DRUG ABUSE AND DEPENDENCE": "precautions",
                    "MECHANISM OF ACTION": "mechanism_of_action",
                    "PHARMACODYNAMICS": "pharmacodynamics",
                    "PHARMACOKINETICS": "pharmacokinetics",
                    "DESCRIPTION": "drug_class",
                    "CLINICAL PHARMACOLOGY": "pharmacodynamics",
                    "HOW SUPPLIED": "storage_instructions",
                    "STORAGE AND HANDLING": "storage_instructions",
                    "PATIENT COUNSELING INFORMATION": "patient_instructions",
                    "INFORMATION FOR PATIENTS": "patient_instructions",
                    "GERIATRIC USE": "geriatric_dose",
                    "PEDIATRIC USE": "pediatric_dose",
                    "RENAL IMPAIRMENT": "renal_dose_adjustment",
                    "HEPATIC IMPAIRMENT": "hepatic_dose_adjustment",
                    "OVERDOSAGE": "overdose_instructions",
                }
                for note in notes:
                    section_title = (note.get("section_name") or "").upper().strip()
                    section_text = note.get("content") or note.get("text") or ""
                    if section_text and section_title in section_map:
                        field = section_map[section_title]
                        if not result.get(field):
                            result[field] = section_text.strip()

            return result
        except Exception as e:
            logger.warning(f"DailyMed SPL fetch failed for {setid}: {e}")
            return result
