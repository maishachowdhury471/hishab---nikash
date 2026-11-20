"""Database setup: PostgreSQL via DATABASE_URL (Railway) with SQLite fallback.

Sync SQLAlchemy only. Postgres uses the psycopg driver (NOT asyncpg).
"""
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()

if not DATABASE_URL:
    DATABASE_URL = "sqlite:///./hisab.db"

# Railway / Heroku style URLs use postgres:// ; SQLAlchemy needs postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    # SQLite needs check_same_thread=False for use with FastAPI/TestClient.
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def ensure_schema():
    """Lightweight migration for databases created before a schema change.

    `Base.metadata.create_all()` only creates missing TABLES — it never adds
    a column to an existing table. So when a new column (e.g. user_id) is
    added to a model, the live Railway database would keep the old table
    shape and every query touching the new column would crash. This adds
    any missing columns (checked via the inspector, so it is a no-op on a
    fresh database) plus the per-user index. Works on Postgres and SQLite.
    """
    from sqlalchemy import inspect, text

    insp = inspect(engine)
    existing_tables = set(insp.get_table_names())
    needed = {
        "entries": [("user_id", "INTEGER")],
        "push_subscriptions": [("user_id", "INTEGER")],
        "reminder_logs": [("user_id", "INTEGER")],
    }
    with engine.begin() as conn:
        for table, cols in needed.items():
            if table not in existing_tables:
                continue
            have = {c["name"] for c in insp.get_columns(table)}
            for name, coltype in cols:
                if name not in have:
                    conn.execute(
                        text(f"ALTER TABLE {table} ADD COLUMN {name} {coltype}"))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_entries_user_id "
            "ON entries (user_id)"))


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
