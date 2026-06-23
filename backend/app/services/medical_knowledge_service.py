import os
from typing import Optional

from sqlalchemy.orm import Session

from app.config import settings
from app.models.medical_knowledge import MedicalGuideline
from app.services.embedding_service import embedding_service
from app.services.vector_store import vector_store


KNOWLEDGE_TOPICS = [
    "diabetes_type_1",
    "diabetes_type_2",
    "hypertension",
    "cardiovascular_disease",
    "chronic_kidney_disease",
    "asthma",
    "copd",
    "thyroid_disorders",
    "anemia",
    "obesity",
    "mental_health",
    "nutrition",
    "exercise_guidelines",
    "immunization",
    "preventive_care",
]


class MedicalKnowledgeService:
    def __init__(self, db: Session):
        self.db = db

    def ingest_guideline(
        self,
        source: str,
        specialty: str,
        title: str,
        content: str,
        url: Optional[str] = None,
    ):
        chunks = self._chunk_text(content)
        for i, chunk in enumerate(chunks):
            embedding_data = embedding_service.embed_document(chunk)
            embedding_id = f"guideline_{source}_{specialty}_{i}"

            existing = (
                self.db.query(MedicalGuideline)
                .filter(MedicalGuideline.embedding_id == embedding_id)
                .first()
            )
            if existing:
                continue

            guideline = MedicalGuideline(
                source=source,
                title=title,
                specialty=specialty,
                chunk_index=i,
                content=chunk,
                embedding_id=embedding_id,
                url=url,
            )
            self.db.add(guideline)
            self.db.flush()

            vector_store.upsert(
                embedding_id=embedding_id,
                embedding=embedding_data["embedding"],
                payload={
                    "type": "guideline",
                    "source": source,
                    "specialty": specialty,
                    "title": title,
                    "chunk_index": i,
                },
            )

        self.db.commit()

    def search(self, query: str, top_k: int = 5) -> list[dict]:
        query_emb = embedding_service.embed(query)
        results = vector_store.search(query_emb, top_k=top_k)
        enriched = []
        for r in results:
            if r["payload"].get("type") == "guideline":
                entry = (
                    self.db.query(MedicalGuideline)
                    .filter(MedicalGuideline.embedding_id == r["id"])
                    .first()
                )
                if entry:
                    enriched.append({
                        "content": entry.content,
                        "source": entry.source,
                        "title": entry.title,
                        "specialty": entry.specialty,
                        "score": r["score"],
                        "url": entry.url,
                    })
        return enriched

    def get_topics(self) -> list[str]:
        return KNOWLEDGE_TOPICS

    def count(self) -> int:
        return self.db.query(MedicalGuideline).count()

    def _chunk_text(self, text: str) -> list[str]:
        words = text.split()
        chunks = []
        chunk_size = settings.CHUNK_SIZE
        overlap = settings.CHUNK_OVERLAP
        i = 0
        while i < len(words):
            chunk = " ".join(words[i:i + chunk_size])
            if chunk:
                chunks.append(chunk)
            i += chunk_size - overlap
        return chunks if chunks else [text]
