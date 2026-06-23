from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.user import User
from app.rag import indexer, retriever

router = APIRouter(prefix="/api/rag", tags=["Medical RAG"])


@router.get("/collections")
def list_collections():
    stats = indexer.get_stats()
    return {"collections": stats}


@router.get("/search")
def search_rag(
    q: str = Query(..., description="Search query"),
    collection: str = Query(None, description="Filter by collection"),
    top_k: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not q.strip():
        raise HTTPException(status_code=400, detail="Query is required")
    results = retriever.search(q, collection=collection, top_k=top_k)
    return {
        "query": q,
        "collection": collection or "all",
        "results": [
            {
                "text": r["text"],
                "score": r["score"],
                "citation": retriever.format_citation(r),
                "source_book": r["source_book"],
                "chapter": r["chapter"],
                "section": r["section"],
                "page_number": r["page_number"],
            }
            for r in results
        ],
    }


@router.post("/query")
def query_rag(
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = body.get("query", "").strip()
    collection = body.get("collection")
    top_k = min(body.get("top_k", 5), 20)
    if not q:
        raise HTTPException(status_code=400, detail="Query is required")
    results = retriever.search(q, collection=collection, top_k=top_k)
    return {
        "query": q,
        "collection": collection or "all",
        "results": [
            {
                "text": r["text"],
                "score": r["score"],
                "citation": retriever.format_citation(r),
                "source_book": r["source_book"],
                "chapter": r["chapter"],
                "section": r["section"],
                "page_number": r["page_number"],
            }
            for r in results
        ],
    }
