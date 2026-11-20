"""SQLAlchemy models."""
from sqlalchemy import Column, Date, DateTime, Float, Integer, String

from .database import Base


class User(Base):
    """One account per person — every entry, summary and reminder belongs
    to exactly one user, so each person's data is fully separate."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False)


class Entry(Base):
    __tablename__ = "entries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    type = Column(String, nullable=False)  # "income" | "expense"
    amount = Column(Float, nullable=False)
    category = Column(String, nullable=False)
    note = Column(String, default="")
    date = Column(Date, nullable=False, index=True)


class PushSubscription(Base):
    """One Web Push subscription per device (browser push endpoint)."""
    __tablename__ = "push_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    device_id = Column(String, nullable=False, index=True)
    endpoint = Column(String, nullable=False, unique=True, index=True)
    p256dh = Column(String, nullable=False)
    auth = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False)


class ReminderLog(Base):
    """Every daily reminder: when it was due and when it was actually
    sent/shown (exact timestamps — shown in the app's history with
    'how long ago'). channel: 'push' (server Web Push) or 'local'
    (shown in-app / via service worker when the user came back online)."""
    __tablename__ = "reminder_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    device_id = Column(String, nullable=True, index=True)
    kind = Column(String, nullable=False, default="daily")
    channel = Column(String, nullable=False, default="push")
    due_at = Column(DateTime, nullable=False, index=True)
    sent_at = Column(DateTime, nullable=True)
    status = Column(String, nullable=False, default="sent")  # sent|failed|shown
    message = Column(String, nullable=False, default="")
