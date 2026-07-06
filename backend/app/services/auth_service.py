from datetime import datetime, timedelta

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.user import User
from app.models.refresh_token import RefreshToken
from app.schemas.user import UserCreate
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    generate_refresh_token,
    hash_refresh_token,
    verify_refresh_token,
)
from app.core.config import settings
from app.services.otp_service import OTPService
from app.services.email_service import email_service


class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.otp_service = OTPService(db)

    def register(self, data: UserCreate) -> dict:
        existing = self.db.query(User).filter(User.email == data.email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered",
            )

        user = User(
            email=data.email,
            hashed_password=hash_password(data.password),
            full_name=data.full_name,
            is_active=False,
            verified=False,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)

        self.otp_service.create_and_send_otp(user)

        return self._generate_token_response(user)

    def login(self, email: str, password: str) -> dict:
        user = self.db.query(User).filter(User.email == email).first()
        if not user or not user.hashed_password:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )
        if not verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        if not user.verified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Email verification required.",
            )

        if not user.is_active:
            user.is_active = True
            self.db.flush()

        return self._generate_token_response(user)

    def refresh(self, raw_token: str) -> dict:
        token_hash = hash_refresh_token(raw_token)
        stored = (
            self.db.query(RefreshToken)
            .filter(
                RefreshToken.token_hash == token_hash,
                RefreshToken.revoked == False,
                RefreshToken.expires_at > datetime.utcnow(),
            )
            .first()
        )
        if not stored:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token",
            )

        # Revoke old token (rotation)
        stored.revoked = True
        self.db.flush()

        user = self.db.query(User).filter(User.id == stored.user_id).first()
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive",
            )

        return self._generate_token_response(user)

    def logout(self, raw_token: str) -> None:
        token_hash = hash_refresh_token(raw_token)
        stored = (
            self.db.query(RefreshToken)
            .filter(
                RefreshToken.token_hash == token_hash,
                RefreshToken.revoked == False,
            )
            .first()
        )
        if stored:
            stored.revoked = True
            self.db.flush()

    def login_with_otp(self, email: str, otp: str) -> dict:
        user = self.db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or OTP",
            )

        self.otp_service.verify(user.id, otp)

        if not user.verified:
            user.verified = True
        if not user.is_active:
            user.is_active = True
        self.db.flush()

        return self._generate_token_response(user)

    def change_password(self, user: User, current_password: str, new_password: str) -> None:
        if not verify_password(current_password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect.",
            )

        user.hashed_password = hash_password(new_password)
        self.db.commit()

    def _generate_token_response(self, user: User) -> dict:
        access_token = create_access_token({"sub": str(user.id)})
        raw_refresh = generate_refresh_token()
        refresh_token_hash = hash_refresh_token(raw_refresh)
        refresh_expires = datetime.utcnow() + timedelta(
            days=settings.JWT_REFRESH_EXPIRATION_DAYS
        )

        refresh_entry = RefreshToken(
            user_id=user.id,
            token_hash=refresh_token_hash,
            expires_at=refresh_expires,
        )
        self.db.add(refresh_entry)
        self.db.commit()

        return {
            "access_token": access_token,
            "refresh_token": raw_refresh,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "avatar_url": user.avatar_url,
                "role": user.role.value if hasattr(user.role, 'value') else user.role,
                "is_active": user.is_active,
                "verified": user.verified if hasattr(user, 'verified') else False,
                "created_at": user.created_at.isoformat() if user.created_at else None,
            },
        }
