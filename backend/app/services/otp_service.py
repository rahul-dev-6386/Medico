from datetime import datetime

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.email_verification import EmailVerification
from app.models.user import User
from app.security.otp import generate_otp, hash_otp, verify_otp, get_otp_expiry
from app.services.email_service import email_service
from app.core.config import settings


class OTPService:
    OTTP_MAX_ATTEMPTS = 5
    RESEND_COOLDOWN_SECONDS = 60

    def __init__(self, db: Session):
        self.db = db

    def create_and_send_otp(self, user: User) -> dict:
        """Generate OTP, store hashed copy, and send via email."""
        self._invalidate_existing_otps(user.id)

        otp = generate_otp()
        hashed = hash_otp(otp)
        expiry = get_otp_expiry()

        record = EmailVerification(
            user_id=user.id,
            email=user.email,
            otp_hash=hashed,
            expires_at=expiry,
            attempts=0,
        )
        self.db.add(record)
        self.db.commit()

        sent = email_service.send_otp_email(user.email, otp, user.full_name)

        return {"message": "OTP sent successfully", "email": self._mask_email(user.email), "sent": sent}

    def verify(self, user_id: int, otp: str) -> bool:
        """Verify OTP for a given user. Returns True on success."""
        record = (
            self.db.query(EmailVerification)
            .filter(
                EmailVerification.user_id == user_id,
                EmailVerification.verified == False,
                EmailVerification.expires_at > datetime.utcnow(),
            )
            .order_by(EmailVerification.created_at.desc())
            .first()
        )

        if not record:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No valid OTP found. Request a new one.",
            )

        if record.attempts >= self.OTTP_MAX_ATTEMPTS:
            record.verified = True  # mark used
            self.db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Too many failed attempts. Request a new OTP.",
            )

        record.attempts += 1
        self.db.flush()

        if not verify_otp(otp, record.otp_hash):
            self.db.commit()
            remaining = self.OTTP_MAX_ATTEMPTS - record.attempts
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid OTP. {remaining} attempt(s) remaining." if remaining > 0
                else "Too many failed attempts. Request a new OTP.",
            )

        record.verified = True
        self.db.flush()

        user = self.db.query(User).filter(User.id == user_id).first()
        if user:
            user.is_active = True
            self.db.flush()

        self.db.query(EmailVerification).filter(
            EmailVerification.user_id == user_id,
            EmailVerification.id != record.id,
        ).delete()
        self.db.commit()

        email_service.send_welcome_email(user.email, user.full_name)

        return True

    def resend_otp(self, user_id: int) -> dict:
        """Resend OTP with cooldown check."""
        last_record = (
            self.db.query(EmailVerification)
            .filter(
                EmailVerification.user_id == user_id,
                EmailVerification.verified == False,
            )
            .order_by(EmailVerification.created_at.desc())
            .first()
        )

        if last_record:
            elapsed = (datetime.utcnow() - last_record.created_at.replace(tzinfo=None)).total_seconds()
            if elapsed < self.RESEND_COOLDOWN_SECONDS:
                remaining = int(self.RESEND_COOLDOWN_SECONDS - elapsed)
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Please wait {remaining} seconds before requesting a new OTP.",
                )

        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found.",
            )

        return self.create_and_send_otp(user)

    def check_verification_required(self, user: User) -> None:
        """Raise 403 if user email is not verified."""
        if not user.verified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Email verification required.",
            )

    def _invalidate_existing_otps(self, user_id: int) -> None:
        self.db.query(EmailVerification).filter(
            EmailVerification.user_id == user_id,
            EmailVerification.verified == False,
        ).update({"verified": True})
        self.db.flush()

    @staticmethod
    def _mask_email(email: str) -> str:
        local, domain = email.split("@", 1)
        if len(local) <= 2:
            masked = local[0] + "***"
        else:
            masked = local[:2] + "***" + local[-1]
        return f"{masked}@{domain}"
