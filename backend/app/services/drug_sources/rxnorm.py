import logging
from typing import Any

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from app.services.drug_sources.base import AbstractDrugSource

logger = logging.getLogger("drug_sources.rxnorm")

RXNORM_BASE = "https://rxnav.nlm.nih.gov/REST"


class RxNormSource(AbstractDrugSource):
    """RxNorm — NIH medication terminology source.
    Provides RxCUI, brand/generic names, dose forms, strengths.
    """

    @property
    def source_name(self) -> str:
        return "rxnorm"

    @retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=1, max=5))
    def search_by_name(self, name: str) -> dict[str, Any] | None:
        # Get RxCUI
        rxcui = self._get_rxcui(name)
        if not rxcui:
            return None
        return self.search_by_rxcui(rxcui)

    def search_by_rxcui(self, rxcui: str) -> dict[str, Any] | None:
        result: dict[str, Any] = {}
        result["rxnorm_id"] = rxcui

        try:
            # Get drug details
            with httpx.Client(timeout=10.0) as client:
                resp = client.get(f"{RXNORM_BASE}/drugs?name={rxcui}")
            if resp.status_code == 200:
                data = resp.json()
                concepts = (data.get("drugGroup", {}) or {}).get("conceptGroup", [])
                for group in concepts:
                    props = group.get("conceptProperties", [])
                    for prop in props:
                        if prop.get("rxcui") == rxcui:
                            if prop.get("name"):
                                result["generic_name"] = prop["name"]
                            if prop.get("synonym"):
                                result["brand_name"] = prop["synonym"]
                            break

            # Get brand names
            with httpx.Client(timeout=10.0) as client:
                resp = client.get(f"{RXNORM_BASE}/rxcui/{rxcui}/allrelated")
            if resp.status_code == 200:
                data = resp.json()
                concepts = (data.get("allRelatedGroup", {}) or {}).get("conceptGroup", [])
                brands = []
                for group in concepts:
                    if group.get("tty") == "BN":
                        for prop in group.get("conceptProperties", []):
                            if prop.get("name"):
                                brands.append(prop["name"])
                if brands:
                    result["brand_names"] = brands

            # Get dose forms and strengths via RxTerms
            with httpx.Client(timeout=10.0) as client:
                resp = client.get(f"{RXNORM_BASE}/RxTerms/rxcui/{rxcui}/allinfo")
            if resp.status_code == 200:
                data = resp.json()
                rxterms = data.get("rxtermsProperties", {})
                if rxterms:
                    if rxterms.get("fullName") and not result.get("generic_name"):
                        result["generic_name"] = rxterms["fullName"]
                    dose_forms = []
                    if rxterms.get("doseFormName"):
                        dose_forms.append(rxterms["doseFormName"])
                    if dose_forms:
                        result["dose_forms"] = dose_forms
                    if rxterms.get("strength"):
                        result["available_strengths"] = [rxterms["strength"]]

        except Exception as e:
            logger.warning(f"RxNorm detail fetch failed for {rxcui}: {e}")

        return result if result.get("generic_name") else None

    def _get_rxcui(self, name: str) -> str | None:
        """Look up RxCUI by drug name."""
        try:
            with httpx.Client(timeout=10.0) as client:
                resp = client.get(f"{RXNORM_BASE}/rxcui.json?name={name}")
            if resp.status_code != 200:
                return None
            data = resp.json()
            return (data.get("idGroup", {}) or {}).get("rxcui", [None])[0]
        except Exception as e:
            logger.warning(f"RxNorm lookup failed for {name}: {e}")
            return None
