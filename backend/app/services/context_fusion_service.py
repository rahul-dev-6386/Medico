import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from typing import Optional

from sqlalchemy.orm import Session

from app.services.user_retriever import UserRetriever
from app.infrastructure.embedding_service import embedding_service
from app.infrastructure.vector_store import vector_store
from app.domain.medical_library import retriever as library_retriever

logger = logging.getLogger("context_fusion_service")


@dataclass
class FusionResult:
    contexts: list[dict] = field(default_factory=list)
    prioritization: list[str] = field(default_factory=list)
    source_counts: dict[str, int] = field(default_factory=dict)
    textbooks_used: set[str] = field(default_factory=set)


class ContextFusionService:
    PRIORITY_ORDER = [
        "user_report_chunks",
        "textbook",
        "guideline",
        "pubmed",
    ]

    def __init__(self, db: Session):
        self.db = db
        self.user_retriever = UserRetriever(db)

    def retrieve(
        self,
        query: str,
        user_id: int,
        top_k_textbooks: int = 8,
        top_k_user: int = 5,
        report_type: Optional[str] = None,
    ) -> FusionResult:
        result = FusionResult()

        all_results = []

        # Run textbook Qdrant search
        try:
            query_emb = embedding_service.embed(query)
            textbook_results = vector_store.search(
                query_emb,
                top_k=top_k_textbooks,
                payload_filter=None,
            )
            for r in textbook_results:
                payload = r["payload"]
                all_results.append({
                    "content": payload.get("text", ""),
                    "source": "textbook",
                    "title": f"{payload.get('source_book', '')} / {payload.get('chapter', '')}",
                    "similarity": r.get("score", 0),
                    "collection": payload.get("collection", ""),
                })
                if "source_book" in payload:
                    result.textbooks_used.add(payload["source_book"])
        except Exception as e:
            logger.warning(f"Textbook search failed: {e}")

        # Run textbook library search
        try:
            library_results = library_retriever.search(query, top_k=top_k_textbooks, use_reranker=False)
            for lr in library_results:
                all_results.append({
                    "content": lr.get("text", ""),
                    "source": "textbook_library",
                    "title": f"{lr.get('source_book', '')} / {lr.get('chapter', '')}",
                    "similarity": lr.get("score", 0),
                    "collection": lr.get("collection", ""),
                })
                if "source_book" in lr:
                    result.textbooks_used.add(lr["source_book"])
        except Exception as e:
            logger.warning(f"Library search failed: {e}")

        # Run user pgvector search
        try:
            user_chunks = self.user_retriever.search(
                query=query,
                user_id=user_id,
                top_k=top_k_user,
                report_type=report_type,
            )
            for uc in user_chunks:
                all_results.append({
                    "content": uc["content"],
                    "source": "user_report_chunks",
                    "title": f"Report #{uc['report_id']} chunk {uc['chunk_index']}",
                    "similarity": uc.get("similarity", 0),
                    "report_id": uc["report_id"],
                    "report_type": uc["report_type"],
                    "report_date": uc["report_date"],
                })
        except Exception as e:
            logger.warning(f"User report search failed: {e}")

        # Deduplicate by content fingerprint
        seen = set()
        deduped = []
        for item in all_results:
            fp = item["content"][:200].lower().strip()
            if fp not in seen:
                seen.add(fp)
                deduped.append(item)

        # Sort by priority order, then by similarity desc within each priority tier
        def sort_key(item):
            source = item["source"]
            try:
                priority = self.PRIORITY_ORDER.index(source)
            except ValueError:
                priority = 99
            return (priority, -item.get("similarity", 0))

        deduped.sort(key=sort_key)

        result.contexts = deduped

        # Count sources
        counts = {}
        for item in deduped:
            src = item["source"]
            counts[src] = counts.get(src, 0) + 1
        result.source_counts = counts

        # Build prioritization explanation
        priority_labels = {
            "user_report_chunks": "Your uploaded reports",
            "textbook": "Medical textbooks (vector store)",
            "textbook_library": "Medical textbooks (library)",
            "guideline": "Medical guidelines",
            "pubmed": "PubMed articles",
        }
        result.prioritization = [
            f"Priority {i+1}: {priority_labels.get(s, s)} ({n} results)"
            for i, (s, n) in enumerate(counts.items())
        ]

        return result
