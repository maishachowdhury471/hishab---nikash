"""Username + password auth for AI Hisab Nikash.

- Passwords are hashed with bcrypt (never stored in plain text).
- Login returns a JWT (PyJWT, HS256) valid for 30 days.
- The JWT secret comes from the JWT_SECRET env var. If it is NOT set, a
  random secret is generated per boot and a warning is logged — logins then
  do NOT survive a server restart. Never hard-code a default secret.
  On Railway, set JWT_SECRET as a Variable (one long random value).
"""
import logging
import os
import re
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from .database import get_db
from .models import User

log = logging.getLogger("hisab.auth")

_ALGORITHM = "HS256"
_TOKEN_DAYS = 30
_USERNAME_RE = re.compile(r"^[A-Za-z0-9_]{3,30}$")

_SECRET = None


def jwt_secret() -> str:
    """The JWT signing secret (cached once per process)."""
    global _SECRET
    if _SECRET is None:
        env = os.environ.get("JWT_SECRET", "").strip()
        if env:
            _SECRET = env
        else:
            _SECRET = secrets.token_urlsafe(48)
            log.warning(
                "JWT_SECRET is not set — using a random per-boot secret; "
                "users will be logged out on every restart. "
                "Set JWT_SECRET as a Railway Variable.")
    return _SECRET


def normalize_username(raw: str) -> str:
    """Usernames are case-insensitive: stored and looked up lowercase."""
    return (raw or "").strip().lower()


def validate_username(username: str):
    if not _USERNAME_RE.fullmatch(username):
        raise HTTPException(
            status_code=400,
            detail="username must be 3-30 characters: letters, digits, underscore")


def validate_password(password: str):
    if not password or len(password) < 4:
        raise HTTPException(
            status_code=400,
            detail="password must be at least 4 characters")
    if len(password) > 128:
        raise HTTPException(status_code=400, detail="password too long")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"),
                         bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"),
                              password_hash.encode("utf-8"))
    except Exception:
        return False


def create_token(user: User) -> str:
    now = datetime.now(timezone.utc)
    payload = {"sub": str(user.id), "username": user.username,
               "iat": now, "exp": now + timedelta(days=_TOKEN_DAYS)}
    return jwt.encode(payload, jwt_secret(), algorithm=_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, jwt_secret(), algorithms=[_ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401,
                            detail="invalid or expired token")


def get_current_user(authorization: str = Header(default=""),
                     db: Session = Depends(get_db)) -> User:
    """FastAPI dependency: the logged-in user from `Authorization: Bearer <jwt>`."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="login required")
    payload = decode_token(authorization[7:].strip())
    try:
        user_id = int(payload.get("sub"))
    except (TypeError, ValueError):
        raise HTTPException(status_code=401, detail="invalid token")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="user not found")
    return user
