import logging
from typing import Any

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from app.services.drug_sources.base import AbstractDrugSource

logger = logging.getLogger("drug_sources.medlineplus")

MEDLINEPLUS_BASE = "https://medlineplus.gov/mplus/connect/service"


class MedlinePlusSource(AbstractDrugSource):
    """MedlinePlus — NIH consumer health information.
    Provides patient counseling, storage, missed dose, overdose info.
    """

    @property
    def source_name(self) -> str:
        return "medlineplus"

    @retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=1, max=5))
    def search_by_name(self, name: str) -> dict[str, Any] | None:
        try:
            # Search by drug name
            with httpx.Client(timeout=15.0) as client:
                resp = client.get(
                    f"{MEDLINEPLUS_BASE}/search",
                    params={"mainSearchCriteria_v.cs": "2.16.840.1.113883.6.69",  # RxNorm
                            "mainSearchCriteria_v.c": name},
                )
            if resp.status_code != 200:
                return None

            data = resp.json()
            result: dict[str, Any] = {}

            # Parse patient info sections
            entries = data.get("feed", {}).get("entry", [])
            for entry in entries:
                title = (entry.get("title", {}).get("_value", "") or "").lower()
                summary = entry.get("summary", {}).get("_value", "") or ""

                if not summary:
                    continue

                if "how to take" in title:
                    result["administration"] = summary
                elif "missed dose" in title:
                    result["missed_dose_instructions"] = summary
                elif "storage" in title:
                    if not result.get("storage_instructions"):
                        result["storage_instructions"] = summary
                elif "overdose" in title:
                    result["overdose_instructions"] = summary
                elif "before taking" in title or "precautions" in title:
                    text = result.get("patient_instructions", "") or ""
                    result["patient_instructions"] = (text + "\n" + summary).strip()
                elif "side effects" in title:
                    if not result.get("common_side_effects"):
                        result["common_side_effects"] = summary

            return result if result else None

        except Exception as e:
            logger.warning(f"MedlinePlus search failed for {name}: {e}")
            return None
