from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from app.domain.medical_library import retriever

router = APIRouter(prefix="/api/bot", tags=["Offline Medical Bot"])


class BotQuery(BaseModel):
    query: str
    top_k: int = 5
    collection: Optional[str] = None
    use_reranker: bool = False


@router.post("/ask")
def bot_ask(body: BotQuery):
    results = retriever.search(body.query, collection=body.collection, top_k=body.top_k, use_reranker=body.use_reranker, use_hybrid=True)
    return {
        "query": body.query,
        "total": len(results),
        "results": [
            {
                "text": r.get("text", ""),
                "book": r.get("source_book", ""),
                "chapter": r.get("chapter", ""),
                "section": r.get("section", ""),
                "page": r.get("page_number", ""),
                "collection": r.get("collection", ""),
                "score": round(
                    r.get("rerank_score", r.get("hybrid_score", r.get("score", 0))),
                    4,
                ),
            }
            for r in results
        ],
    }
