"""Google-only auth for AI Hisab Nikash.

- There is NO username/password login: users sign in with Google only.
- The server verifies every Google ID token with google-auth (signature,
  audience = our client id, expiry) and then issues its own JWT (PyJWT,
  HS256) valid for 30 days.
- The JWT secret comes from the JWT_SECRET env var. If it is NOT set, a
  random secret is generated per boot and a warning is logged — logins then
  do NOT survive a server restart. Never hard-code a default secret.
  On Railway, set JWT_SECRET as a Variable (one long random value).
"""
import logging
import os
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from .database import get_db
from .models import User

log = logging.getLogger("hisab.auth")

_ALGORITHM = "HS256"
_TOKEN_DAYS = 30

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


# ---------------------------------------------------------------- Google
def google_client_id() -> str:
    """The Google OAuth client ID (from Google Cloud Console). Empty
    until the parent sets GOOGLE_CLIENT_ID as a Railway Variable."""
    return os.environ.get("GOOGLE_CLIENT_ID", "").strip()


def google_auth_available() -> bool:
    try:
        import google.auth  # noqa: F401
        return True
    except ImportError:
        return False


def google_enabled() -> bool:
    return bool(google_client_id()) and google_auth_available()


def verify_google_token(id_token_str: str) -> dict:
    """Verify a Google Identity Services ID token server-side and return
    its payload (sub, email, email_verified, name, picture). Never trust
    the token on the client alone — Google's library checks the signature,
    audience (= our client id) and expiry. Kept as a module-level
    function so tests can monkeypatch it with a fake payload."""
    if not google_auth_available():
        raise HTTPException(
            status_code=503,
            detail="Google login is not set up yet (google-auth missing)")
    client_id = google_client_id()
    if not client_id:
        raise HTTPException(
            status_code=503,
            detail="Google login is not set up yet (GOOGLE_CLIENT_ID missing)")
    try:
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token as google_id_token
        payload = google_id_token.verify_oauth2_token(
            id_token_str, google_requests.Request(), client_id)
    except ValueError:
        raise HTTPException(status_code=401,
                            detail="invalid Google token")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401,
                            detail="invalid Google token")
    if payload.get("email_verified") is False:
        raise HTTPException(status_code=401,
                            detail="Google email is not verified")
    return payload


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
    # Maintenance mode (v10): staff can still work, everyone else gets
    # 503 with the maintenance message. The login endpoint itself is
    # NOT blocked (google_login does not use this dependency), and
    # /api/config stays public so the frontend can show the maintenance
    # screen instead of the login screen. (Lazy import: admin.py
    # imports get_current_user from here, so a top-level import would
    # be circular.)
    from .admin import effective_role, maintenance_state
    mode, msg = maintenance_state(db)
    if mode and effective_role(user, db=db) not in ("admin", "support"):
        raise HTTPException(status_code=503,
                            detail=msg if msg else "maintenance mode")
    return user
