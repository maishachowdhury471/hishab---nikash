"""Hisab Nikash — FastAPI backend + static frontend (single service).

Accounts: every person signs in with Google only, and ALL
data (entries, summary, advice, comparison, reminders, push subscriptions)
belongs to exactly one user. Nothing is shared between accounts.

API (prefix /api):
  POST   /api/auth/google                 (Google ID token → token)
  GET    /api/auth/me                     (Bearer token → current user)
  GET    /api/health                      (public)
  GET    /api/entries?month=YYYY-MM       (auth — only your entries)
  POST   /api/entries                     (auth)
  PUT    /api/entries/{id}                (auth — 404 if it is not yours)
  DELETE /api/entries/{id}                (auth — 404 if it is not yours)
  POST   /api/zero-days                   (auth — mark a day with no
                                           expense and no income)
  GET    /api/zero-days?month=YYYY-MM     (auth — your zero days)
  DELETE /api/zero-days/{date}            (auth — 404 if it is not yours)
  GET    /api/summary?month=YYYY-MM&lang=bn|en   (auth — only your data)
  POST   /api/parse                       (public, stateless parsing)
  GET    /api/config                      (public: VAPID public key / push status / Google)
  POST   /api/push/subscribe              (auth)
  POST   /api/push/unsubscribe            (auth)
  GET    /api/reminders/status            (auth — your last entry, your missed days)
  GET    /api/reminders/history           (auth — your reminders, exact times)
  POST   /api/reminders/trigger           (X-Reminder-Secret header, per user)
  POST   /api/reminders/shown             (auth — record a locally shown reminder)
Frontend served at / ; manifest at /manifest.json ; sw.js at /sw.js.
"""
import os
import re
from calendar import monthrange
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Optional

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from . import admin as adminmod
from . import auth as authmod
from .advice import generate_advice
from .database import Base, SessionLocal, engine, ensure_schema, get_db
from .models import Entry, PushSubscription, ReminderLog, User, ZeroDay
from .parser import parse_text
from . import reminders as rem

BASE_DIR = Path(__file__).resolve().parents[2]
STATIC_DIR = BASE_DIR / "static"

@asynccontextmanager
async def _lifespan(_app):
    Base.metadata.create_all(bind=engine)
    # Existing databases (e.g. the live Railway Postgres from before
    # logins existed) need the new user_id columns added — create_all
    # alone never adds a column to an existing table.
    ensure_schema()
    # The permanent admin (Maisha) is admin from the moment her account
    # exists — promote her here too, not only on her next login.
    db = SessionLocal()
    try:
        adminmod.seed_admin(db)
    finally:
        db.close()
    yield


app = FastAPI(title="Hisab Nikash", lifespan=_lifespan)

# The Capacitor APK (v1.2+) bundles the frontend locally, so its origin is
# https://localhost (or capacitor://localhost) and its API calls are
# cross-origin. The browser version is same-origin, so this changes
# nothing for it. Auth uses an Authorization header, not cookies.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://hishab-nikash-production.up.railway.app",
        "https://localhost",
        "capacitor://localhost",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

EXPENSE_CATEGORIES = ["bazar", "khabar", "jatayat", "bill", "bari-bhara",
                      "biddut-bill", "gas-bill", "pani-bill", "internet-bill",
                      "mobile-bill", "oshudh", "doctor", "poshak", "juta-bag",
                      "shikkha", "boi-stationery", "binodon", "bhromon",
                      "upohar", "dan", "dhormio", "biye", "proshadhoni",
                      "selun", "laundry", "grihosthali", "electronics",
                      "janbahon-rokkhon", "petrol", "posha-prani", "krishi",
                      "bebshar-khoroch", "rin-porishodh", "bima", "sonchoy",
                      "tax", "shishur-khoroch", "kheladhula", "onnanno"]
INCOME_CATEGORIES = ["beton", "bebsha", "freelancing", "tuition",
                     "krishi-ay", "bhara-ay", "shud", "bonus", "upohar-ay",
                     "remittance", "online-ay", "part-time", "commission",
                     "purono-bikri", "rin-ferot", "onnanno-ay"]
ALL_CATEGORIES = EXPENSE_CATEGORIES + INCOME_CATEGORIES


# ---------------------------------------------------------------- models
class EntryIn(BaseModel):
    type: str
    amount: float
    category: str
    note: str = ""
    date: date

    @field_validator("type")
    @classmethod
    def _valid_type(cls, v):
        if v not in ("income", "expense"):
            raise ValueError("type must be income or expense")
        return v

    @field_validator("amount")
    @classmethod
    def _valid_amount(cls, v):
        if v is None or v <= 0:
            raise ValueError("amount must be greater than 0")
        return v

    @field_validator("category")
    @classmethod
    def _valid_category(cls, v):
        if v not in ALL_CATEGORIES:
            raise ValueError(f"unknown category: {v}")
        return v


class ParseIn(BaseModel):
    text: str = ""


def entry_out(e: Entry) -> dict:
    return {"id": e.id, "type": e.type, "amount": e.amount,
            "category": e.category, "note": e.note or "",
            "date": e.date.isoformat()}


def _parse_month(month: str) -> tuple[int, int]:
    if not re.fullmatch(r"\d{4}-\d{2}", month or ""):
        raise HTTPException(status_code=400, detail="month must be YYYY-MM")
    year, mon = int(month[:4]), int(month[5:7])
    if not 1 <= mon <= 12:
        raise HTTPException(status_code=400, detail="month must be YYYY-MM")
    return year, mon


def _month_bounds(year: int, mon: int):
    first = date(year, mon, 1)
    last = date(year, mon, monthrange(year, mon)[1])
    return first, last


def _totals(db: Session, year: int, mon: int, user_id: int) -> dict:
    first, last = _month_bounds(year, mon)
    rows = (db.query(Entry)
            .filter(Entry.user_id == user_id,
                    Entry.date >= first, Entry.date <= last).all())
    income = sum(r.amount for r in rows if r.type == "income")
    expense = sum(r.amount for r in rows if r.type == "expense")
    by_category: dict[str, float] = {}
    for r in rows:
        by_category[r.category] = by_category.get(r.category, 0.0) + r.amount
    return {"income": income, "expense": expense,
            "savings": income - expense, "by_category": by_category}


def _prev_month(year: int, mon: int) -> tuple[int, int]:
    first = date(year, mon, 1) - timedelta(days=1)
    return first.year, first.month


# ---------------------------------------------------------------- auth
def user_out(u: User) -> dict:
    return {"id": u.id, "username": u.username,
            "email": u.email,
            "picture": u.picture or None,
            "provider": u.auth_provider or "google",
            "role": adminmod.effective_role(u),
            "support_until": (u.support_until.isoformat()
                              if u.support_until else None),
            "created_at": u.created_at.isoformat() if u.created_at else None}


def _adopt_legacy_data(db: Session, user: User):
    """No login existed before v6: every entry, push subscription and
    reminder log without an owner now belongs to the FIRST account ever
    created, so the existing user's data is not lost when logins are
    introduced. (Same rule for a Google sign-in that is the first user.)"""
    db.query(Entry).filter(Entry.user_id.is_(None)).update(
        {Entry.user_id: user.id}, synchronize_session=False)
    db.query(PushSubscription).filter(
        PushSubscription.user_id.is_(None)).update(
        {PushSubscription.user_id: user.id}, synchronize_session=False)
    db.query(ReminderLog).filter(
        ReminderLog.user_id.is_(None)).update(
        {ReminderLog.user_id: user.id}, synchronize_session=False)
    db.commit()


class GoogleIn(BaseModel):
    id_token: str = ""


def _username_from_email(email: str, db: Session) -> str:
    """Derive a unique username from the email prefix, e.g.
    roni@gmail.com → "roni", taken → "roni2", "roni3", ..."""
    local = (email or "").split("@")[0].lower()
    local = re.sub(r"[^a-z0-9_]", "_", local).strip("_") or "user"
    if len(local) < 3:
        local = (local + "_user")[:30]
    candidate = local[:30]
    n = 2
    while db.query(User).filter(User.username == candidate).first():
        suffix = str(n)
        candidate = (local[:30 - len(suffix)] + suffix)
        n += 1
    return candidate


@app.post("/api/auth/google")
def google_login(payload: GoogleIn, db: Session = Depends(get_db)):
    """Sign in with Google — the ONLY way to log in. The frontend sends
    the Google Identity Services ID token; the server verifies it with
    Google (signature, audience = our client id, expiry) and then finds
    or creates the account. There is no username/password login at all."""
    if not (payload.id_token or "").strip():
        raise HTTPException(status_code=400, detail="id_token is required")
    info = authmod.verify_google_token(payload.id_token.strip())
    sub = info.get("sub")
    email = (info.get("email") or "").strip().lower()
    if not sub or not email:
        raise HTTPException(status_code=401,
                            detail="Google token has no email")
    user = db.query(User).filter(User.google_sub == sub).first()
    is_new = False
    if not user:
        # Same email, different Google account id (e.g. a Google account
        # recreated by Google): link the Google identity to the existing
        # account instead of creating a duplicate.
        user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(username=_username_from_email(email, db),
                    email=email, google_sub=sub,
                    auth_provider="google", created_at=rem.now_dhaka())
        db.add(user)
        db.commit()
        db.refresh(user)
        is_new = True
        if db.query(User).count() == 1:
            _adopt_legacy_data(db, user)
    elif not user.google_sub:
        user.google_sub = sub
        db.commit()
        db.refresh(user)
    # The permanent admin (Maisha) is always admin, new or existing.
    if email == adminmod.ADMIN_EMAIL:
        user.role = "admin"
        user.support_until = None
    # Google profile photo (ID token "picture" claim) — shown as the
    # header avatar. Only overwritten when the token actually carries
    # one, so an account without a photo keeps picture NULL (frontend
    # falls back to an initial-letter avatar).
    pic = (info.get("picture") or "").strip()
    if pic:
        user.picture = pic
    user.last_login_at = rem.now_dhaka()
    db.commit()
    db.refresh(user)
    return {"user": user_out(user), "token": authmod.create_token(user),
            "is_new": is_new}


@app.get("/api/auth/me")
def me(user: User = Depends(authmod.get_current_user)):
    return {"user": user_out(user)}


# ---------------------------------------------------------------- API
@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/entries")
def list_entries(month: str, db: Session = Depends(get_db),
                 user: User = Depends(authmod.get_current_user)):
    year, mon = _parse_month(month)
    first, last = _month_bounds(year, mon)
    rows = (db.query(Entry)
            .filter(Entry.user_id == user.id,
                    Entry.date >= first, Entry.date <= last)
            .order_by(Entry.date.desc(), Entry.id.desc()).all())
    return [entry_out(r) for r in rows]


@app.post("/api/entries", status_code=201)
def create_entry(payload: EntryIn, db: Session = Depends(get_db),
                 user: User = Depends(authmod.get_current_user)):
    e = Entry(user_id=user.id, type=payload.type, amount=payload.amount,
              category=payload.category, note=payload.note, date=payload.date)
    db.add(e)
    db.commit()
    db.refresh(e)
    return entry_out(e)


@app.put("/api/entries/{entry_id}")
def update_entry(entry_id: int, payload: EntryIn,
                 db: Session = Depends(get_db),
                 user: User = Depends(authmod.get_current_user)):
    # 404 (not 403) when the entry belongs to someone else — so one user
    # cannot even tell whether another user's entry id exists.
    e = db.query(Entry).filter(Entry.id == entry_id,
                               Entry.user_id == user.id).first()
    if not e:
        raise HTTPException(status_code=404, detail="entry not found")
    e.type, e.amount, e.category, e.note, e.date = (
        payload.type, payload.amount, payload.category, payload.note, payload.date)
    db.commit()
    db.refresh(e)
    return entry_out(e)


@app.delete("/api/entries/{entry_id}")
def delete_entry(entry_id: int, db: Session = Depends(get_db),
                 user: User = Depends(authmod.get_current_user)):
    e = db.query(Entry).filter(Entry.id == entry_id,
                               Entry.user_id == user.id).first()
    if not e:
        raise HTTPException(status_code=404, detail="entry not found")
    db.delete(e)
    db.commit()
    return {"deleted": True, "id": entry_id}


# ---------------------------------------------------------------- zero days
class ZeroDayIn(BaseModel):
    date: date


@app.post("/api/zero-days", status_code=201)
def create_zero_day(payload: ZeroDayIn, db: Session = Depends(get_db),
                    user: User = Depends(authmod.get_current_user)):
    """Mark a day as having NO expense and NO income (v10.9 — the
    "আজ কোনো খরচ/আয় নেই" button). A zero day counts as activity for
    reminders, so it never triggers a missed-day reminder. Rejected when
    the date is in the future, when the user already has an entry that
    day, or when the day is already marked (both 409)."""
    d = payload.date
    if d > rem.today_dhaka():
        raise HTTPException(status_code=400,
                            detail="date cannot be in the future")
    if db.query(Entry).filter(Entry.user_id == user.id,
                              Entry.date == d).first():
        raise HTTPException(
            status_code=409,
            detail="entries already exist for this date")
    if db.query(ZeroDay).filter(ZeroDay.user_id == user.id,
                                ZeroDay.date == d).first():
        raise HTTPException(
            status_code=409,
            detail="zero day already recorded for this date")
    row = ZeroDay(user_id=user.id, date=d, created_at=rem.now_dhaka())
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"date": row.date.isoformat()}


@app.get("/api/zero-days")
def list_zero_days(month: str, db: Session = Depends(get_db),
                   user: User = Depends(authmod.get_current_user)):
    year, mon = _parse_month(month)
    first, last = _month_bounds(year, mon)
    rows = (db.query(ZeroDay)
            .filter(ZeroDay.user_id == user.id,
                    ZeroDay.date >= first, ZeroDay.date <= last)
            .order_by(ZeroDay.date).all())
    return [r.date.isoformat() for r in rows]


@app.delete("/api/zero-days/{day}")
def delete_zero_day(day: str, db: Session = Depends(get_db),
                    user: User = Depends(authmod.get_current_user)):
    try:
        d = date.fromisoformat(day)
    except ValueError:
        raise HTTPException(status_code=400,
                            detail="date must be YYYY-MM-DD")
    row = db.query(ZeroDay).filter(ZeroDay.user_id == user.id,
                                   ZeroDay.date == d).first()
    if not row:
        raise HTTPException(status_code=404, detail="zero day not found")
    db.delete(row)
    db.commit()
    return {"deleted": True, "date": d.isoformat()}


@app.post("/api/parse")
def parse_entry(payload: ParseIn):
    return parse_text(payload.text)


@app.get("/api/summary")
def summary(month: str, lang: str = "bn", db: Session = Depends(get_db),
            user: User = Depends(authmod.get_current_user)):
    year, mon = _parse_month(month)
    py, pm = _prev_month(year, mon)
    cur = _totals(db, year, mon, user.id)
    prev = _totals(db, py, pm, user.id)

    def pct_change(new: float, old: float):
        if old == 0:
            return None
        return round((new - old) / old * 100, 1)

    comparison = []
    for cat in ALL_CATEGORIES:
        c = cur["by_category"].get(cat, 0.0)
        p = prev["by_category"].get(cat, 0.0)
        if c == 0 and p == 0:
            continue
        comparison.append({"category": cat, "this_month": c,
                           "last_month": p, "difference": round(c - p, 2),
                           "pct_change": pct_change(c, p)})

    overspend = []
    for cat in EXPENSE_CATEGORIES:
        c = cur["by_category"].get(cat, 0.0)
        p = prev["by_category"].get(cat, 0.0)
        if p > 0 and c > p * 1.3:
            overspend.append({"category": cat,
                              "pct_increase": round((c - p) / p * 100, 1),
                              "this_month": c, "last_month": p})

    advice = generate_advice(cur, prev, lang="bn" if lang == "bn" else "en")

    return {
        "month": month,
        "prev_month": f"{py:04d}-{pm:02d}",
        "income": cur["income"], "expense": cur["expense"],
        "savings": cur["savings"],
        "prev_income": prev["income"], "prev_expense": prev["expense"],
        "prev_savings": prev["savings"],
        "income_pct_change": pct_change(cur["income"], prev["income"]),
        "expense_pct_change": pct_change(cur["expense"], prev["expense"]),
        "savings_pct_change": pct_change(cur["savings"], prev["savings"]),
        "by_category": cur["by_category"],
        "prev_by_category": prev["by_category"],
        "comparison": comparison,
        "overspend": overspend,
        "advice": advice,
    }


# ---------------------------------------------------------------- reminders
class PushSubscribeIn(BaseModel):
    device_id: str = ""
    subscription: dict = {}


class PushUnsubscribeIn(BaseModel):
    device_id: str = ""
    endpoint: str = ""


class ReminderShownIn(BaseModel):
    device_id: str = ""
    due_at: str = ""
    channel: str = "local"


@app.get("/api/config")
def config(db: Session = Depends(get_db)):
    mode, msg = adminmod.maintenance_state(db)
    return {"vapid_public_key": rem.vapid_public_key(),
            "push_enabled": rem.push_enabled(),
            "reminder_hour": rem.REMINDER_HOUR,
            "google_client_id": authmod.google_client_id(),
            "google_enabled": authmod.google_enabled(),
            "maintenance_mode": mode,
            "maintenance_message": msg}


@app.post("/api/push/subscribe", status_code=201)
def push_subscribe(payload: PushSubscribeIn, db: Session = Depends(get_db),
                   user: User = Depends(authmod.get_current_user)):
    sub = payload.subscription or {}
    endpoint = sub.get("endpoint", "")
    keys = sub.get("keys", {}) or {}
    if not endpoint or not keys.get("p256dh") or not keys.get("auth"):
        raise HTTPException(status_code=400,
                            detail="subscription needs endpoint + keys")
    existing = db.query(PushSubscription).filter(
        PushSubscription.endpoint == endpoint).first()
    if existing:
        # Same device/browser now used by this account — the subscription
        # moves to the current user.
        existing.device_id = payload.device_id or existing.device_id
        existing.user_id = user.id
        existing.p256dh, existing.auth = keys["p256dh"], keys["auth"]
        db.commit()
        return {"subscribed": True, "id": existing.id, "updated": True}
    row = PushSubscription(user_id=user.id, device_id=payload.device_id,
                           endpoint=endpoint,
                           p256dh=keys["p256dh"], auth=keys["auth"],
                           created_at=rem.now_dhaka())
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"subscribed": True, "id": row.id, "updated": False}


@app.post("/api/push/unsubscribe")
def push_unsubscribe(payload: PushUnsubscribeIn,
                     db: Session = Depends(get_db),
                     user: User = Depends(authmod.get_current_user)):
    # Only this user's own subscriptions can be removed.
    q = db.query(PushSubscription).filter(
        PushSubscription.user_id == user.id)
    if payload.endpoint:
        q = q.filter(PushSubscription.endpoint == payload.endpoint)
    elif payload.device_id:
        q = q.filter(PushSubscription.device_id == payload.device_id)
    else:
        raise HTTPException(status_code=400,
                            detail="endpoint or device_id required")
    n = q.delete()
    db.commit()
    return {"unsubscribed": n}


@app.get("/api/reminders/status")
def reminder_status(db: Session = Depends(get_db),
                    user: User = Depends(authmod.get_current_user)):
    st = rem.compute_status(db, user_id=user.id)
    st["push_enabled"] = rem.push_enabled()
    st["last_reminder"] = rem.last_reminder_out(db, user_id=user.id)
    return st


@app.get("/api/reminders/history")
def reminder_history(db: Session = Depends(get_db),
                     user: User = Depends(authmod.get_current_user)):
    rows = (db.query(ReminderLog)
            .filter(ReminderLog.user_id == user.id)
            .order_by(ReminderLog.id.desc())
            .limit(30).all())
    return [rem.reminder_out(r) for r in rows]


@app.post("/api/reminders/shown", status_code=201)
def reminder_shown(payload: ReminderShownIn, db: Session = Depends(get_db),
                   user: User = Depends(authmod.get_current_user)):
    """Record a reminder the device showed locally (catch-up while the
    server push never arrived). De-duplicated per user + device + due date."""
    try:
        from datetime import datetime as _dt
        due_at = _dt.fromisoformat(payload.due_at)
    except Exception:
        raise HTTPException(status_code=400, detail="due_at must be ISO datetime")
    if rem.already_logged_today(db, payload.device_id or None,
                                due_at.date(), user_id=user.id):
        return {"recorded": False, "reason": "already logged for this date"}
    row = ReminderLog(user_id=user.id, device_id=payload.device_id or None,
                      kind="daily", channel=payload.channel or "local",
                      due_at=due_at, sent_at=rem.now_dhaka(), status="shown",
                      message=rem.MESSAGE_BN)
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"recorded": True, "id": row.id}


@app.post("/api/reminders/trigger")
def reminder_trigger(x_reminder_secret: str = Header(default=""),
                     db: Session = Depends(get_db)):
    """Daily cron entry point (cron-job.org calls this once a day).
    Header: X-Reminder-Secret: <REMINDER_SECRET env value>.
    Checked per user: only users whose own last entry is more than 1 day
    old get a reminder, sent only to THEIR push subscriptions, with
    per-user de-dup (max one reminder per user per day)."""
    secret = os.environ.get("REMINDER_SECRET", "").strip()
    if not secret:
        raise HTTPException(status_code=503,
                            detail="REMINDER_SECRET not configured")
    if x_reminder_secret != secret:
        raise HTTPException(status_code=401, detail="bad reminder secret")
    now = rem.now_dhaka()
    today = now.date()
    due_at = rem.due_time_for(today)
    users = db.query(User).all()
    sent = failed = skipped = 0
    dead_endpoints = []
    any_due = False
    last_entry_date = None
    missed_dates = []
    for user in users:
        st = rem.compute_status(db, user_id=user.id, now=now)
        if not st["due"]:
            continue
        any_due = True
        last_entry_date = st["last_entry_date"]
        missed_dates = st["missed_dates"]
        subs = db.query(PushSubscription).filter(
            PushSubscription.user_id == user.id).all()
        for sub in subs:
            if rem.already_logged_today(db, sub.device_id, today,
                                        user_id=user.id):
                skipped += 1
                continue
            if not rem.push_enabled():
                skipped += 1
                continue
            payload = {"title": rem.TITLE_BN, "body": rem.MESSAGE_BN,
                       "due_at": due_at.isoformat(), "sent_at": now.isoformat(),
                       "missed_dates": st["missed_dates"]}
            try:
                rem.send_push(sub, payload)
                status = "sent"
                sent += 1
            except Exception as exc:
                status = "failed"
                failed += 1
                # Expired/invalid push endpoint (410 Gone / 404) — stop trying it.
                if "410" in str(exc) or "404" in str(exc):
                    dead_endpoints.append(sub.endpoint)
            db.add(ReminderLog(user_id=user.id, device_id=sub.device_id,
                               kind="daily", channel="push", due_at=due_at,
                               sent_at=now, status=status,
                               message=rem.MESSAGE_BN))
            db.commit()
    for endpoint in dead_endpoints:
        db.query(PushSubscription).filter(
            PushSubscription.endpoint == endpoint).delete()
    db.commit()
    return {"due": any_due, "due_date": today.isoformat(),
            "sent": sent, "failed": failed, "skipped": skipped,
            "subscriptions": db.query(PushSubscription).count(),
            "users_checked": len(users),
            "last_entry_date": last_entry_date,
            "missed_dates": missed_dates}


# ---------------------------------------------------------------- admin (v10)
def admin_user_out(db: Session, u: User) -> dict:
    """One user row for the admin dashboard, with their usage stats."""
    entries = db.query(Entry).filter(Entry.user_id == u.id)
    last = entries.order_by(Entry.date.desc()).first()
    return {
        "id": u.id, "username": u.username, "email": u.email,
        "role": adminmod.effective_role(u),
        "raw_role": u.role or "user",
        "is_main_admin": (u.email or "").lower() == adminmod.ADMIN_EMAIL,
        "support_until": (u.support_until.isoformat()
                          if u.support_until else None),
        "created_at": u.created_at.isoformat() if u.created_at else None,
        "entries_count": entries.count(),
        "last_entry_at": last.date.isoformat() if last else None,
        "last_login_at": (u.last_login_at.isoformat()
                          if u.last_login_at else None),
    }


@app.get("/api/admin/stats")
def admin_stats(db: Session = Depends(get_db),
                user: User = Depends(adminmod.require_staff)):
    """Dashboard numbers: how many users, how active they are, and
    whether maintenance mode is on."""
    now = rem.now_dhaka()
    today = now.date()
    week_ago = today - timedelta(days=7)
    seven_days_ago = now - timedelta(days=7)
    mode, msg = adminmod.maintenance_state(db)
    return {
        "total_users": db.query(User).count(),
        "new_users_7d": db.query(User).filter(
            User.created_at >= seven_days_ago).count(),
        "total_entries": db.query(Entry).count(),
        "entries_today": db.query(Entry).filter(
            Entry.date == today).count(),
        "active_users_7d": db.query(Entry.user_id).filter(
            Entry.date >= week_ago,
            Entry.user_id.is_not(None)).distinct().count(),
        "maintenance_mode": mode,
        "maintenance_message": msg,
    }


@app.get("/api/admin/users")
def admin_users(db: Session = Depends(get_db),
                user: User = Depends(adminmod.require_staff)):
    rows = (db.query(User).order_by(User.created_at.desc())
            .limit(500).all())
    return [admin_user_out(db, u) for u in rows]


class RoleChangeIn(BaseModel):
    role: str = ""
    days: Optional[int] = None


@app.post("/api/admin/users/{user_id}/role")
def admin_set_role(user_id: int, payload: RoleChangeIn,
                   db: Session = Depends(get_db),
                   user: User = Depends(adminmod.require_admin)):
    """Change a user's role. Only the permanent admin can do this.
    Support is time-limited: days must be 2, 3, 7 or 15."""
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="user not found")
    if target.id == user.id:
        raise HTTPException(status_code=403,
                            detail="cannot change your own role")
    if (target.email or "").lower() == adminmod.ADMIN_EMAIL:
        raise HTTPException(status_code=403,
                            detail="cannot change the main admin's role")
    role = (payload.role or "").lower()
    if role not in ("user", "support", "admin"):
        raise HTTPException(status_code=422,
                            detail="role must be user, support or admin")
    if role == "support":
        if payload.days not in (2, 3, 7, 15):
            raise HTTPException(
                status_code=422,
                detail="support needs days of 2, 3, 7 or 15")
        target.support_until = (rem.now_dhaka()
                                + timedelta(days=payload.days))
    else:
        target.support_until = None
    target.role = role
    db.commit()
    db.refresh(target)
    return admin_user_out(db, target)


@app.get("/api/admin/settings")
def admin_get_settings(db: Session = Depends(get_db),
                       user: User = Depends(adminmod.require_staff)):
    mode, msg = adminmod.maintenance_state(db)
    return {"maintenance_mode": mode, "maintenance_message": msg}


class SettingsIn(BaseModel):
    maintenance_mode: bool = False
    maintenance_message: str = ""


@app.post("/api/admin/settings")
def admin_set_settings(payload: SettingsIn,
                       db: Session = Depends(get_db),
                       user: User = Depends(adminmod.require_admin)):
    """Turn maintenance mode on/off (and its message). Only the
    permanent admin can do this — support staff can only view it."""
    adminmod.set_setting(db, "maintenance_mode",
                         "1" if payload.maintenance_mode else "0")
    adminmod.set_setting(db, "maintenance_message",
                         (payload.maintenance_message or "").strip())
    mode, msg = adminmod.maintenance_state(db)
    return {"maintenance_mode": mode, "maintenance_message": msg}


# ---------------------------------------------------------------- frontend
if STATIC_DIR.is_dir():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/manifest.json")
def manifest():
    return FileResponse(str(STATIC_DIR / "manifest.json"),
                        media_type="application/manifest+json")


@app.get("/sw.js")
def service_worker():
    return FileResponse(str(STATIC_DIR / "sw.js"),
                        media_type="application/javascript")


@app.get("/.well-known/assetlinks.json")
def assetlinks():
    # Digital Asset Links: lets the Android app (TWA) open the site
    # fullscreen, verified as the same app (package com.hisabnikash.app).
    return FileResponse(str(STATIC_DIR / ".well-known" / "assetlinks.json"),
                        media_type="application/json")


@app.get("/")
def index():
    return FileResponse(str(STATIC_DIR / "index.html"), media_type="text/html")
