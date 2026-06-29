import logging
import re
from enum import Enum
from typing import Optional

from app.domain.medical_library import retriever

logger = logging.getLogger("medical_library")


class QueryIntent(str, Enum):
    SYMPTOM_TRIAGE = "symptom_triage"
    EDUCATIONAL = "educational"
    TREATMENT = "treatment"
    DRUG_INFO = "drug_info"
    GENERAL_MEDICAL = "general_medical"


SYMPTOM_PATTERNS = [
    re.compile(r"\b(i('ve| have)?|my|feeling|feels?|hurts?)\b", re.IGNORECASE),
    re.compile(r"\b(pain|ache|sore|burning|cramp|numb|tingl|swollen|itchy|dizzy"
               r"|fatigue|tired|weak|nausea|vomit|diarrhea|constipat|fever"
               r"|headache|cough|sneeze|rash|bloating|indigest|heartburn)\b", re.IGNORECASE),
    re.compile(r"\b(stomach|head|chest|back|joint|muscle|throat|ear|eye|skin"
               r"|leg|arm|foot|hand|neck|abdomen)\s+(pain|ache|hurt|pain)\b", re.IGNORECASE),
]

EDUCATIONAL_PATTERNS = [
    re.compile(r"^(what is|define|explain|tell me about|describe|what (are|does)"
               r"|how does|what causes)", re.IGNORECASE),
    re.compile(r"\bmeaning of\b", re.IGNORECASE),
    re.compile(r"\bdefinition\b", re.IGNORECASE),
]

TREATMENT_PATTERNS = [
    re.compile(r"\b(treat|therapy|management|cure|medication|drug|medicine"
               r"|tablet|pill|prescription|dosage|dose|injection)\b", re.IGNORECASE),
    re.compile(r"\bhow (to|do i|can i) (treat|manage|cure|handle|deal with)\b", re.IGNORECASE),
]

DRUG_NAME_SUFFIXES = (
    r"icin|ium|olol|pril|sartan|azepam|caine|navir|cycline"
    r"|mycin|prazole|tidine|statin|glita|glide|sone|mab|nib|vir"
    r"|prol|pine|zide|afil|oxacin|conazole|dipine|formin|lol"
    r"|cillin|vudine|pam|barbital|thiazide|terol|coxib|oxetine"
    r"|oprazole|tadine|conazole|qualone"
)

DRUG_PATTERNS = [
    re.compile(
        r"\b(what is|tell me about|side effects of|dosage of|interactions? of"
        r"|is\s+\w+\s+(?:a\s+)?drug)\s+\w+(?:" + DRUG_NAME_SUFFIXES + r")\b",
        re.IGNORECASE,
    ),
]


def classify_query_intent(query: str) -> QueryIntent:
    q = query.lower().strip()

    for p in DRUG_PATTERNS:
        if p.search(q):
            return QueryIntent.DRUG_INFO

    has_treatment = any(p.search(q) for p in TREATMENT_PATTERNS)
    has_educational = any(p.search(q) for p in EDUCATIONAL_PATTERNS)
    has_symptom = any(p.search(q) for p in SYMPTOM_PATTERNS)

    if has_treatment:
        return QueryIntent.TREATMENT
    if has_educational:
        return QueryIntent.EDUCATIONAL
    if has_symptom:
        return QueryIntent.SYMPTOM_TRIAGE

    return QueryIntent.GENERAL_MEDICAL


def _significant_overlap(a: str, b: str, threshold: float = 0.35) -> bool:
    if not a or not b:
        return False
    sentences_a = {s.strip().lower() for s in re.split(r'[.!?\n]', a) if len(s.strip()) > 20}
    sentences_b = {s.strip().lower() for s in re.split(r'[.!?\n]', b) if len(s.strip()) > 20}
    if not sentences_a or not sentences_b:
        return False
    overlap = len(sentences_a & sentences_b) / min(len(sentences_a), len(sentences_b))
    return overlap > threshold


def _text_fingerprint(text: str) -> str:
    t = re.sub(r'\s+', ' ', text.lower().strip())
    return t[:150]


def compress_context(results: list[dict]) -> tuple[list[str], list[str]]:
    groups: dict[str, list[dict]] = {}
    for r in results:
        key = f"{r.get('source_book', '')}|{r.get('chapter', '')}"
        groups.setdefault(key, []).append(r)

    merged_texts = []
    used_books = set()

    for key, group in groups.items():
        book = group[0].get("source_book", "")
        if book:
            used_books.add(book)
        group.sort(key=lambda x: x.get("hybrid_score", x.get("score", 0)), reverse=True)

        merged = group[0].get("text", "")
        for r in group[1:]:
            text = r.get("text", "")
            if not text or _significant_overlap(merged, text):
                continue
            merged += "\n\n" + text
        merged_texts.append(merged)

    seen = set()
    final_texts = []
    for text in merged_texts:
        fp = _text_fingerprint(text)
        if fp not in seen:
            seen.add(fp)
            final_texts.append(text)

    return final_texts, sorted(used_books)


def format_references(books: list[str]) -> str:
    seen = set()
    unique = []
    for b in books:
        clean = b.strip().rstrip('.')
        if clean and clean not in seen:
            seen.add(clean)
            unique.append(clean)
    if not unique:
        return ""
    return "\n\nReferences\n" + "\n".join(f"\u2022 {b}" for b in unique)


SYSTEM_PROMPT_CORE = (
    "You are Medico AI. You are an evidence-based medical assistant.\n\n"
    "You have access to trusted medical knowledge including Harrison's, Merck Manual, "
    "Oxford Handbook, Davidson, Goodman & Gilman, Current Medical Diagnosis & Treatment, "
    "and other medical references.\n\n"
    "Use these references only to verify your answers.\n"
    "Never mention the retrieval process.\n"
    "Never mention textbooks unless citing them briefly at the end.\n"
    "Never mention missing definitions. Interpret common patient language naturally.\n\n"
    "Always answer like an experienced physician. Never answer like a textbook.\n"
    "Never dump retrieved passages. Never quote multiple books separately.\n"
    "Summarize everything. If multiple sources agree, merge into one concise explanation."
)

SYMPTOM_EXTRA = (
    "\n\nFor symptom questions, structure your response as:\n"
    "- Brief summary\n"
    "- Most likely causes\n"
    "- Less common but serious causes\n"
    "- Home care advice (when appropriate)\n"
    "- Red flag symptoms requiring urgent medical attention\n"
    "- Follow-up questions to narrow the diagnosis\n\n"
    "If the question is vague, ask targeted follow-up questions instead of listing dozens of possibilities."
)

EDUCATIONAL_EXTRA = (
    "\n\nProvide a concise, clear explanation. Synthesize from multiple sources. "
    "Use analogies and plain language where helpful."
)

TREATMENT_EXTRA = (
    "\n\nStructure your response as:\n"
    "- First-line treatments\n"
    "- Second-line or alternative options\n"
    "- When to escalate care\n"
    "- Key precautions or contraindications"
)

DRUG_EXTRA = (
    "\n\nStructure your response as:\n"
    "- Drug class and mechanism of action\n"
    "- Indications\n"
    "- Common side effects\n"
    "- Key contraindications and interactions\n"
    "- Typical dosing (if relevant)"
)


def _get_system_prompt(intent: QueryIntent) -> str:
    base = SYSTEM_PROMPT_CORE
    if intent == QueryIntent.SYMPTOM_TRIAGE:
        return base + SYMPTOM_EXTRA
    if intent == QueryIntent.EDUCATIONAL:
        return base + EDUCATIONAL_EXTRA
    if intent == QueryIntent.TREATMENT:
        return base + TREATMENT_EXTRA
    if intent == QueryIntent.DRUG_INFO:
        return base + DRUG_EXTRA
    return base


def _build_user_prompt(query: str, context_texts: list[str], intent: QueryIntent) -> str:
    context_str = "\n\n".join(context_texts)
    context_str = context_str[:8000]

    intent_guidance = ""
    if intent == QueryIntent.SYMPTOM_TRIAGE:
        intent_guidance = (
            "The user is describing symptoms. Interpret their language clinically "
            "(e.g., \"stomach pain\" may refer to abdominal pain, epigastric pain, etc.). "
            "If the description is vague, ask targeted follow-up questions.\n\n"
        )
    elif intent == QueryIntent.EDUCATIONAL:
        intent_guidance = (
            "The user is asking for medical information. "
            "Provide a clear, accurate explanation.\n\n"
        )
    elif intent == QueryIntent.TREATMENT:
        intent_guidance = (
            "The user is asking about treatment options. "
            "Cover standard approaches based on available evidence.\n\n"
        )
    elif intent == QueryIntent.DRUG_INFO:
        intent_guidance = (
            "The user is asking about a medication. "
            "Provide drug information based on available references.\n\n"
        )

    return (
        f"{intent_guidance}"
        f"Answer the user's question clearly and conversationally.\n\n"
        f"User: {query}\n\n"
        f"Answer:"
    )


class AnswerGenerator:
    def __init__(self, db=None):
        self.db = db

    def _get_ai_provider(self):
        from app.infrastructure.ai_provider_service import AIProviderService
        return AIProviderService(db=self.db)

    def search_only(self, query: str, collection: Optional[str] = None, top_k: int = 5) -> dict:
        import time
        t0 = time.time()
        results = retriever.search(query, collection=collection, top_k=top_k)
        elapsed = round((time.time() - t0) * 1000)

        collection_counts = {}
        for r in results:
            c = r.get("collection", "unknown")
            collection_counts[c] = collection_counts.get(c, 0) + 1

        return {
            "answer": None,
            "mode": "search_only",
            "collection": collection,
            "results": results,
            "metrics": {
                "latency_ms": elapsed,
                "collection_searched": collection or "all",
                "chunks_retrieved": len(results),
                "collections_used": list(collection_counts.keys()),
                "collection_breakdown": collection_counts,
            },
            "sources": [
                {
                    "book": r.get("source_book", ""),
                    "chapter": r.get("chapter", ""),
                    "section": r.get("section", ""),
                    "page": r.get("page_number", ""),
                    "text": r.get("text", ""),
                    "score": round(r.get("rerank_score", r.get("hybrid_score", r.get("score", 0))), 4),
                    "collection": r.get("collection", ""),
                }
                for r in results
            ],
        }

    def search_with_ai(self, query: str, collection: Optional[str] = None, top_k: int = 8) -> dict:
        import time
        t0 = time.time()

        results = retriever.search(query, collection=collection, top_k=top_k + 4)
        elapsed = round((time.time() - t0) * 1000)

        context_texts, used_books = compress_context(results)
        intent = classify_query_intent(query)
        system_prompt = _get_system_prompt(intent)
        user_prompt = _build_user_prompt(query, context_texts, intent)

        try:
            provider = self._get_ai_provider()
            answer = provider.generate_response(
                prompt=user_prompt,
                system_instruction=system_prompt,
                temperature=0.3,
            )
            mode = "ai_generated"
        except Exception as e:
            logger.warning(f"AI answer generation failed: {e}")
            answer = None
            mode = "ai_failed"

        if answer and len(answer) < 20:
            answer = None
            mode = "ai_failed"

        references = []
        follow_up_questions = []
        if answer:
            references = list(used_books)
            answer += format_references(references)

        sources = [
            {
                "book": r.get("source_book", ""),
                "chapter": r.get("chapter", ""),
                "section": r.get("section", ""),
                "page": r.get("page_number", ""),
                "text": r.get("text", ""),
                "score": round(r.get("rerank_score", r.get("hybrid_score", r.get("score", 0))), 4),
                "collection": r.get("collection", ""),
            }
            for r in results
        ]

        return {
            "answer": answer,
            "mode": mode,
            "collection": collection,
            "intent": intent.value,
            "references": references,
            "follow_up_questions": follow_up_questions,
            "sources": sources,
            "results": results,
            "metrics": {
                "latency_ms": elapsed,
                "collection_searched": collection or "all",
                "chunks_retrieved": len(results),
                "chunks_after_compression": len(context_texts),
                "intent": intent.value,
            },
        }
