from typing import Optional
from fastapi import Depends, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.core.security import decode_access_token

GUEST_EMAIL = "guest@medico.app"


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> User:
    user = db.query(User).filter(User.email == GUEST_EMAIL).first()
    if user:
        return user

    user = User(
        email=GUEST_EMAIL,
        full_name="Guest User",
        hashed_password="",
        role="patient",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
