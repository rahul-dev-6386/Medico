import logging
from datetime import datetime
from typing import Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.infrastructure.embedding_provider import get_embedding_provider

logger = logging.getLogger("user_retriever")


class UserRetriever:
    def __init__(self, db: Session):
        self.db = db
        self.provider = get_embedding_provider()

    def search(
        self,
        query: str,
        user_id: int,
        top_k: int = 10,
        report_type: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
    ) -> list[dict]:
        query_vec = self.provider.embed(query)
        where_clauses = [f"user_id = :user_id"]
        params = {"user_id": user_id, "query_vec": str(query_vec), "top_k": top_k}

        if report_type:
            where_clauses.append("report_type = :report_type")
            params["report_type"] = report_type
        if date_from:
            where_clauses.append("report_date >= :date_from")
            params["date_from"] = date_from
        if date_to:
            where_clauses.append("report_date <= :date_to")
            params["date_to"] = date_to

        where_sql = " AND ".join(where_clauses)

        sql = f"""
            SELECT
                id, user_id, report_id, chunk_index, content,
                report_type, hospital, doctor, report_date,
                page_number, ocr_confidence, language, created_at,
                1 - (embedding <=> cast(:query_vec AS vector)) AS similarity
            FROM user_report_chunks
            WHERE {where_sql}
            ORDER BY embedding <=> cast(:query_vec AS vector)
            LIMIT :top_k
        """

        rows = self.db.execute(text(sql), params).fetchall()
        results = []
        for row in rows:
            results.append({
                "id": row.id,
                "user_id": row.user_id,
                "report_id": row.report_id,
                "chunk_index": row.chunk_index,
                "content": row.content,
                "report_type": row.report_type,
                "hospital": row.hospital,
                "doctor": row.doctor,
                "report_date": row.report_date.isoformat() if row.report_date else None,
                "page_number": row.page_number,
                "ocr_confidence": row.ocr_confidence,
                "language": row.language,
                "similarity": float(row.similarity) if row.similarity else 0,
                "source": "user_report",
            })
        return results

    def search_by_report(self, report_id: int, top_k: int = 20) -> list[dict]:
        rows = (
            self.db.execute(
                text("""
                    SELECT id, user_id, report_id, chunk_index, content,
                           report_type, hospital, doctor, report_date,
                           page_number, ocr_confidence, language, created_at
                    FROM user_report_chunks
                    WHERE report_id = :report_id
                    ORDER BY chunk_index
                    LIMIT :top_k
                """),
                {"report_id": report_id, "top_k": top_k},
            )
            .fetchall()
        )
        return [dict(r._mapping) | {"source": "user_report"} for r in rows]

    def search_by_report_type(
        self, user_id: int, report_type: str, top_k: int = 10
    ) -> list[dict]:
        rows = (
            self.db.execute(
                text("""
                    SELECT id, user_id, report_id, chunk_index, content,
                           report_type, hospital, doctor, report_date,
                           page_number, ocr_confidence, language, created_at
                    FROM user_report_chunks
                    WHERE user_id = :user_id AND report_type = :report_type
                    ORDER BY created_at DESC
                    LIMIT :top_k
                """),
                {"user_id": user_id, "report_type": report_type, "top_k": top_k},
            )
            .fetchall()
        )
        return [dict(r._mapping) | {"source": "user_report"} for r in rows]

    def search_by_date_range(
        self,
        user_id: int,
        date_from: datetime,
        date_to: datetime,
        top_k: int = 20,
    ) -> list[dict]:
        rows = (
            self.db.execute(
                text("""
                    SELECT id, user_id, report_id, chunk_index, content,
                           report_type, hospital, doctor, report_date,
                           page_number, ocr_confidence, language, created_at
                    FROM user_report_chunks
                    WHERE user_id = :user_id
                      AND report_date BETWEEN :date_from AND :date_to
                    ORDER BY report_date
                    LIMIT :top_k
                """),
                {"user_id": user_id, "date_from": date_from, "date_to": date_to, "top_k": top_k},
            )
            .fetchall()
        )
        return [dict(r._mapping) | {"source": "user_report"} for r in rows]
