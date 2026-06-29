import json
import os
from typing import Optional

import httpx
from sqlalchemy.orm import Session
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings
from app.models.drug_database import DrugEntry
from app.infrastructure.embedding_service import embedding_service
from app.infrastructure.vector_store import vector_store


OPENFDA_BASE = "https://api.fda.gov/drug"


class DrugService:
    def __init__(self, db: Session):
        self.db = db
        self.client = httpx.Client(timeout=30.0)

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    def search_openfda(self, drug_name: str) -> dict:
        for endpoint in ["ndc", "label", "event"]:
            try:
                url = f"{OPENFDA_BASE}/{endpoint}.json"
                params = {"search": f"generic_name:{drug_name}", "limit": 1}
                resp = self.client.get(url, params=params)
                if resp.status_code == 200:
                    data = resp.json()
                    if data.get("results"):
                        return self._parse_fda_result(data["results"][0], endpoint)
            except Exception:
                continue

        try:
            url = f"{OPENFDA_BASE}/ndc.json"
            params = {"search": f"brand_name:{drug_name}", "limit": 1}
            resp = self.client.get(url, params=params)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("results"):
                    return self._parse_fda_result(data["results"][0], "ndc")
        except Exception:
            pass

        return {}

    def _parse_fda_result(self, result: dict, endpoint: str) -> dict:
        parsed = {
            "brand_name": None,
            "generic_name": None,
            "drug_class": None,
        }
        if "brand_name" in result:
            parsed["brand_name"] = result.get("brand_name")
        if "generic_name" in result:
            parsed["generic_name"] = result.get("generic_name")
        if endpoint == "label":
            parsed["indications"] = self._extract_section(result, "34067-4")
            parsed["contraindications"] = self._extract_section(result, "34070-8")
            parsed["side_effects"] = self._extract_section(result, "34084-9")
            parsed["dosage_info"] = self._extract_section(result, "42227-1")
            parsed["pregnancy_category"] = self._extract_section(result, "51945-4")
            interactions_text = self._extract_section(result, "34073-2")
            if interactions_text:
                parsed["interactions"] = interactions_text
        return parsed

    def _extract_section(self, label_data: dict, section_code: str) -> Optional[str]:
        try:
            for section in label_data.get("effective_time", []):
                pass
            for key in ["indications_and_usage", "drug_interactions", "adverse_reactions",
                        "contraindications", "dosage_and_administration", "pregnancy",
                        "boxed_warning", "warnings", "description"]:
                if key in label_data:
                    val = label_data[key]
                    if isinstance(val, list):
                        return " ".join(val)
                    return str(val)
        except Exception:
            pass
        return None

    def store_drug(self, drug_data: dict):
        generic_name = drug_data.get("generic_name")
        if not generic_name:
            return None

        existing = (
            self.db.query(DrugEntry)
            .filter(DrugEntry.generic_name == generic_name)
            .first()
        )
        if existing:
            return existing

        text_for_embedding = self._build_drug_text(drug_data)
        embedding_data = embedding_service.embed_document(text_for_embedding)
        embedding_id = f"drug_{generic_name.lower().replace(' ', '_')}"

        entry = DrugEntry(
            brand_name=drug_data.get("brand_name"),
            generic_name=generic_name,
            drug_class=drug_data.get("drug_class"),
            indications=drug_data.get("indications"),
            contraindications=drug_data.get("contraindications"),
            side_effects=drug_data.get("side_effects"),
            dosage_info=drug_data.get("dosage_info"),
            interactions=drug_data.get("interactions"),
            pregnancy_category=drug_data.get("pregnancy_category"),
            embedding_id=embedding_id,
        )
        self.db.add(entry)
        self.db.flush()

        vector_store.upsert(
            embedding_id=embedding_id,
            embedding=embedding_data["embedding"],
            payload={
                "type": "drug",
                "generic_name": generic_name,
                "brand_name": drug_data.get("brand_name"),
            },
        )
        self.db.commit()
        return entry

    def search_drug(self, query: str) -> list[dict]:
        direct = (
            self.db.query(DrugEntry)
            .filter(
                (DrugEntry.generic_name.ilike(f"%{query}%")) |
                (DrugEntry.brand_name.ilike(f"%{query}%"))
            )
            .limit(5)
            .all()
        )
        if direct:
            return [
                {
                    "generic_name": d.generic_name,
                    "brand_name": d.brand_name,
                    "drug_class": d.drug_class,
                    "indications": d.indications,
                    "contraindications": d.contraindications,
                    "side_effects": d.side_effects,
                    "dosage_info": d.dosage_info,
                    "interactions": d.interactions,
                }
                for d in direct
            ]

        query_emb = embedding_service.embed(query)
        results = vector_store.search(query_emb, top_k=3)
        enriched = []
        for r in results:
            if r["payload"].get("type") == "drug":
                entry = (
                    self.db.query(DrugEntry)
                    .filter(DrugEntry.embedding_id == r["id"])
                    .first()
                )
                if entry:
                    enriched.append({
                        "generic_name": entry.generic_name,
                        "brand_name": entry.brand_name,
                        "drug_class": entry.drug_class,
                        "indications": entry.indications,
                        "contraindications": entry.contraindications,
                        "side_effects": entry.side_effects,
                        "dosage_info": entry.dosage_info,
                        "interactions": entry.interactions,
                        "score": r["score"],
                    })
        return enriched

    def count(self) -> int:
        return self.db.query(DrugEntry).count()

    def _build_drug_text(self, drug_data: dict) -> str:
        parts = []
        if drug_data.get("generic_name"):
            parts.append(f"Drug: {drug_data['generic_name']}")
        if drug_data.get("brand_name"):
            parts.append(f"Brand: {drug_data['brand_name']}")
        if drug_data.get("drug_class"):
            parts.append(f"Class: {drug_data['drug_class']}")
        if drug_data.get("indications"):
            parts.append(f"Indications: {drug_data['indications']}")
        if drug_data.get("contraindications"):
            parts.append(f"Contraindications: {drug_data['contraindications']}")
        if drug_data.get("side_effects"):
            parts.append(f"Side Effects: {drug_data['side_effects']}")
        if drug_data.get("dosage_info"):
            parts.append(f"Dosage: {drug_data['dosage_info']}")
        if drug_data.get("interactions"):
            parts.append(f"Interactions: {drug_data['interactions']}")
        return "\n\n".join(parts)
