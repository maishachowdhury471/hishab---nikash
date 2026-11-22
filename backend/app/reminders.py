"""Daily reminder rules + Web Push sending for Hisab Nikash.

Rule (per user — every account has its own entries): a reminder is due
when THAT user's last saved entry is more than 1 day old — i.e. at least
one whole day has passed with no entry. Reminder time is 09:00 Asia/Dhaka.
At most one reminder per day per user per device (de-duplicated on the
due date).

Honest platform limit (do not pretend otherwise): a PWA cannot fire a
notification on time when Chrome is fully closed / force-stopped and the
phone is offline — no Notification Triggers in stable Chrome, Periodic
Sync is ~12h minimum and browser-controlled. So the system is layered:
  1. Server Web Push via a daily external trigger (cron-job.org) — works
     when the phone is online, even with the app closed.
  2. In-app + catch-up check on every app load and on the 'online' event —
     any reminder that was due while offline is shown immediately when the
     app opens or the internet returns, WITH its original due time.
  3. Background Sync ('hn-reminder-check') — the service worker re-runs
     the check when connectivity returns, even with the app closed.
  4. Local in-app missed-days card — works fully offline from the last
     known entry date stored on the device.
"""
import json
import os
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from .models import Entry, PushSubscription, ReminderLog

try:
    from pywebpush import Vapid, WebPushException, webpush
    _PYWEBPUSH = True
except Exception:  # pywebpush optional — app still boots without it
    Vapid = WebPushException = webpush = None
    _PYWEBPUSH = False

DHAKA = ZoneInfo("Asia/Dhaka")
REMINDER_HOUR = 9

MESSAGE_BN = ("আজকের হিসাব কি লিখেছো? আজকের দিনটাও তোমার দৈনন্দিন হিসাবের "
              "মধ্যে পড়ে — এখনই অ্যাপে ঢুকে আজকের খরচ বা আয় লিখে ফেলো।")
MESSAGE_EN = ("Have you written today's accounts yet? Today is part of "
              "your daily accounts too — open the app now and write "
              "today's expense or income.")
TITLE_BN = "হিসাব নিকাশ — আজকের হিসাব"
TITLE_EN = "Hisab Nikash — Today's accounts"


def now_dhaka() -> datetime:
    """Current time in Dhaka, naive (DB stores naive datetimes)."""
    return datetime.now(DHAKA).replace(tzinfo=None)


def today_dhaka() -> date:
    return now_dhaka().date()


def due_time_for(d: date) -> datetime:
    """The reminder for day `d` is due at 09:00 Dhaka that day."""
    return datetime.combine(d, time(REMINDER_HOUR, 0))


def push_enabled() -> bool:
    return bool(_PYWEBPUSH and os.environ.get("VAPID_PUBLIC_KEY")
                and os.environ.get("VAPID_PRIVATE_KEY"))


def vapid_public_key():
    return os.environ.get("VAPID_PUBLIC_KEY") or None


def compute_status(db, user_id=None, now=None):
    """Reminder status from ONE user's saved entries.

    Returns dict with last_entry_date, days_since_last_entry, missed_dates
    (whole days with no entry, oldest first, max 30), missed_count, due,
    due_at (09:00 on the latest missed date) and next_due_at.
    Entries without an owner (user_id NULL, from before logins existed)
    belong to nobody and are never counted here.
    """
    now = now or now_dhaka()
    today = now.date()
    q = db.query(Entry.date)
    if user_id is not None:
        q = q.filter(Entry.user_id == user_id)
    row = q.order_by(Entry.date.desc()).first()
    if row is None:
        return {"last_entry_date": None, "days_since_last_entry": None,
                "missed_dates": [], "missed_count": 0, "due": False,
                "due_at": None, "next_due_at": None}
    last = row[0]
    days_since = (today - last).days
    missed = []
    d = last + timedelta(days=1)
    while d < today:
        missed.append(d)
        d += timedelta(days=1)
    missed = missed[-30:]  # keep the list short; missed_count is exact
    due = len(missed) > 0
    if due:
        due_at = due_time_for(missed[-1])
        next_due = due_at
    else:
        due_at = None
        # Next reminder: 09:00 today if it hasn't passed, else tomorrow.
        next_due = due_time_for(today) if now < due_time_for(today) \
            else due_time_for(today + timedelta(days=1))
    return {"last_entry_date": last.isoformat(),
            "days_since_last_entry": days_since,
            "missed_dates": [m.isoformat() for m in missed],
            "missed_count": len(missed), "due": due,
            "due_at": due_at.isoformat() if due_at else None,
            "next_due_at": next_due.isoformat() if next_due else None}


def last_reminder_out(db, user_id=None):
    q = db.query(ReminderLog)
    if user_id is not None:
        q = q.filter(ReminderLog.user_id == user_id)
    row = q.order_by(ReminderLog.id.desc()).first()
    return reminder_out(row) if row else None


def reminder_out(r: ReminderLog) -> dict:
    return {"id": r.id, "device_id": r.device_id, "kind": r.kind,
            "channel": r.channel,
            "due_at": r.due_at.isoformat() if r.due_at else None,
            "sent_at": r.sent_at.isoformat() if r.sent_at else None,
            "status": r.status, "message": r.message or ""}


def already_logged_today(db, device_id, due_date: date, user_id=None) -> bool:
    """One reminder per user per device per due date — the de-dup check."""
    start = datetime.combine(due_date, time(0, 0))
    end = start + timedelta(days=1)
    q = db.query(ReminderLog).filter(
        ReminderLog.kind == "daily",
        ReminderLog.due_at >= start, ReminderLog.due_at < end)
    if user_id is not None:
        q = q.filter(ReminderLog.user_id == user_id)
    if device_id:
        q = q.filter(ReminderLog.device_id == device_id)
    return q.first() is not None


def send_push(sub: PushSubscription, payload: dict):
    """Send one Web Push. Raises on failure (caller records 'failed')."""
    if not push_enabled():
        raise RuntimeError("push not configured (VAPID keys missing)")
    vapid = Vapid.from_string(os.environ["VAPID_PRIVATE_KEY"])
    webpush(
        subscription_info={"endpoint": sub.endpoint,
                           "keys": {"p256dh": sub.p256dh, "auth": sub.auth}},
        data=json.dumps(payload, ensure_ascii=False),
        vapid_private_key=vapid,
        vapid_claims={"sub": os.environ.get(
            "VAPID_SUBJECT", "mailto:admin@example.com")},
        timeout=10,
    )
