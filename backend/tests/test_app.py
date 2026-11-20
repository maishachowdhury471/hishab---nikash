"""Tests for AI Hisab Nikash. Uses a temp SQLite DB — never touches the
real dev DB. Run from ~/workspace/hisab-nikash/backend with pytest."""
import os
import sys
import tempfile
from datetime import date, timedelta

# Temp DB must be chosen BEFORE importing the app (engine is built at import).
_TMP = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = f"sqlite:///{_TMP}/test.db"

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from fastapi.testclient import TestClient  # noqa: E402

from backend.app.database import Base, engine  # noqa: E402
from backend.app.main import app  # noqa: E402

client = TestClient(app)
TODAY = date.today()
THIS_MONTH = TODAY.strftime("%Y-%m")
LAST_MONTH = (date(TODAY.year, TODAY.month, 1) - timedelta(days=1)).strftime("%Y-%m")


def setup_function():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def _add(payload):
    r = client.post("/api/entries", json=payload)
    assert r.status_code == 201, r.text
    return r.json()


# ---------------------------------------------------------------- parse
def test_parse_bazar_today():
    r = client.post("/api/parse", json={"text": "আজ বাজারে ৫০০ টাকা খরচ"})
    assert r.status_code == 200
    d = r.json()
    assert d["type"] == "expense" and d["amount"] == 500
    assert d["category"] == "bazar" and d["date"] == TODAY.isoformat()


def test_parse_rickshaw_yesterday():
    r = client.post("/api/parse", json={"text": "গতকাল রিকশা ভাড়া ৮০ টাকা"})
    assert r.status_code == 200
    d = r.json()
    assert d["type"] == "expense" and d["amount"] == 80
    assert d["category"] == "jatayat"
    assert d["date"] == (TODAY - timedelta(days=1)).isoformat()


def test_parse_salary_income():
    r = client.post("/api/parse", json={"text": "বেতন পেলাম ৩০০০০ টাকা"})
    assert r.status_code == 200
    d = r.json()
    assert d["type"] == "income" and d["amount"] == 30000
    assert d["category"] == "beton"


def test_parse_bengali_digits():
    r = client.post("/api/parse", json={"text": "আজ বাজারে ৫০০ টাকা খরচ"})
    assert r.json()["amount"] == 500
    r = client.post("/api/parse", json={"text": "ওষুধ কিনলাম ২৫০ টাকা"})
    d = r.json()
    assert d["amount"] == 250 and d["category"] == "oshudh"


def test_parse_bill_and_food_keywords():
    d = client.post("/api/parse", json={"text": "বিদ্যুৎ বিল দিলাম ১২০০ টাকা"}).json()
    assert d["category"] == "bill" and d["amount"] == 1200
    d = client.post("/api/parse", json={"text": "দুপুরে খাবার খেলাম ৩০০ টাকা"}).json()
    assert d["category"] == "khabar" and d["amount"] == 300


def test_parse_no_amount_returns_null():
    d = client.post("/api/parse", json={"text": "আজ বাজারে খরচ"}).json()
    assert d["amount"] is None and d["category"] == "bazar"


# ---------------------------------------------------------------- CRUD
def test_health():
    assert client.get("/api/health").json() == {"status": "ok"}


def test_crud_entry():
    created = _add({"type": "expense", "amount": 500, "category": "bazar",
                    "note": "মাছ", "date": TODAY.isoformat()})
    assert created["id"] and created["note"] == "মাছ"

    rows = client.get(f"/api/entries?month={THIS_MONTH}").json()
    assert len(rows) == 1 and rows[0]["amount"] == 500

    upd = client.put(f"/api/entries/{created['id']}", json={
        "type": "expense", "amount": 600, "category": "bazar",
        "note": "মাছ + সবজি", "date": TODAY.isoformat()}).json()
    assert upd["amount"] == 600

    assert client.delete(f"/api/entries/{created['id']}").status_code == 200
    assert client.get(f"/api/entries?month={THIS_MONTH}").json() == []


def test_create_rejects_bad_amount_and_type():
    r = client.post("/api/entries", json={"type": "expense", "amount": 0,
                                          "category": "bazar", "date": TODAY.isoformat()})
    assert r.status_code == 422
    r = client.post("/api/entries", json={"type": "gift", "amount": 100,
                                          "category": "bazar", "date": TODAY.isoformat()})
    assert r.status_code == 422


def test_update_missing_entry_404():
    r = client.put("/api/entries/99999", json={"type": "expense", "amount": 10,
                   "category": "bazar", "date": TODAY.isoformat()})
    assert r.status_code == 404


# ---------------------------------------------------------------- summary
def test_summary_totals():
    _add({"type": "income", "amount": 30000, "category": "beton",
          "note": "", "date": TODAY.isoformat()})
    _add({"type": "expense", "amount": 500, "category": "bazar",
          "note": "", "date": TODAY.isoformat()})
    _add({"type": "expense", "amount": 200, "category": "khabar",
          "note": "", "date": TODAY.isoformat()})
    s = client.get(f"/api/summary?month={THIS_MONTH}").json()
    assert s["income"] == 30000 and s["expense"] == 700 and s["savings"] == 29300
    assert s["by_category"]["bazar"] == 500 and s["by_category"]["khabar"] == 200


def test_comparison_and_overspend_flag():
    # Last month: bazar 1000. This month: bazar 1500 (+50% -> overspend).
    last = date(TODAY.year, TODAY.month, 1) - timedelta(days=1)
    _add({"type": "expense", "amount": 1000, "category": "bazar",
          "note": "", "date": last.isoformat()})
    _add({"type": "expense", "amount": 1500, "category": "bazar",
          "note": "", "date": TODAY.isoformat()})
    s = client.get(f"/api/summary?month={THIS_MONTH}").json()
    assert s["prev_expense"] == 1000 and s["expense"] == 1500
    assert s["expense_pct_change"] == 50.0
    assert len(s["overspend"]) == 1
    assert s["overspend"][0]["category"] == "bazar"
    assert s["overspend"][0]["pct_increase"] == 50.0
    comp = {c["category"]: c for c in s["comparison"]}
    assert comp["bazar"]["difference"] == 500


def test_no_overspend_when_increase_small():
    last = date(TODAY.year, TODAY.month, 1) - timedelta(days=1)
    _add({"type": "expense", "amount": 1000, "category": "bazar",
          "note": "", "date": last.isoformat()})
    _add({"type": "expense", "amount": 1100, "category": "bazar",
          "note": "", "date": TODAY.isoformat()})
    s = client.get(f"/api/summary?month={THIS_MONTH}").json()
    assert s["overspend"] == []


def test_advice_returns_2_to_4_items():
    _add({"type": "income", "amount": 30000, "category": "beton",
          "note": "", "date": TODAY.isoformat()})
    _add({"type": "expense", "amount": 5000, "category": "bazar",
          "note": "", "date": TODAY.isoformat()})
    _add({"type": "expense", "amount": 1000, "category": "khabar",
          "note": "", "date": TODAY.isoformat()})
    s = client.get(f"/api/summary?month={THIS_MONTH}&lang=bn").json()
    assert 2 <= len(s["advice"]) <= 4
    assert any("বাজার" in a for a in s["advice"])  # top category named
    s_en = client.get(f"/api/summary?month={THIS_MONTH}&lang=en").json()
    assert 2 <= len(s_en["advice"]) <= 4
    assert any("Bazar" in a for a in s_en["advice"])


def test_advice_empty_month():
    s = client.get(f"/api/summary?month={THIS_MONTH}").json()
    assert 2 <= len(s["advice"]) <= 4
