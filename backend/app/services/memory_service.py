from sqlalchemy.orm import Session
from typing import Optional

from app.models.memory import MemoryEntry


class MemoryService:
    def __init__(self, db: Session):
        self.db = db

    def get_all(self, user_id: int) -> list[MemoryEntry]:
        return (
            self.db.query(MemoryEntry)
            .filter(MemoryEntry.user_id == user_id)
            .order_by(MemoryEntry.updated_at.desc())
            .all()
        )

    def get_by_category(self, user_id: int, category: str) -> list[MemoryEntry]:
        return (
            self.db.query(MemoryEntry)
            .filter(
                MemoryEntry.user_id == user_id, MemoryEntry.category == category
            )
            .all()
        )

    def create(
        self, user_id: int, category: str, key: str, value: str
    ) -> MemoryEntry:
        entry = self.db.query(MemoryEntry).filter(
            MemoryEntry.user_id == user_id,
            MemoryEntry.category == category,
            MemoryEntry.key == key,
        ).first()

        if entry:
            entry.value = value
        else:
            entry = MemoryEntry(
                user_id=user_id, category=category, key=key, value=value
            )
            self.db.add(entry)

        self.db.commit()
        self.db.refresh(entry)
        return entry

    def update(self, entry_id: int, user_id: int, value: str) -> Optional[MemoryEntry]:
        entry = (
            self.db.query(MemoryEntry)
            .filter(MemoryEntry.id == entry_id, MemoryEntry.user_id == user_id)
            .first()
        )
        if not entry:
            return None
        entry.value = value
        self.db.commit()
        self.db.refresh(entry)
        return entry

    def delete(self, entry_id: int, user_id: int) -> bool:
        entry = (
            self.db.query(MemoryEntry)
            .filter(MemoryEntry.id == entry_id, MemoryEntry.user_id == user_id)
            .first()
        )
        if not entry:
            return False
        self.db.delete(entry)
        self.db.commit()
        return True

    def build_summary(self, user_id: int) -> str:
        entries = self.get_all(user_id)
        if not entries:
            return "No memory data available."

        summary = ""
        for entry in entries:
            summary += f"{entry.key}: {entry.value}\n"
        return summary.strip()
