"""SQLAlchemy models."""
from sqlalchemy import Column, Date, Float, Integer, String

from .database import Base


class Entry(Base):
    __tablename__ = "entries"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String, nullable=False)  # "income" | "expense"
    amount = Column(Float, nullable=False)
    category = Column(String, nullable=False)
    note = Column(String, default="")
    date = Column(Date, nullable=False, index=True)
