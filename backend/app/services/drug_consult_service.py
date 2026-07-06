import json
import logging
import hashlib
from datetime import datetime
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.infrastructure.ai_provider_service import AIProviderService
from app.infrastructure.embedding_service import embedding_service
from app.infrastructure.vector_store import vector_store
from app.models.ai_cache import AICache
from app.models.drug_database import DrugEntry, DrugInteraction
from app.services.drug_service import DrugService, SERIALIZABLE_FIELDS

logger = logging.getLogger("drug_consult_service")

CACHE_TTL_DAYS = 7

INTENTS = [
    "drug_explanation", "drug_comparison", "drug_interaction",
    "pregnancy_safety", "monitoring", "mechanism",
    "side_effects", "contraindications", "patient_counseling",
    "dosage", "general",
]

SYSTEM_PROMPT = """You are an expert clinical pharmacology AI assistant. Your role is to provide evidence-based medication information.

ALWAYS respond in valid JSON with this structure:
{
  "title": "Brief answer title",
  "summary": "2-3 sentence summary answering the user's question directly",
  "sections": [
    { "heading": "Section Name", "content": "Detailed markdown content" }
  ],
  "references": ["Source name 1", "Source name 2"],
  "confidence": "high" | "moderate" | "low",
  "follow_up_questions": ["Question 1?", "Question 2?", "Question 3?"],
  "sources_used": ["DailyMed", "OpenFDA", "Goodman & Gilman", etc]
}

RULES:
- Ground every answer in the provided context. Never invent facts.
- If the context lacks information for a question, say so clearly.
- Use markdown for formatting (bold, lists, etc).
- Keep sections focused and clinically precise.
- For patient-friendly mode: use simple language, avoid jargon, explain medical terms.
- For professional mode: use clinical terminology, cite mechanisms and evidence levels.
- Always include at least 3 follow-up questions.
- Always list the actual sources used."""


class DrugConsultService:
    def __init__(self, db: Session):
        self.db = db
        self.drug_service = DrugService(db)
        self.ai_provider = AIProviderService(db)

    def consult(
        self,
        question: str,
        patient_mode: bool = False,
    ) -> dict:
        context_parts = []
        sources_used = set()

        drug_names = self._extract_drugs(question)

        for name in drug_names:
            db_results = self.drug_service.search_drug(name)
            if db_results:
                drug = db_results[0]
                present = {k: v for k, v in drug.items() if v is not None and v != [] and v != {}}
                if present:
                    context_parts.append(f"Drug record ({name}):\n{json.dumps(present, indent=2, default=str)}")
                    sources_used.update(["DailyMed", "OpenFDA", "RxNorm"])

            if len(drug_names) >= 2:
                interactions = self.drug_service.get_interactions(drug_names)
                if interactions:
                    context_parts.append(f"Drug interactions:\n{json.dumps(interactions, indent=2)}")
                    sources_used.add("DrugBank")

        try:
            from app.domain.medical_library.retriever import search as lib_search
            lib_results = lib_search(question, top_k=5, use_hybrid=False)
            if lib_results:
                chunks = []
                for r in lib_results:
                    text = r.get("text", "")
                    if text and len(text) > 20:
                        source = r.get("source_book", "") or r.get("collection", "textbook")
                        chunks.append(f"[{source}] {text[:1000]}")
                        if source:
                            sources_used.add(source)
                if chunks:
                    context_parts.append("Medical textbook references:\n" + "\n\n".join(chunks[:5]))
        except Exception as e:
            logger.warning(f"Medical library search unavailable: {e}")

        try:
            query_emb = embedding_service.embed(question)
            vec_results = vector_store.search(query_emb, top_k=3)
            for r in vec_results:
                payload = r.get("payload", {})
                gn = payload.get("generic_name", "")
                if gn and gn.lower() not in [d.lower() for d in drug_names]:
                    fields = {k: v for k, v in payload.items() if v and k != "type"}
                    context_parts.append(f"Related drug ({gn}):\n{json.dumps(fields, indent=2)}")
        except Exception as e:
            logger.warning(f"Vector search failed: {e}")

        unified_context = "\n\n".join(context_parts) if context_parts else "No specific drug data found in the database."
        sources_list = sorted(sources_used) if sources_used else ["General medical knowledge"]

        mode_instruction = (
            "Use simple, patient-friendly language. Explain medical terms in plain English. Avoid jargon."
            if patient_mode
            else "Use clinical terminology. Be precise and evidence-based."
        )

        user_prompt = (
            f"QUESTION: {question}\n\n"
            f"RETRIEVED CONTEXT:\n{unified_context}\n\n"
            f"Style: {mode_instruction}\n\n"
            f"Respond in JSON format as specified."
        )

        result = self.ai_provider.generate_structured(
            user_prompt,
            system_instruction=SYSTEM_PROMPT,
        )

        if not result or not isinstance(result, dict) or result.get("success") is False:
            result = self._fallback_response(question, drug_names)

        result.setdefault("title", "AI Drug Consultation")
        result.setdefault("summary", "Analysis completed based on available data.")
        result.setdefault("sections", [])
        result.setdefault("references", sources_list)
        result.setdefault("confidence", "moderate")
        result.setdefault("follow_up_questions", [])
        result["sources_used"] = sources_list
        result["patient_mode"] = patient_mode
        result["timestamp"] = datetime.utcnow().isoformat()

        return result

    def generate_drug_answer(self, drug_name: str, skip_local_search: bool = False) -> dict:
        context_parts = []
        sources_used = set()

        drug_fields: dict[str, Any] = {}
        if not skip_local_search:
            db_results = self.drug_service.search_drug(drug_name)
            if db_results:
                drug_fields = db_results[0]
                present = {k: v for k, v in drug_fields.items() if v is not None and v != [] and v != {}}
                if present:
                    context_parts.append(f"Structured drug record:\n{json.dumps(present, indent=2, default=str)}")
                    sources_used.update(["DailyMed", "OpenFDA", "RxNorm"])

        try:
            from app.domain.medical_library.retriever import search as lib_search
            lib_results = lib_search(f"{drug_name} clinical pharmacology indications dosage mechanism side effects", top_k=8, use_hybrid=False)
            if lib_results:
                textbook_texts = []
                for r in lib_results:
                    text = r.get("text", "")
                    if text and len(text) > 50:
                        source = r.get("source_book", "") or r.get("collection", "textbook")
                        if source and source not in sources_used:
                            sources_used.add(source)
                        textbook_texts.append(text)
                if textbook_texts:
                    context_parts.append("Reference material:\n" + "\n\n".join(textbook_texts[:5]))
        except Exception as e:
            logger.warning(f"Library search unavailable: {e}")

        if not skip_local_search:
            try:
                query_emb = embedding_service.embed(f"{drug_name} pharmacology dosage")
                vec_results = vector_store.search(query_emb, top_k=3)
                for r in vec_results:
                    payload = r.get("payload", {})
                    gn = payload.get("generic_name", "")
                    if gn and gn.lower() != drug_name.lower():
                        fields = {k: v for k, v in payload.items() if v and k not in ("type",)}
                        context_parts.append(f"Related drug ({gn}):\n{json.dumps(fields, indent=2)}")
            except Exception as e:
                logger.warning(f"Vector search failed: {e}")

        has_structured_data = any(
            drug_fields.get(f) for f in [
                "indications", "adult_dose", "contraindications",
                "common_side_effects", "mechanism_of_action", "warnings",
            ]
        )

        unified_context = "\n\n".join(context_parts) if context_parts else ""
        sources_list = sorted(sources_used) if sources_used else ["Medical knowledge base"]

        system_prompt = (
            "You are an expert clinical pharmacology AI assistant. "
            "Your task is to write a comprehensive, polished drug monograph in Markdown.\n\n"
            "RULES:\n"
            "- Synthesize ALL retrieved information into one coherent answer.\n"
            "- Organize the content into clear sections using Markdown headings.\n"
            "- Remove duplicates and ignore irrelevant material.\n"
            "- Ignore pharmacokinetic tables, appendix tables, OCR artifacts, and raw embedding output.\n"
            "- Extract only useful clinical information.\n"
            "- NEVER mention retrieval details, confidence scores, or internal pipeline metadata.\n"
            "- NEVER say 'low confidence', 'verified', 'hybrid', 'textbook chunks', or 'AI generated'.\n"
            "- If little or no verified data is available, answer using your own medical knowledge.\n"
            "- The user must never notice a fallback.\n"
            "- Always end with a ## References section listing only trusted source names.\n"
            "  Example: DailyMed, OpenFDA, Goodman & Gilman, Merck Manual, Harrison's Principles of Internal Medicine.\n"
            "- Do NOT include raw textbook pages, OCR output, chunk text, or retrieval metadata.\n\n"
            "OUTPUT FORMAT: Pure Markdown. No JSON wrapper. No code fences around the answer.\n\n"
            "Example structure:\n"
            "# Drug Name\n\n"
            "## Overview\n\n"
            "...\n\n"
            "## Common Uses\n\n"
            "...\n\n"
            "## Adult Dosage\n\n"
            "...\n\n"
            "## Side Effects\n\n"
            "...\n\n"
            "## Warnings\n\n"
            "...\n\n"
            "## Drug Interactions\n\n"
            "...\n\n"
            "## Key Takeaways\n\n"
            "...\n\n"
            "## References\n\n"
            "- DailyMed\n- OpenFDA\n"
        )

        user_prompt = (
            f"DRUG: {drug_name}\n\n"
            f"CONTEXT:\n{unified_context}\n\n"
            f"Write a complete drug monograph in Markdown following the instructions above."
        )

        cache_key = f"drug_answer:::{drug_name.lower().strip()}"
        cache_key_hash = hashlib.sha256(cache_key.encode()).hexdigest()
        cached = self.db.query(AICache).filter(
            AICache.cache_key == cache_key_hash,
            AICache.request_type == "drug_answer",
        ).first()
        if cached:
            try:
                data = json.loads(cached.response_data)
                logger.info(f"Cache hit for drug answer: {drug_name}")
                return data
            except Exception:
                pass

        markdown = self.ai_provider.generate_response(
            user_prompt,
            system_instruction=system_prompt,
            temperature=0.3,
        )

        result = {
            "drug_name": drug_name,
            "markdown": markdown,
            "references": sources_list,
            "timestamp": datetime.utcnow().isoformat(),
        }

        try:
            entry = AICache(
                cache_key=cache_key_hash,
                request_type="drug_answer",
                prompt=f"Drug answer: {drug_name}",
                provider="openrouter",
                response_data=json.dumps(result),
            )
            self.db.add(entry)
            self.db.commit()
        except Exception:
            self.db.rollback()

        return result

    def _extract_drugs(self, question: str) -> list[str]:
        known_drugs = [
            "metformin", "lisinopril", "atorvastatin", "warfarin", "digoxin",
            "ibuprofen", "amoxicillin", "azithromycin", "omeprazole", "levothyroxine",
            "amlodipine", "losartan", "albuterol", "metoprolol", "prednisone",
            "hydrochlorothiazide", "simvastatin", "rosuvastatin", "furosemide",
            "clopidogrel", "rivaroxaban", "apixaban", "insulin", "fentanyl",
            "morphine", "codeine", "tramadol", "gabapentin", "pregabalin",
            "fluoxetine", "sertraline", "escitalopram", "citalopram",
            "venlafaxine", "duloxetine", "bupropion", "mirtazapine",
            "acetaminophen", "naproxen", "celecoxib", "prednisolone",
            "spironolactone", "carvedilol", "diltiazem",
            "verapamil", "heparin", "enoxaparin", "nitroglycerin",
        ]
        ql = question.lower()
        found = []
        for d in known_drugs:
            if d in ql:
                found.append(d)
        if not found:
            for entry in self.db.query(DrugEntry).all():
                gn = (entry.generic_name or "").lower()
                if gn and gn in ql:
                    found.append(gn)
                    break
        return found

    def _fallback_response(self, question: str, drug_names: list[str]) -> dict:
        return {
            "title": f"About {drug_names[0].title()}" if drug_names else question,
            "summary": "Information retrieved from the drug database. For a more detailed analysis powered by AI, please try again.",
            "sections": [
                {
                    "heading": "Available Information",
                    "content": "The drug database contains basic medication records. AI-powered detailed analysis requires an active LLM connection.",
                }
            ],
            "references": ["Drug Database"],
            "confidence": "moderate",
            "follow_up_questions": [
                f"What are the side effects of {drug_names[0].title()}?" if drug_names else "Try asking about a specific medication.",
                f"Can I take {drug_names[0].title()} with other medications?" if drug_names else "What medications are you interested in?",
                f"How should {drug_names[0].title()} be monitored?" if drug_names else "Search for a drug by name.",
            ],
            "sources_used": ["Drug Database"],
        }
