import logging
from typing import Any

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from app.services.drug_sources.base import AbstractDrugSource

logger = logging.getLogger("drug_sources.openfda")

OPENFDA_BASE = "https://api.fda.gov/drug"
LABEL_ENDPOINT = f"{OPENFDA_BASE}/label.json"
NDC_ENDPOINT = f"{OPENFDA_BASE}/ndc.json"

# LOINC codes mapped to DrugEntry fields
LOINC_MAP = {
    "indications_and_usage": "indications",
    "contraindications": "contraindications",
    "adverse_reactions": "serious_side_effects",
    "drug_interactions": "drug_interactions",
    "dosage_and_administration": "adult_dose",
    "pregnancy": "pregnancy",
    "boxed_warning": "boxed_warning",
    "warnings_and_cautions": "warnings",
    "geriatric_use": "geriatric_dose",
    "pediatric_use": "pediatric_dose",
    "mechanism_of_action": "mechanism_of_action",
    "pharmacodynamics": "pharmacodynamics",
    "pharmacokinetics": "pharmacokinetics",
    "description": "drug_class",
    "patient_medication_information": "patient_instructions",
    "storage_and_handling": "storage_instructions",
}


class OpenFDASource(AbstractDrugSource):
    """OpenFDA drug label data source."""

    @property
    def source_name(self) -> str:
        return "openfda"

    @retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=1, max=5))
    def search_by_name(self, name: str) -> dict[str, Any] | None:
        # First try label endpoint (richest data)
        result = self._search_label(name)
        if result:
            return result
        # Fallback to NDC for basic identity
        result = self._search_ndc(name)
        if result:
            return result
        return None

    def _search_label(self, name: str) -> dict[str, Any] | None:
        """Search the /drug/label.json endpoint. Returns parsed label data or None."""
        try:
            params = {"search": f"generic_name:{name}", "limit": 1}
            with httpx.Client(timeout=15.0) as client:
                resp = client.get(LABEL_ENDPOINT, params=params)
            if resp.status_code != 200:
                # Try brand name
                params = {"search": f"brand_name:{name}", "limit": 1}
                with httpx.Client(timeout=15.0) as client:
                    resp = client.get(LABEL_ENDPOINT, params=params)
            if resp.status_code != 200:
                return None

            data = resp.json()
            results = data.get("results", [])
            if not results:
                return None

            return self._parse_label(results[0])
        except Exception as e:
            logger.warning(f"OpenFDA label search failed for {name}: {e}")
            return None

    def _parse_label(self, label: dict) -> dict[str, Any]:
        """Parse a single OpenFDA label result into DrugEntry fields."""
        result: dict[str, Any] = {}
        effective_time = label.get("effective_time", [])
        openfda = label.get("openfda", {})

        # Identity from openfda sub-object
        if openfda:
            brand_names = openfda.get("brand_name", [])
            if brand_names:
                result["brand_names"] = brand_names
            generic_names = openfda.get("generic_name", [])
            if generic_names:
                result["generic_name"] = generic_names[0]
            result["rxcui"] = (openfda.get("rxcui", [None]) or [None])[0]
            # We can't store List[str] here, just take first for uniqueness
            unii_list = openfda.get("unii", [])
            if unii_list:
                result["unii"] = unii_list[0]

        # Extract sections from effective_time array
        for entry in effective_time:
            if isinstance(entry, dict):
                for section_key, field_name in LOINC_MAP.items():
                    raw = entry.get(section_key)
                    if raw:
                        text = self._join_text(raw)
                        if text and not result.get(field_name):
                            result[field_name] = text

        # Also check top-level keys (older format fallback)
        for section_key, field_name in LOINC_MAP.items():
            raw = label.get(section_key)
            if raw:
                text = self._join_text(raw)
                if text and not result.get(field_name):
                    result[field_name] = text

        return result

    def _search_ndc(self, name: str) -> dict[str, Any] | None:
        """Search NDC endpoint for basic identity info when label fails."""
        try:
            params = {"search": f"generic_name:{name}", "limit": 1}
            with httpx.Client(timeout=10.0) as client:
                resp = client.get(NDC_ENDPOINT, params=params)
            if resp.status_code != 200:
                params = {"search": f"brand_name:{name}", "limit": 1}
                with httpx.Client(timeout=10.0) as client:
                    resp = client.get(NDC_ENDPOINT, params=params)
            if resp.status_code != 200:
                return None
            data = resp.json()
            results = data.get("results", [])
            if not results:
                return None
            record = results[0]
            result: dict = {}
            if record.get("generic_name"):
                result["generic_name"] = record["generic_name"]
            if record.get("brand_name"):
                result["brand_name"] = record["brand_name"]
            if record.get("brand_name"):
                result["brand_names"] = [record["brand_name"]]
            return result
        except Exception as e:
            logger.warning(f"OpenFDA NDC search failed for {name}: {e}")
            return None

    @staticmethod
    def _join_text(raw) -> str | None:
        """Join a list/single string from FDA JSON to a clean string."""
        if isinstance(raw, list):
            text = " ".join(str(r) for r in raw if r).strip()
            return text if text else None
        if isinstance(raw, str):
            return raw.strip() if raw.strip() else None
        return None
