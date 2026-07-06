import hashlib
import json
import logging
from datetime import datetime
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.infrastructure.ai_provider_service import AIProviderService
from app.infrastructure.embedding_service import embedding_service
from app.infrastructure.vector_store import vector_store
from app.models.ai_cache import AICache
from app.models.drug_database import DrugEntry
from app.schemas.drug_hybrid import Confidence, DrugHybridResponse, DrugResponseMetadata, SourceType
from app.services.drug_service import DrugService, SERIALIZABLE_FIELDS

logger = logging.getLogger("hybrid_drug_service")

# Fields considered clinically critical for confidence scoring
CRITICAL_FIELDS = [
    "indications",
    "contraindications",
    "adult_dose",
    "mechanism_of_action",
    "common_side_effects",
    "drug_interactions",
    "warnings",
    "pregnancy",
    "patient_instructions",
    "boxed_warning",
    "breastfeeding",
    "half_life",
    "pharmacokinetics",
    "administration",
    "toxicity",
]

# Fields too technical or sensitive to let the LLM generate
LLM_BLOCKED_FIELDS = {"boxed_warning", "contraindications", "toxicity", "antidote"}

HYBRID_CACHE_TTL_DAYS = 7


class HybridDrugService:
    def __init__(self, db: Session):
        self.db = db
        self.drug_service = DrugService(db)
        self.ai_provider = AIProviderService(db)

    def hybrid_retrieve(self, drug_name: str) -> DrugHybridResponse:
        verified: dict[str, Any] = {}
        vector_chunks: list[dict] = []
        verified_sections: list[str] = []
        vector_sections: list[str] = []
        generated_sections: list[str] = []
        vector_sources: list[str] = []
        all_fields: dict[str, Any] = {}
        source_count = 0
        ai_model_used: Optional[str] = None

        # ── Stage 1: PostgreSQL structured lookup ──
        db_results = self.drug_service.search_drug(drug_name)
        if db_results:
            verified = db_results[0]
            all_fields.update(verified)
            for field in CRITICAL_FIELDS:
                if verified.get(field):
                    verified_sections.append(field)
            source_count = len([k for k, v in verified.items() if v is not None])

        # Determine which critical fields are missing
        present = {f for f in CRITICAL_FIELDS if all_fields.get(f)}
        missing = [f for f in CRITICAL_FIELDS if f not in present]

        # ── Stage 2: Vector textbook retrieval (gracefully degrades) ──
        if missing:
            try:
                vector_chunks = self._search_textbooks(drug_name, missing)
                if vector_chunks:
                    for chunk in vector_chunks:
                        src = chunk.get("payload", {}).get("source_type") or chunk.get("payload", {}).get("source_book", "textbook")
                        if src not in vector_sources:
                            vector_sources.append(src)
                    merged = self._merge_vector_into_fields(all_fields, vector_chunks)
                    for field in missing:
                        if merged.get(field) and not all_fields.get(field):
                            all_fields[field] = merged[field]
                            vector_sections.append(field)
                    # Recompute missing after vector merge
                    present = {f for f in CRITICAL_FIELDS if all_fields.get(f)}
                    missing = [f for f in CRITICAL_FIELDS if f not in present]
            except Exception as e:
                logger.warning(f"Vector textbook search failed for {drug_name}: {e}")

        # ── Decide source type before LLM stage ──
        coverage = len(present) / len(CRITICAL_FIELDS) if CRITICAL_FIELDS else 0

        if coverage >= 0.8 and not missing:
            confidence = Confidence.HIGH
            source_type = SourceType.VERIFIED
        elif coverage >= 0.5:
            confidence = Confidence.MEDIUM
            source_type = SourceType.HYBRID if vector_sections else SourceType.VERIFIED
        else:
            confidence = Confidence.MEDIUM
            source_type = SourceType.HYBRID if vector_sections else SourceType.AI_GENERATED

        # ── Stage 3: LLM gap-filling ──
        if missing:
            llm_allowed = [f for f in missing if f not in LLM_BLOCKED_FIELDS]
            if llm_allowed:
                generated = self._llm_generate_fields(
                    drug_name=drug_name,
                    verified_fields=all_fields,
                    missing_fields=llm_allowed,
                )
                if generated:
                    for field in llm_allowed:
                        val = generated.get(field)
                        if val and isinstance(val, str) and len(val.strip()) > 5:
                            all_fields[field] = val
                            generated_sections.append(field)
                            confidence = Confidence.LOW
                            source_type = SourceType.AI_GENERATED

            # Recompute final coverage
            present = {f for f in CRITICAL_FIELDS if all_fields.get(f)}
            missing_after_llm = [f for f in CRITICAL_FIELDS if f not in present]
            if missing_after_llm:
                logger.info(f"Still missing after all stages: {missing_after_llm}")

        # ── Build final response ──
        final_fields = {}
        for field in SERIALIZABLE_FIELDS:
            val = all_fields.get(field)
            if val is not None:
                final_fields[field] = val

        if not final_fields.get("generic_name"):
            final_fields["generic_name"] = drug_name

        metadata = DrugResponseMetadata(
            source_type=source_type,
            confidence=confidence,
            verified_sections=sorted(set(verified_sections)),
            vector_sections=sorted(set(vector_sections)),
            generated_sections=sorted(set(generated_sections)),
            vector_sources=sorted(set(vector_sources)),
            ai_model=ai_model_used,
            cached=False,
            source_count=source_count,
            timestamp=datetime.utcnow(),
        )

        return DrugHybridResponse(drug=final_fields, metadata=metadata)

    def _search_textbooks(self, drug_name: str, missing_fields: list[str]) -> list[dict]:
        chunks: list[dict] = []

        # Try medical library textbook search
        try:
            from app.domain.medical_library.retriever import search as lib_search

            query = f"{drug_name} {' '.join(missing_fields)}"
            lib_results = lib_search(query, top_k=5, use_hybrid=False)
            if lib_results:
                chunks.extend(
                    {
                        "id": None,
                        "score": r.get("score", 0),
                        "payload": {
                            "text": r.get("text", ""),
                            "source_book": r.get("source_book", ""),
                            "chapter": r.get("chapter", ""),
                            "section": r.get("section", ""),
                            "source_type": r.get("collection", "textbook"),
                        },
                        "source": "medical_library",
                    }
                    for r in lib_results
                )
                logger.info(f"Medical library returned {len(lib_results)} chunks for {drug_name}")
        except Exception as e:
            logger.warning(f"Medical library search unavailable: {e}")

        # Also search the cloud drug vector store for similar drug entries
        try:
            query_emb = embedding_service.embed(f"{drug_name} clinical pharmacology indications dosage")
            drug_results = vector_store.search(
                query_emb,
                top_k=3,
                payload_filter={"type": "drug"} if hasattr(vector_store, "search") else None,
            )
            for r in drug_results:
                payload = r.get("payload", {})
                if payload.get("generic_name", "").lower() != drug_name.lower():
                    chunks.append({
                        "id": r["id"],
                        "score": r["score"] * 0.85,
                        "payload": {
                            "text": payload.get("generic_name", ""),
                            "generic_name": payload.get("generic_name", ""),
                            "source_type": "drug_vector",
                            "section": "related_drug",
                        },
                        "source": "drug_vector",
                    })
        except Exception as e:
            logger.warning(f"Drug vector search failed: {e}")

        chunks.sort(key=lambda c: c.get("score", 0), reverse=True)
        return chunks

    def _merge_vector_into_fields(self, fields: dict, chunks: list[dict]) -> dict:
        result: dict[str, Any] = {}
        section_map = {
            "indications": ["indication", "uses", "usage", "INDICATIONS AND USAGE"],
            "contraindications": ["contraindication", "CONTRAINDICATIONS"],
            "adult_dose": ["dosage", "dose", "administration", "DOSAGE AND ADMINISTRATION"],
            "mechanism_of_action": ["mechanism", "action", "MECHANISM OF ACTION"],
            "pharmacodynamics": ["pharmacodynamic", "PHARMACODYNAMICS"],
            "pharmacokinetics": ["pharmacokinetic", "PHARMACOKINETICS", "half-life", "half_life"],
            "half_life": ["half-life", "half_life", "elimination"],
            "common_side_effects": ["side effect", "adverse", "ADVERSE REACTIONS", "common"],
            "drug_interactions": ["interaction", "DRUG INTERACTIONS"],
            "warnings": ["warning", "precaution", "WARNINGS"],
            "pregnancy": ["pregnancy", "lactation", "PREGNANCY", "teratogenic"],
            "patient_instructions": ["counseling", "instruction", "information for patients", "PATIENT COUNSELING"],
            "administration": ["administration", "how supplied", "ADMINISTRATION"],
            "storage_instructions": ["storage", "handling", "STORAGE"],
            "toxicity": ["toxicity", "overdose", "OVERDOSAGE", "poisoning"],
        }

        for chunk in chunks:
            payload = chunk.get("payload", {})
            chunk_text = (payload.get("text") or payload.get("content") or "").lower()
            section_name = (payload.get("section") or payload.get("section_name") or "").lower()
            title = (payload.get("title") or "").lower()
            source_book = (payload.get("source_book") or "").lower()
            search_text = f"{section_name} {title} {source_book} {chunk_text}"

            for field, keywords in section_map.items():
                if fields.get(field):
                    continue
                if any(kw.lower() in search_text for kw in keywords) or any(kw.lower() in chunk_text for kw in keywords):
                    raw = payload.get("text") or payload.get("content") or ""
                    if raw and len(raw) > 20:
                        existing = result.get(field)
                        if existing:
                            if len(raw) > len(existing):
                                result[field] = raw.strip()
                        else:
                            result[field] = raw.strip()

        return result

    def _llm_generate_fields(
        self,
        drug_name: str,
        verified_fields: dict,
        missing_fields: list[str],
    ) -> Optional[dict]:
        # Check cache first
        cache_key = self._cache_key(drug_name, missing_fields)
        cached = self._check_cache(cache_key)
        if cached is not None:
            logger.info(f"Cache hit for {drug_name} fields: {missing_fields}")
            return cached

        verified_clean = {k: v for k, v in verified_fields.items() if v is not None}

        system_prompt = (
            "You are a clinical pharmacology AI assistant. Your task is to generate "
            "accurate drug information for ONLY the missing sections listed. "
            "Never rewrite or rephrase the verified data provided. "
            "Respond with a JSON object containing ONLY the requested fields. "
            "Use standard medical references. Be concise but clinically precise."
        )

        user_prompt = (
            f"DRUG: {drug_name}\n\n"
            f"VERIFIED DATA (do not modify these fields):\n"
            f"{json.dumps(verified_clean, indent=2)}\n\n"
            f"Generate content ONLY for these missing sections:\n"
            f"{json.dumps(missing_fields)}\n\n"
            f"Respond with a JSON object with keys matching the missing sections listed above. "
            f"Each value should be 1-3 paragraphs of clinically accurate information."
        )

        result = self.ai_provider.generate_structured(user_prompt, system_instruction=system_prompt)
        if result and isinstance(result, dict):
            self._set_cache(cache_key, drug_name, missing_fields, result)
            return result
        return None

    def _cache_key(self, drug_name: str, missing_fields: list[str]) -> str:
        raw = f"drug_hybrid_gap_fill:::{drug_name.lower().strip()}:::{sorted(missing_fields)}"
        return hashlib.sha256(raw.encode()).hexdigest()

    def _check_cache(self, cache_key: str) -> Optional[dict]:
        entry = self.db.query(AICache).filter(
            AICache.cache_key == cache_key,
            AICache.request_type == "drug_hybrid_gap_fill",
        ).first()
        if entry:
            try:
                return json.loads(entry.response_data)
            except (json.JSONDecodeError, TypeError):
                return None
        return None

    def _set_cache(self, cache_key: str, drug_name: str, missing_fields: list[str], data: dict):
        try:
            existing = self.db.query(AICache).filter(AICache.cache_key == cache_key).first()
            if existing:
                return
            entry = AICache(
                cache_key=cache_key,
                request_type="drug_hybrid_gap_fill",
                prompt=f"Drug: {drug_name}, Missing: {missing_fields}",
                provider="openrouter",
                response_data=json.dumps(data),
            )
            self.db.add(entry)
            self.db.commit()
        except Exception:
            self.db.rollback()
