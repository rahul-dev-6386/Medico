import secrets
import hashlib
import hmac
from datetime import datetime, timedelta
from typing import Optional

from app.core.config import settings


def generate_otp(length: Optional[int] = None) -> str:
    length = length or settings.OTP_LENGTH
    chars = "0123456789"
    return "".join(secrets.choice(chars) for _ in range(length))


def hash_otp(otp: str) -> str:
    return hashlib.sha256(otp.encode("utf-8")).hexdigest()


def verify_otp(plain_otp: str, hashed_otp: str) -> bool:
    return hmac.compare_digest(hash_otp(plain_otp), hashed_otp)


def get_otp_expiry() -> datetime:
    return datetime.utcnow() + timedelta(minutes=settings.OTP_EXPIRY_MINUTES)
