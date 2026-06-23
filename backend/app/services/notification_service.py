from sqlalchemy.orm import Session
from datetime import datetime, date
from typing import Optional

from app.models.notification import Notification, NotificationConfig


class NotificationService:
    def __init__(self, db: Session):
        self.db = db

    def get_config(self, user_id: int) -> NotificationConfig:
        config = (
            self.db.query(NotificationConfig)
            .filter(NotificationConfig.user_id == user_id)
            .first()
        )
        if not config:
            config = NotificationConfig(user_id=user_id)
            self.db.add(config)
            self.db.commit()
            self.db.refresh(config)
        return config

    def update_config(self, user_id: int, data: dict) -> NotificationConfig:
        config = self.get_config(user_id)
        for key, value in data.items():
            if hasattr(config, key):
                setattr(config, key, value)
        self.db.commit()
        self.db.refresh(config)
        return config

    def get_notifications(self, user_id: int) -> list[Notification]:
        return (
            self.db.query(Notification)
            .filter(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .limit(50)
            .all()
        )

    def create_notification(
        self,
        user_id: int,
        type: str,
        title: str,
        body: Optional[str] = None,
        scheduled_at: Optional[datetime] = None,
    ) -> Notification:
        notification = Notification(
            user_id=user_id,
            type=type,
            title=title,
            body=body,
            scheduled_at=scheduled_at,
        )
        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)
        return notification

    def mark_as_read(self, notification_id: int, user_id: int) -> Optional[Notification]:
        notification = (
            self.db.query(Notification)
            .filter(
                Notification.id == notification_id,
                Notification.user_id == user_id,
            )
            .first()
        )
        if notification:
            notification.read = True
            self.db.commit()
            self.db.refresh(notification)
        return notification

    def get_upcoming(self, user_id: int) -> list[Notification]:
        now = datetime.utcnow()
        return (
            self.db.query(Notification)
            .filter(
                Notification.user_id == user_id,
                Notification.scheduled_at >= now,
                Notification.sent_at.is_(None),
            )
            .order_by(Notification.scheduled_at)
            .limit(10)
            .all()
        )
