"""Admin roles, time-limited support, and maintenance mode (v10).

Roles:
  "user"    — normal user.
  "support" — temporary elevated role; only counts while support_until
              is in the future. Expired support is treated as "user"
              (and downgraded persistently when noticed).
  "admin"   — permanent admin. Maisha (ADMIN_EMAIL) is always admin:
              she is promoted on every Google login and at app startup.

Only "admin" can change roles or site settings; "support" can view the
admin dashboard (stats, users, settings) but cannot change anything.
"""
import os

from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from . import reminders as rem
from .auth import get_current_user
from .database import get_db
from .models import SiteSetting, User

ADMIN_EMAIL = os.environ.get(
    "ADMIN_EMAIL", "maishachowdhury471@gmail.com").strip().lower()


def effective_role(user, now=None, db=None):
    """The role that actually applies right now. Expired support is
    treated as a normal user — and downgraded in the DB when a session
    is supplied, so the stale role never comes back."""
    role = (user.role or "user").lower()
    if role == "admin":
        return "admin"
    if role == "support":
        until = user.support_until
        check = now or rem.now_dhaka()
        if until and until > check:
            return "support"
        if db is not None:
            user.role = "user"
            user.support_until = None
            db.commit()
        return "user"
    return "user"


def is_staff(user, now=None, db=None):
    return effective_role(user, now=now, db=db) in ("admin", "support")


def is_admin(user, now=None, db=None):
    return effective_role(user, now=now, db=db) == "admin"


def require_staff(user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)) -> User:
    """Dependency: any logged-in staff (admin or live support). 401
    without a valid JWT, 403 for normal users."""
    if not is_staff(user, db=db):
        raise HTTPException(status_code=403,
                            detail="admin or support role required")
    return user


def require_admin(user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)) -> User:
    """Dependency: the permanent admin only."""
    if not is_admin(user, db=db):
        raise HTTPException(status_code=403,
                            detail="admin role required")
    return user


def get_setting(db: Session, key: str, default: str = "") -> str:
    row = db.query(SiteSetting).filter(SiteSetting.key == key).first()
    return row.value if row else default


def set_setting(db: Session, key: str, value: str):
    row = db.query(SiteSetting).filter(SiteSetting.key == key).first()
    if row:
        row.value = value
    else:
        db.add(SiteSetting(key=key, value=value))
    db.commit()


def maintenance_state(db: Session):
    """(maintenance_mode: bool, maintenance_message: str)."""
    mode = get_setting(db, "maintenance_mode", "0") == "1"
    msg = get_setting(db, "maintenance_message", "")
    return mode, msg


def seed_admin(db: Session):
    """Promote the permanent admin (Maisha) if the account exists.
    Runs at app startup, after the schema migration."""
    u = db.query(User).filter(User.email == ADMIN_EMAIL).first()
    if u and (u.role or "user") != "admin":
        u.role = "admin"
        u.support_until = None
        db.commit()
