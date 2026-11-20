"""AI Hisab Nikash — FastAPI backend + static frontend (single service).

API (prefix /api):
  GET    /api/health
  GET    /api/entries?month=YYYY-MM
  POST   /api/entries
  PUT    /api/entries/{id}
  DELETE /api/entries/{id}
  GET    /api/summary?month=YYYY-MM&lang=bn|en
  POST   /api/parse
  GET    /api/config                        (VAPID public key / push status)
  POST   /api/push/subscribe
  POST   /api/push/unsubscribe
  GET    /api/reminders/status              (last entry, missed days, due?)
  GET    /api/reminders/history             (sent reminders, exact times)
  POST   /api/reminders/trigger             (X-Reminder-Secret header)
  POST   /api/reminders/shown               (record a locally shown reminder)
Frontend served at / ; manifest at /manifest.json ; sw.js at /sw.js.
"""
import os
import re
from calendar import monthrange
from contextlib import asynccontextmanager
from datetime import date, timedelta
from pathlib import Path

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from .advice import generate_advice
from .database import Base, engine, get_db
from .models import Entry, PushSubscription, ReminderLog
from .parser import parse_text
from . import reminders as rem

BASE_DIR = Path(__file__).resolve().parents[2]
STATIC_DIR = BASE_DIR / "static"

@asynccontextmanager
async def _lifespan(_app):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="AI Hisab Nikash", lifespan=_lifespan)

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


def _totals(db: Session, year: int, mon: int) -> dict:
    first, last = _month_bounds(year, mon)
    rows = db.query(Entry).filter(Entry.date >= first, Entry.date <= last).all()
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


# ---------------------------------------------------------------- API
@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/entries")
def list_entries(month: str, db: Session = Depends(get_db)):
    year, mon = _parse_month(month)
    first, last = _month_bounds(year, mon)
    rows = (db.query(Entry)
            .filter(Entry.date >= first, Entry.date <= last)
            .order_by(Entry.date.desc(), Entry.id.desc()).all())
    return [entry_out(r) for r in rows]


@app.post("/api/entries", status_code=201)
def create_entry(payload: EntryIn, db: Session = Depends(get_db)):
    e = Entry(type=payload.type, amount=payload.amount,
              category=payload.category, note=payload.note, date=payload.date)
    db.add(e)
    db.commit()
    db.refresh(e)
    return entry_out(e)


@app.put("/api/entries/{entry_id}")
def update_entry(entry_id: int, payload: EntryIn, db: Session = Depends(get_db)):
    e = db.query(Entry).filter(Entry.id == entry_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="entry not found")
    e.type, e.amount, e.category, e.note, e.date = (
        payload.type, payload.amount, payload.category, payload.note, payload.date)
    db.commit()
    db.refresh(e)
    return entry_out(e)


@app.delete("/api/entries/{entry_id}")
def delete_entry(entry_id: int, db: Session = Depends(get_db)):
    e = db.query(Entry).filter(Entry.id == entry_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="entry not found")
    db.delete(e)
    db.commit()
    return {"deleted": True, "id": entry_id}


@app.post("/api/parse")
def parse_entry(payload: ParseIn):
    return parse_text(payload.text)


@app.get("/api/summary")
def summary(month: str, lang: str = "bn", db: Session = Depends(get_db)):
    year, mon = _parse_month(month)
    py, pm = _prev_month(year, mon)
    cur = _totals(db, year, mon)
    prev = _totals(db, py, pm)

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
def config():
    return {"vapid_public_key": rem.vapid_public_key(),
            "push_enabled": rem.push_enabled(),
            "reminder_hour": rem.REMINDER_HOUR}


@app.post("/api/push/subscribe", status_code=201)
def push_subscribe(payload: PushSubscribeIn, db: Session = Depends(get_db)):
    sub = payload.subscription or {}
    endpoint = sub.get("endpoint", "")
    keys = sub.get("keys", {}) or {}
    if not endpoint or not keys.get("p256dh") or not keys.get("auth"):
        raise HTTPException(status_code=400,
                            detail="subscription needs endpoint + keys")
    existing = db.query(PushSubscription).filter(
        PushSubscription.endpoint == endpoint).first()
    if existing:
        existing.device_id = payload.device_id or existing.device_id
        existing.p256dh, existing.auth = keys["p256dh"], keys["auth"]
        db.commit()
        return {"subscribed": True, "id": existing.id, "updated": True}
    row = PushSubscription(device_id=payload.device_id, endpoint=endpoint,
                           p256dh=keys["p256dh"], auth=keys["auth"],
                           created_at=rem.now_dhaka())
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"subscribed": True, "id": row.id, "updated": False}


@app.post("/api/push/unsubscribe")
def push_unsubscribe(payload: PushUnsubscribeIn, db: Session = Depends(get_db)):
    q = db.query(PushSubscription)
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
def reminder_status(db: Session = Depends(get_db)):
    st = rem.compute_status(db)
    st["push_enabled"] = rem.push_enabled()
    st["last_reminder"] = rem.last_reminder_out(db)
    return st


@app.get("/api/reminders/history")
def reminder_history(db: Session = Depends(get_db)):
    rows = (db.query(ReminderLog).order_by(ReminderLog.id.desc())
            .limit(30).all())
    return [rem.reminder_out(r) for r in rows]


@app.post("/api/reminders/shown", status_code=201)
def reminder_shown(payload: ReminderShownIn, db: Session = Depends(get_db)):
    """Record a reminder the device showed locally (catch-up while the
    server push never arrived). De-duplicated per device + due date."""
    try:
        from datetime import datetime as _dt
        due_at = _dt.fromisoformat(payload.due_at)
    except Exception:
        raise HTTPException(status_code=400, detail="due_at must be ISO datetime")
    if rem.already_logged_today(db, payload.device_id or None, due_at.date()):
        return {"recorded": False, "reason": "already logged for this date"}
    row = ReminderLog(device_id=payload.device_id or None, kind="daily",
                      channel=payload.channel or "local", due_at=due_at,
                      sent_at=rem.now_dhaka(), status="shown",
                      message=rem.MESSAGE_BN)
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"recorded": True, "id": row.id}


@app.post("/api/reminders/trigger")
def reminder_trigger(x_reminder_secret: str = Header(default=""),
                     db: Session = Depends(get_db)):
    """Daily cron entry point (cron-job.org calls this once a day).
    Header: X-Reminder-Secret: <REMINDER_SECRET env value>."""
    secret = os.environ.get("REMINDER_SECRET", "").strip()
    if not secret:
        raise HTTPException(status_code=503,
                            detail="REMINDER_SECRET not configured")
    if x_reminder_secret != secret:
        raise HTTPException(status_code=401, detail="bad reminder secret")
    now = rem.now_dhaka()
    today = now.date()
    st = rem.compute_status(db, now=now)
    if not st["due"]:
        return {"due": False, "sent": 0, "failed": 0, "skipped": 0,
                "subscriptions": db.query(PushSubscription).count(),
                "last_entry_date": st["last_entry_date"]}
    due_at = rem.due_time_for(today)
    subs = db.query(PushSubscription).all()
    sent = failed = skipped = 0
    dead_endpoints = []
    for sub in subs:
        if rem.already_logged_today(db, sub.device_id, today):
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
        db.add(ReminderLog(device_id=sub.device_id, kind="daily",
                           channel="push", due_at=due_at, sent_at=now,
                           status=status, message=rem.MESSAGE_BN))
        db.commit()
    for endpoint in dead_endpoints:
        db.query(PushSubscription).filter(
            PushSubscription.endpoint == endpoint).delete()
    db.commit()
    return {"due": True, "due_date": today.isoformat(),
            "sent": sent, "failed": failed, "skipped": skipped,
            "subscriptions": len(subs),
            "last_entry_date": st["last_entry_date"],
            "missed_dates": st["missed_dates"]}


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


@app.get("/")
def index():
    return FileResponse(str(STATIC_DIR / "index.html"), media_type="text/html")
