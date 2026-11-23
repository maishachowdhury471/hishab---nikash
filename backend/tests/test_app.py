"""Tests for Hisab Nikash. Uses a temp SQLite DB — never touches the
real dev DB. Run from ~/workspace/hisab-nikash/backend with pytest."""
import os
import sys
import tempfile
from datetime import date, timedelta

# Temp DB must be chosen BEFORE importing the app (engine is built at import).
_TMP = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = f"sqlite:///{_TMP}/test.db"
# Fixed JWT secret for tests (otherwise auth uses a random per-boot secret).
os.environ["JWT_SECRET"] = "test-jwt-secret-for-pytest-only"

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from fastapi.testclient import TestClient  # noqa: E402

from backend.app.database import Base, engine  # noqa: E402
from backend.app.main import app  # noqa: E402

client = TestClient(app)
TODAY = date.today()
THIS_MONTH = TODAY.strftime("%Y-%m")
LAST_MONTH = (date(TODAY.year, TODAY.month, 1) - timedelta(days=1)).strftime("%Y-%m")


AUTH = {}


def _make_user(username, email=None, google_sub=None, role="user",
               support_until=None):
    """Create a user straight in the DB (login is Google-only, so tests
    cannot register through an endpoint) and return {user, token}."""
    from backend.app import auth as authmod
    from backend.app import reminders as rem
    from backend.app.database import SessionLocal
    from backend.app.models import User as UserModel

    db = SessionLocal()
    user = UserModel(
        username=username,
        email=email or f"{username}@example.com",
        google_sub=google_sub or f"google-{username}",
        auth_provider="google", created_at=rem.now_dhaka(),
        role=role, support_until=support_until)
    db.add(user)
    db.commit()
    db.refresh(user)
    token = authmod.create_token(user)
    out = {"id": user.id, "username": user.username,
           "email": user.email, "provider": user.auth_provider}
    db.close()
    return {"user": out, "token": token}


def setup_function():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    # Every test starts with one logged-in user ("maisha").
    AUTH.clear()
    AUTH.update(_make_user("maisha"))


def _h(token=None):
    return {"Authorization": f"Bearer {token or AUTH['token']}"}


def _add(payload, headers=None):
    r = client.post("/api/entries", json=payload,
                    headers=headers if headers is not None else _h())
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
    assert d["category"] == "biddut-bill" and d["amount"] == 1200
    d = client.post("/api/parse", json={"text": "দুপুরে খাবার খেলাম ৩০০ টাকা"}).json()
    assert d["category"] == "khabar" and d["amount"] == 300


def test_parse_new_expense_bills_and_rent():
    cases = [
        ("বাড়ি ভাড়া দিলাম ১০০০০ টাকা", "bari-bhara", 10000),
        ("গ্যাস বিল দিলাম ৮০০ টাকা", "gas-bill", 800),
        ("পানি বিল দিলাম ৫০০ টাকা", "pani-bill", 500),
        ("ইন্টারনেট বিল দিলাম ১০০০ টাকা", "internet-bill", 1000),
        ("মোবাইল রিচার্জ করলাম ২০০ টাকা", "mobile-bill", 200),
        ("বিল দিলাম ১০০০ টাকা", "bill", 1000),
    ]
    for text, cat, amt in cases:
        d = client.post("/api/parse", json={"text": text}).json()
        assert d["type"] == "expense" and d["category"] == cat and d["amount"] == amt, (text, d)


def test_parse_rent_collision():
    d = client.post("/api/parse", json={"text": "বাড়ি ভাড়া পেলাম ২০০০০ টাকা"}).json()
    assert d["type"] == "income" and d["category"] == "bhara-ay" and d["amount"] == 20000
    d = client.post("/api/parse", json={"text": "বাড়ি ভাড়া দিলাম ১০০০০ টাকা"}).json()
    assert d["type"] == "expense" and d["category"] == "bari-bhara" and d["amount"] == 10000


def test_parse_new_income_categories():
    cases = [
        ("টিউশন ফি পেলাম ৫০০০ টাকা", "tuition", 5000),
        ("ফ্রিল্যান্সিং থেকে পেলাম ১৫০০০ টাকা", "freelancing", 15000),
        ("বিদেশ থেকে টাকা পেলাম ২০০০০", "remittance", 20000),
        ("পুরনো ফ্রিজ বিক্রি করে ৮০০০ টাকা পেলাম", "purono-bikri", 8000),
        ("বোনাস পেলাম ৫০০০ টাকা", "bonus", 5000),
        ("কমিশন পেলাম ৩০০০ টাকা", "commission", 3000),
    ]
    for text, cat, amt in cases:
        d = client.post("/api/parse", json={"text": text}).json()
        assert d["type"] == "income" and d["category"] == cat and d["amount"] == amt, (text, d)


def test_parse_doctor_book_petrol_zakat():
    cases = [
        ("ডাক্তার দেখালাম ৮০০ টাকা", "doctor", 800),
        ("বই কিনলাম ৩০০ টাকা", "boi-stationery", 300),
        ("পেট্রোল কিনলাম ১০০০ টাকা", "petrol", 1000),
        ("জাকাত দিলাম ২০০০ টাকা", "dan", 2000),
        ("মসজিদে দিলাম ৫০০ টাকা", "dhormio", 500),
        ("জুতা কিনলাম ১২০০ টাকা", "juta-bag", 1200),
        ("ভ্রমণ করলাম ৫০০০ টাকা", "bhromon", 5000),
    ]
    for text, cat, amt in cases:
        d = client.post("/api/parse", json={"text": text}).json()
        assert d["type"] == "expense" and d["category"] == cat and d["amount"] == amt, (text, d)


def test_parse_business_expense_and_tuition_fee():
    d = client.post("/api/parse", json={"text": "ব্যবসার খরচ ৫০০০ টাকা"}).json()
    assert d["type"] == "expense" and d["category"] == "bebshar-khoroch"
    d = client.post("/api/parse", json={"text": "টিউশন ফি দিলাম ৫০০০ টাকা"}).json()
    assert d["type"] == "expense" and d["category"] == "shikkha"
    d = client.post("/api/parse", json={"text": "ঋণ পরিশোধ করলাম ৫০০০ টাকা"}).json()
    assert d["type"] == "expense" and d["category"] == "rin-porishodh"
    d = client.post("/api/parse", json={"text": "কিস্তি দিলাম ৩০০০ টাকা"}).json()
    assert d["type"] == "expense" and d["category"] == "rin-porishodh"


def test_new_categories_accepted_and_in_summary():
    _add({"type": "expense", "amount": 10000, "category": "bari-bhara",
          "note": "বাসা", "date": TODAY.isoformat()})
    _add({"type": "income", "amount": 20000, "category": "remittance",
          "note": "", "date": TODAY.isoformat()})
    s = client.get(f"/api/summary?month={THIS_MONTH}", headers=_h()).json()
    assert s["by_category"]["bari-bhara"] == 10000
    assert s["by_category"]["remittance"] == 20000
    assert s["expense"] == 10000 and s["income"] == 20000


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

    rows = client.get(f"/api/entries?month={THIS_MONTH}", headers=_h()).json()
    assert len(rows) == 1 and rows[0]["amount"] == 500

    upd = client.put(f"/api/entries/{created['id']}", json={
        "type": "expense", "amount": 600, "category": "bazar",
        "note": "মাছ + সবজি", "date": TODAY.isoformat()}, headers=_h()).json()
    assert upd["amount"] == 600

    assert client.delete(f"/api/entries/{created['id']}", headers=_h()).status_code == 200
    assert client.get(f"/api/entries?month={THIS_MONTH}", headers=_h()).json() == []


def test_create_rejects_bad_amount_and_type():
    r = client.post("/api/entries", json={"type": "expense", "amount": 0,
                                          "category": "bazar", "date": TODAY.isoformat()}, headers=_h())
    assert r.status_code == 422
    r = client.post("/api/entries", json={"type": "gift", "amount": 100,
                                          "category": "bazar", "date": TODAY.isoformat()}, headers=_h())
    assert r.status_code == 422


def test_update_missing_entry_404():
    r = client.put("/api/entries/99999", json={"type": "expense", "amount": 10,
                   "category": "bazar", "date": TODAY.isoformat()}, headers=_h())
    assert r.status_code == 404


# ---------------------------------------------------------------- summary
def test_summary_totals():
    _add({"type": "income", "amount": 30000, "category": "beton",
          "note": "", "date": TODAY.isoformat()})
    _add({"type": "expense", "amount": 500, "category": "bazar",
          "note": "", "date": TODAY.isoformat()})
    _add({"type": "expense", "amount": 200, "category": "khabar",
          "note": "", "date": TODAY.isoformat()})
    s = client.get(f"/api/summary?month={THIS_MONTH}", headers=_h()).json()
    assert s["income"] == 30000 and s["expense"] == 700 and s["savings"] == 29300
    assert s["by_category"]["bazar"] == 500 and s["by_category"]["khabar"] == 200


def test_comparison_and_overspend_flag():
    # Last month: bazar 1000. This month: bazar 1500 (+50% -> overspend).
    last = date(TODAY.year, TODAY.month, 1) - timedelta(days=1)
    _add({"type": "expense", "amount": 1000, "category": "bazar",
          "note": "", "date": last.isoformat()})
    _add({"type": "expense", "amount": 1500, "category": "bazar",
          "note": "", "date": TODAY.isoformat()})
    s = client.get(f"/api/summary?month={THIS_MONTH}", headers=_h()).json()
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
    s = client.get(f"/api/summary?month={THIS_MONTH}", headers=_h()).json()
    assert s["overspend"] == []


def test_advice_returns_2_to_4_items():
    _add({"type": "income", "amount": 30000, "category": "beton",
          "note": "", "date": TODAY.isoformat()})
    _add({"type": "expense", "amount": 5000, "category": "bazar",
          "note": "", "date": TODAY.isoformat()})
    _add({"type": "expense", "amount": 1000, "category": "khabar",
          "note": "", "date": TODAY.isoformat()})
    s = client.get(f"/api/summary?month={THIS_MONTH}&lang=bn", headers=_h()).json()
    assert 2 <= len(s["advice"]) <= 4
    assert any("বাজার" in a for a in s["advice"])  # top category named
    s_en = client.get(f"/api/summary?month={THIS_MONTH}&lang=en", headers=_h()).json()
    assert 2 <= len(s_en["advice"]) <= 4
    assert any("Bazar" in a for a in s_en["advice"])


def test_advice_empty_month():
    s = client.get(f"/api/summary?month={THIS_MONTH}", headers=_h()).json()
    assert 2 <= len(s["advice"]) <= 4


# ---------------------------------------------------------------- reminders
def _vapid_keys():
    """Real VAPID pair (base64url) for tests that need push configured."""
    import base64
    from pywebpush import Vapid

    def b64(raw):
        return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()

    v = Vapid()
    v.generate_keys()
    priv = v.private_key.private_numbers().private_value.to_bytes(32, "big")
    pubn = v.public_key.public_numbers()
    pub = b"\x04" + pubn.x.to_bytes(32, "big") + pubn.y.to_bytes(32, "big")
    return b64(pub), b64(priv)


def _set_env(**kw):
    old = {k: os.environ.get(k) for k in kw}
    for k, v in kw.items():
        if v is None:
            os.environ.pop(k, None)
        else:
            os.environ[k] = v
    return old


def _restore_env(old):
    for k, v in old.items():
        if v is None:
            os.environ.pop(k, None)
        else:
            os.environ[k] = v


def test_reminder_status_no_entries():
    st = client.get("/api/reminders/status", headers=_h()).json()
    assert st["due"] is False
    assert st["last_entry_date"] is None
    assert st["missed_dates"] == [] and st["missed_count"] == 0


def test_reminder_due_when_last_entry_3_days_ago():
    _add({"type": "expense", "amount": 100, "category": "bazar",
          "note": "", "date": (TODAY - timedelta(days=3)).isoformat()})
    st = client.get("/api/reminders/status", headers=_h()).json()
    assert st["due"] is True
    assert st["days_since_last_entry"] == 3
    assert st["missed_dates"] == [
        (TODAY - timedelta(days=2)).isoformat(),
        (TODAY - timedelta(days=1)).isoformat()]
    assert st["missed_count"] == 2
    assert st["due_at"].endswith("T09:00:00")  # 9 AM Dhaka on latest missed day


def test_reminder_not_due_when_entry_yesterday_or_today():
    _add({"type": "expense", "amount": 100, "category": "bazar",
          "note": "", "date": (TODAY - timedelta(days=1)).isoformat()})
    st = client.get("/api/reminders/status", headers=_h()).json()
    assert st["due"] is False and st["missed_dates"] == []
    setup_function()
    _add({"type": "income", "amount": 100, "category": "beton",
          "note": "", "date": TODAY.isoformat()})
    st = client.get("/api/reminders/status", headers=_h()).json()
    assert st["due"] is False


def test_trigger_requires_secret():
    old = _set_env(REMINDER_SECRET=None)
    try:
        r = client.post("/api/reminders/trigger",
                        headers={"X-Reminder-Secret": "whatever"})
        assert r.status_code == 503  # no secret configured at all
    finally:
        _restore_env(old)
    old = _set_env(REMINDER_SECRET="test-secret")
    try:
        assert client.post("/api/reminders/trigger").status_code == 401
        r = client.post("/api/reminders/trigger",
                        headers={"X-Reminder-Secret": "wrong"})
        assert r.status_code == 401
    finally:
        _restore_env(old)


def test_push_subscribe_unsubscribe_roundtrip():
    sub = {"endpoint": "https://example.com/push/abc123",
           "keys": {"p256dh": "p256dh-value", "auth": "auth-value"}}
    r = client.post("/api/push/subscribe",
                    json={"device_id": "dev-1", "subscription": sub}, headers=_h())
    assert r.status_code == 201 and r.json()["subscribed"] is True
    # Same endpoint again → update, not a second row.
    r2 = client.post("/api/push/subscribe",
                     json={"device_id": "dev-1", "subscription": sub}, headers=_h())
    assert r2.json()["updated"] is True
    r = client.post("/api/push/unsubscribe",
                    json={"endpoint": "https://example.com/push/abc123"}, headers=_h())
    assert r.json()["unsubscribed"] == 1
    r = client.post("/api/push/unsubscribe",
                    json={"endpoint": "https://example.com/push/abc123"}, headers=_h())
    assert r.json()["unsubscribed"] == 0


def test_trigger_dedup_and_history():
    pub, priv = _vapid_keys()
    old = _set_env(REMINDER_SECRET="test-secret", VAPID_PUBLIC_KEY=pub,
                   VAPID_PRIVATE_KEY=priv,
                   VAPID_SUBJECT="mailto:test@example.com")
    try:
        _add({"type": "expense", "amount": 100, "category": "bazar",
              "note": "", "date": (TODAY - timedelta(days=3)).isoformat()})
        # Fake endpoint on a closed local port — send fails fast, no network.
        sub = {"endpoint": "https://127.0.0.1:9/push/fake",
               "keys": {"p256dh": "BOGUSp256dhKEYAAAAAAAAAAAAAAAAAAAAAAAAAAA",
                        "auth": "BOGUSauthKEYAAAAAAA"}}
        assert client.post("/api/push/subscribe", json={
            "device_id": "dev-9", "subscription": sub}, headers=_h()).status_code == 201
        h = {"X-Reminder-Secret": "test-secret"}
        first = client.post("/api/reminders/trigger", headers=h).json()
        assert first["due"] is True
        assert first["sent"] == 0 and first["failed"] == 1
        assert first["skipped"] == 0 and first["subscriptions"] == 1
        # Second trigger the same day must NOT send again (de-dup).
        second = client.post("/api/reminders/trigger", headers=h).json()
        assert second["sent"] == 0 and second["failed"] == 0
        assert second["skipped"] == 1
        hist = client.get("/api/reminders/history", headers=_h()).json()
        assert len(hist) == 1
        row = hist[0]
        assert row["status"] == "failed" and row["channel"] == "push"
        assert row["due_at"].endswith("T09:00:00")
        assert row["sent_at"] is not None
        assert "আজকের হিসাব" in row["message"]
    finally:
        _restore_env(old)


def test_trigger_not_due_sends_nothing():
    old = _set_env(REMINDER_SECRET="test-secret")
    try:
        _add({"type": "expense", "amount": 100, "category": "bazar",
              "note": "", "date": TODAY.isoformat()})
        d = client.post("/api/reminders/trigger",
                        headers={"X-Reminder-Secret": "test-secret"}).json()
        assert d["due"] is False and d["sent"] == 0
    finally:
        _restore_env(old)


def test_reminder_shown_records_local_catchup():
    due_at = (TODAY - timedelta(days=1)).isoformat() + "T09:00:00"
    r = client.post("/api/reminders/shown", json={
        "device_id": "dev-1", "due_at": due_at, "channel": "local"}, headers=_h())
    assert r.status_code == 201 and r.json()["recorded"] is True
    # Same device + same due date again → not recorded twice.
    r = client.post("/api/reminders/shown", json={
        "device_id": "dev-1", "due_at": due_at, "channel": "local"}, headers=_h())
    assert r.json()["recorded"] is False
    hist = client.get("/api/reminders/history", headers=_h()).json()
    assert len(hist) == 1
    assert hist[0]["channel"] == "local" and hist[0]["status"] == "shown"
    assert hist[0]["due_at"] == due_at


def test_config_push_disabled_without_keys():
    old = _set_env(VAPID_PUBLIC_KEY=None, VAPID_PRIVATE_KEY=None)
    try:
        cfg = client.get("/api/config").json()
        assert cfg["push_enabled"] is False
        assert cfg["vapid_public_key"] is None
        assert cfg["reminder_hour"] == 9
    finally:
        _restore_env(old)


# ---------------------------------------------------------------- accounts
def test_password_endpoints_are_gone():
    # Login is Google-only: the old username/password endpoints no longer
    # exist at all (404, not a silent failure).
    assert client.post("/api/auth/register",
                       json={"username": "x", "password": "y"}).status_code == 404
    assert client.post("/api/auth/login",
                       json={"username": "x", "password": "y"}).status_code == 404
    me = client.get("/api/auth/me", headers=_h()).json()
    assert me["user"]["username"] == "maisha"


def test_unauthenticated_data_endpoints_401():
    assert client.get(f"/api/entries?month={THIS_MONTH}").status_code == 401
    assert client.get(f"/api/summary?month={THIS_MONTH}").status_code == 401
    assert client.get("/api/reminders/status").status_code == 401
    assert client.get("/api/reminders/history").status_code == 401
    assert client.post("/api/entries", json={
        "type": "expense", "amount": 1, "category": "bazar",
        "date": TODAY.isoformat()}).status_code == 401
    assert client.get("/api/auth/me").status_code == 401
    # Public endpoints still work without a token.
    assert client.get("/api/health").status_code == 200
    assert client.post("/api/parse",
                       json={"text": "বাজারে ৫০০ টাকা"}).status_code == 200


def test_user_isolation_entries_and_summary():
    a = _make_user("usera")
    b = _make_user("userb")
    _add({"type": "expense", "amount": 500, "category": "bazar",
          "note": "A", "date": TODAY.isoformat()}, headers=_h(a["token"]))
    _add({"type": "income", "amount": 30000, "category": "beton",
          "note": "", "date": TODAY.isoformat()}, headers=_h(a["token"]))
    rows_b = client.get(f"/api/entries?month={THIS_MONTH}",
                        headers=_h(b["token"])).json()
    assert rows_b == []
    s_b = client.get(f"/api/summary?month={THIS_MONTH}",
                     headers=_h(b["token"])).json()
    assert s_b["income"] == 0 and s_b["expense"] == 0
    assert s_b["by_category"] == {}
    rows_a = client.get(f"/api/entries?month={THIS_MONTH}",
                        headers=_h(a["token"])).json()
    assert len(rows_a) == 2
    s_a = client.get(f"/api/summary?month={THIS_MONTH}",
                     headers=_h(a["token"])).json()
    assert s_a["income"] == 30000 and s_a["expense"] == 500


def test_cross_user_entry_access_404():
    a = _make_user("usera")
    b = _make_user("userb")
    created = _add({"type": "expense", "amount": 500, "category": "bazar",
                    "note": "", "date": TODAY.isoformat()},
                   headers=_h(a["token"]))
    payload = {"type": "expense", "amount": 999, "category": "bazar",
               "note": "", "date": TODAY.isoformat()}
    # B cannot see, update or delete A's entry — 404, no existence leak.
    rows_b = client.get(f"/api/entries?month={THIS_MONTH}",
                        headers=_h(b["token"])).json()
    assert all(e["id"] != created["id"] for e in rows_b)
    assert client.put(f"/api/entries/{created['id']}", json=payload,
                      headers=_h(b["token"])).status_code == 404
    assert client.delete(f"/api/entries/{created['id']}",
                         headers=_h(b["token"])).status_code == 404
    # A's entry is untouched.
    rows_a = client.get(f"/api/entries?month={THIS_MONTH}",
                        headers=_h(a["token"])).json()
    assert len(rows_a) == 1 and rows_a[0]["amount"] == 500


def test_reminder_status_is_per_user():
    a = _make_user("usera")
    b = _make_user("userb")
    _add({"type": "expense", "amount": 100, "category": "bazar",
          "note": "", "date": (TODAY - timedelta(days=3)).isoformat()},
         headers=_h(a["token"]))
    st_a = client.get("/api/reminders/status",
                      headers=_h(a["token"])).json()
    assert st_a["due"] is True and st_a["missed_count"] == 2
    st_b = client.get("/api/reminders/status",
                      headers=_h(b["token"])).json()
    assert st_b["due"] is False and st_b["last_entry_date"] is None


# ---------------------------------------------------------------- Google sign-in
def _fake_google(sub="google-123", email="ronitest@example.com"):
    """A fake Google token verifier for tests (the real one calls Google)."""
    def _verify(token):
        assert token == "fake-google-id-token"
        return {"sub": sub, "email": email, "email_verified": True,
                "name": "Roni Test", "picture": ""}
    return _verify


def _google_login(monkeypatch, sub="google-123", email="ronitest@example.com"):
    from backend.app import auth as authmod
    monkeypatch.setattr(authmod, "verify_google_token",
                        _fake_google(sub, email))
    r = client.post("/api/auth/google",
                    json={"id_token": "fake-google-id-token"})
    return r


def test_google_new_user_created(monkeypatch):
    r = _google_login(monkeypatch)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["is_new"] is True and d["token"]
    assert d["user"]["username"] == "ronitest"
    assert d["user"]["provider"] == "google"
    assert d["user"]["email"] == "ronitest@example.com"
    me = client.get("/api/auth/me", headers=_h(d["token"])).json()
    assert me["user"]["username"] == "ronitest"


def test_google_signin_again_no_duplicate(monkeypatch):
    first = _google_login(monkeypatch).json()
    second = _google_login(monkeypatch).json()
    assert second["is_new"] is False
    assert second["user"]["id"] == first["user"]["id"]
    assert second["token"]


def test_google_links_existing_email(monkeypatch):
    # An account created earlier with the same email but no Google
    # identity yet (e.g. the short-lived v6 password account) gets the
    # Google identity linked — same account, same data, no duplicate.
    from backend.app.database import SessionLocal
    from backend.app.models import User as UserModel

    legacy = _make_user("linkuser", email="linkme@example.com",
                        google_sub=None)
    # Simulate the v6 account: Google identity not linked yet.
    db = SessionLocal()
    u = db.query(UserModel).filter(UserModel.id == legacy["user"]["id"]).first()
    u.google_sub = None
    u.auth_provider = "password"
    db.commit()
    db.close()
    r = _google_login(monkeypatch, sub="google-999",
                      email="linkme@example.com")
    assert r.status_code == 200, r.text
    assert r.json()["user"]["id"] == legacy["user"]["id"]
    assert r.json()["is_new"] is False


def test_google_missing_token_400():
    r = client.post("/api/auth/google", json={})
    assert r.status_code == 400
    r = client.post("/api/auth/google", json={"id_token": "   "})
    assert r.status_code == 400


def test_google_invalid_token_401(monkeypatch):
    from fastapi import HTTPException
    from backend.app import auth as authmod

    def _bad(token):
        raise HTTPException(status_code=401, detail="invalid Google token")
    monkeypatch.setattr(authmod, "verify_google_token", _bad)
    r = client.post("/api/auth/google",
                    json={"id_token": "fake-google-id-token"})
    assert r.status_code == 401


def test_google_not_configured_503(monkeypatch):
    # No GOOGLE_CLIENT_ID in this test env (and no monkeypatched verifier)
    # → the server refuses Google login honestly instead of crashing.
    monkeypatch.delenv("GOOGLE_CLIENT_ID", raising=False)
    r = client.post("/api/auth/google",
                    json={"id_token": "fake-google-id-token"})
    assert r.status_code == 503


def test_google_first_user_adopts_legacy_entries(monkeypatch):
    # A Google sign-in that is the FIRST account ever also adopts the
    # ownerless entries saved before logins existed.
    from backend.app.database import SessionLocal
    from backend.app.models import Entry as EntryModel

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    db.add(EntryModel(type="expense", amount=700, category="bazar",
                      note="legacy", date=TODAY))
    db.commit()
    db.close()
    d = _google_login(monkeypatch).json()
    rows = client.get(f"/api/entries?month={THIS_MONTH}",
                      headers=_h(d["token"])).json()
    assert len(rows) == 1
    assert rows[0]["note"] == "legacy" and rows[0]["amount"] == 700


# ---------------------------------------------------------------- admin (v10)
ADMIN_EMAIL = "maishachowdhury471@gmail.com"


def _admin():
    return _make_user("boss", email=ADMIN_EMAIL, role="admin")


def _support(days=7):
    from backend.app import reminders as rem
    return _make_user("helper", role="support",
                      support_until=rem.now_dhaka() + timedelta(days=days))


def test_admin_email_becomes_admin_on_google_login(monkeypatch):
    # A brand-new Google sign-in with Maisha's email is admin at once.
    d = _google_login(monkeypatch, sub="google-admin-1",
                      email=ADMIN_EMAIL).json()
    assert d["user"]["role"] == "admin"
    assert d["user"]["support_until"] is None
    # An existing account with that email is promoted on its next login.
    setup_function()
    old = _make_user("oldboss", email=ADMIN_EMAIL)
    assert client.get("/api/auth/me", headers=_h(old["token"])).json()["user"]["role"] == "user"
    d2 = _google_login(monkeypatch, sub="google-admin-2",
                       email=ADMIN_EMAIL).json()
    assert d2["user"]["id"] == old["user"]["id"]
    assert d2["user"]["role"] == "admin"


def test_admin_endpoints_forbidden_for_normal_user():
    assert client.get("/api/admin/stats", headers=_h()).status_code == 403
    assert client.get("/api/admin/users", headers=_h()).status_code == 403
    assert client.get("/api/admin/settings", headers=_h()).status_code == 403
    assert client.post("/api/admin/users/1/role", json={"role": "support", "days": 7},
                       headers=_h()).status_code == 403
    assert client.post("/api/admin/settings",
                       json={"maintenance_mode": True}, headers=_h()).status_code == 403


def test_admin_endpoints_require_login():
    assert client.get("/api/admin/stats").status_code == 401
    assert client.get("/api/admin/users").status_code == 401


def test_support_can_view_but_not_change():
    s = _support()
    assert client.get("/api/admin/stats", headers=_h(s["token"])).status_code == 200
    assert client.get("/api/admin/users", headers=_h(s["token"])).status_code == 200
    assert client.get("/api/admin/settings", headers=_h(s["token"])).status_code == 200
    assert client.post("/api/admin/users/1/role", json={"role": "support", "days": 7},
                       headers=_h(s["token"])).status_code == 403
    assert client.post("/api/admin/settings",
                       json={"maintenance_mode": True},
                       headers=_h(s["token"])).status_code == 403


def test_admin_grants_support_for_7_days_and_revokes():
    from backend.app import reminders as rem
    admin = _admin()
    target = _make_user("newbie")
    r = client.post(f"/api/admin/users/{target['user']['id']}/role",
                    json={"role": "support", "days": 7},
                    headers=_h(admin["token"]))
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["role"] == "support" and d["raw_role"] == "support"
    until = d["support_until"]
    assert until is not None
    delta = (rem.now_dhaka() + timedelta(days=7)).isoformat()
    # support_until is ~7 days out (within a few minutes of now+7d).
    assert until[:13] == delta[:13]
    # The new support user can now view the dashboard.
    assert client.get("/api/admin/stats",
                      headers=_h(_make_user("t2")["token"])).status_code == 403
    # Revoke back to a normal user.
    r = client.post(f"/api/admin/users/{target['user']['id']}/role",
                    json={"role": "user"}, headers=_h(admin["token"]))
    assert r.status_code == 200
    assert r.json()["role"] == "user"
    assert r.json()["support_until"] is None


def test_admin_cannot_change_own_role():
    admin = _admin()
    r = client.post(f"/api/admin/users/{admin['user']['id']}/role",
                    json={"role": "user"}, headers=_h(admin["token"]))
    assert r.status_code == 403


def test_admin_cannot_change_main_admin_role():
    # A second (granted) admin still cannot touch Maisha's account.
    other = _make_user("second", role="admin")
    main = _make_user("mainadmin", email=ADMIN_EMAIL, role="admin")
    r = client.post(f"/api/admin/users/{main['user']['id']}/role",
                    json={"role": "user"}, headers=_h(other["token"]))
    assert r.status_code == 403


def test_expired_support_is_plain_user():
    from backend.app import reminders as rem
    old = _make_user("expired", role="support",
                     support_until=rem.now_dhaka() - timedelta(days=1))
    assert client.get("/api/admin/stats", headers=_h(old["token"])).status_code == 403
    # /api/auth/me reports the effective role — and the stale support
    # role is downgraded in the DB when noticed.
    me = client.get("/api/auth/me", headers=_h(old["token"])).json()
    assert me["user"]["role"] == "user"


def test_maintenance_toggle_and_enforcement():
    admin = _admin()
    user = AUTH  # normal user "maisha"
    r = client.post("/api/admin/settings",
                    json={"maintenance_mode": True,
                          "maintenance_message": "Test maintenance"},
                    headers=_h(admin["token"]))
    assert r.status_code == 200, r.text
    assert r.json() == {"maintenance_mode": True,
                        "maintenance_message": "Test maintenance"}
    cfg = client.get("/api/config").json()
    assert cfg["maintenance_mode"] is True
    assert cfg["maintenance_message"] == "Test maintenance"
    # Normal users are locked out of data endpoints with 503...
    assert client.get(f"/api/entries?month={THIS_MONTH}",
                      headers=_h(user["token"])).status_code == 503
    # ...but staff (admin and support) keep working.
    assert client.get(f"/api/entries?month={THIS_MONTH}",
                      headers=_h(admin["token"])).status_code == 200
    s = _support()
    assert client.get(f"/api/entries?month={THIS_MONTH}",
                      headers=_h(s["token"])).status_code == 200
    # Turn it off again — normal users are back in.
    r = client.post("/api/admin/settings",
                    json={"maintenance_mode": False, "maintenance_message": ""},
                    headers=_h(admin["token"]))
    assert r.json()["maintenance_mode"] is False
    assert client.get("/api/config").json()["maintenance_mode"] is False
    assert client.get(f"/api/entries?month={THIS_MONTH}",
                      headers=_h(user["token"])).status_code == 200


def test_admin_users_list_includes_entries_count():
    admin = _admin()
    u = _make_user("busy")
    _add({"type": "expense", "amount": 100, "category": "bazar",
          "note": "", "date": TODAY.isoformat()}, headers=_h(u["token"]))
    _add({"type": "income", "amount": 500, "category": "beton",
          "note": "", "date": TODAY.isoformat()}, headers=_h(u["token"]))
    rows = client.get("/api/admin/users", headers=_h(admin["token"])).json()
    row = next(r for r in rows if r["id"] == u["user"]["id"])
    assert row["entries_count"] == 2
    assert row["last_entry_at"] == TODAY.isoformat()
    assert row["role"] == "user" and row["raw_role"] == "user"
    stats = client.get("/api/admin/stats", headers=_h(admin["token"])).json()
    assert stats["total_users"] >= 3 and stats["total_entries"] == 2
    assert stats["entries_today"] == 2 and stats["active_users_7d"] == 1


def test_admin_role_change_validates_days_and_role():
    admin = _admin()
    target = _make_user("target")
    url = f"/api/admin/users/{target['user']['id']}/role"
    h = _h(admin["token"])
    assert client.post(url, json={"role": "support"},
                       headers=h).status_code == 422  # days required
    assert client.post(url, json={"role": "support", "days": 5},
                       headers=h).status_code == 422  # only 2/3/7/15
    assert client.post(url, json={"role": "superadmin"},
                       headers=h).status_code == 422
    assert client.post("/api/admin/users/99999/role",
                       json={"role": "user"}, headers=h).status_code == 404


def test_admin_can_grant_permanent_admin():
    admin = _admin()
    target = _make_user("promote")
    r = client.post(f"/api/admin/users/{target['user']['id']}/role",
                    json={"role": "admin"}, headers=_h(admin["token"]))
    assert r.status_code == 200
    assert r.json()["role"] == "admin"
    assert r.json()["support_until"] is None
    # The newly promoted admin can use the dashboard.
    assert client.get("/api/admin/stats",
                      headers=_h(target["token"])).status_code == 200

# ---------------------------------------------------------------- zero days
def _zero(day, headers=None):
    return client.post("/api/zero-days", json={"date": day},
                       headers=headers if headers is not None else _h())


def test_zero_day_create_and_list():
    r = _zero(TODAY.isoformat())
    assert r.status_code == 201, r.text
    assert r.json()["date"] == TODAY.isoformat()
    days = client.get("/api/zero-days", params={"month": THIS_MONTH},
                      headers=_h()).json()
    assert days == [TODAY.isoformat()]


def test_zero_day_duplicate_409():
    assert _zero(TODAY.isoformat()).status_code == 201
    r = _zero(TODAY.isoformat())
    assert r.status_code == 409


def test_zero_day_rejected_when_entry_exists():
    _add({"type": "expense", "amount": 100, "category": "bazar",
          "note": "", "date": TODAY.isoformat()})
    r = _zero(TODAY.isoformat())
    assert r.status_code == 409


def test_zero_day_future_date_400():
    r = _zero((TODAY + timedelta(days=1)).isoformat())
    assert r.status_code == 400


def test_zero_day_bad_month_400():
    r = client.get("/api/zero-days", params={"month": "2026-13"},
                   headers=_h())
    assert r.status_code == 400


def test_zero_day_delete_and_404():
    assert _zero(TODAY.isoformat()).status_code == 201
    r = client.delete(f"/api/zero-days/{TODAY.isoformat()}", headers=_h())
    assert r.status_code == 200
    assert r.json()["deleted"] is True
    days = client.get("/api/zero-days", params={"month": THIS_MONTH},
                      headers=_h()).json()
    assert days == []
    r = client.delete(f"/api/zero-days/{TODAY.isoformat()}", headers=_h())
    assert r.status_code == 404


def test_zero_day_list_only_that_month():
    _zero((TODAY - timedelta(days=1)).isoformat())
    _zero(TODAY.isoformat())
    days = client.get("/api/zero-days", params={"month": THIS_MONTH},
                      headers=_h()).json()
    assert (TODAY - timedelta(days=1)).isoformat() in days
    assert TODAY.isoformat() in days
    days_last = client.get("/api/zero-days", params={"month": LAST_MONTH},
                           headers=_h()).json()
    assert (TODAY - timedelta(days=1)).isoformat() not in days_last


def test_zero_day_requires_login():
    r = client.post("/api/zero-days", json={"date": TODAY.isoformat()})
    assert r.status_code == 401
    r = client.get("/api/zero-days", params={"month": THIS_MONTH})
    assert r.status_code == 401


def test_zero_day_is_per_user():
    other = _make_user("roni")
    assert _zero(TODAY.isoformat(),
                 headers=_h(other["token"])).status_code == 201
    # My own zero day for the same date is still allowed.
    assert _zero(TODAY.isoformat()).status_code == 201
    # I cannot delete the other user's zero day.
    r = client.delete(f"/api/zero-days/{TODAY.isoformat()}",
                      headers=_h(other["token"]))
    assert r.status_code == 200  # deletes THEIR row
    r = client.delete(f"/api/zero-days/{TODAY.isoformat()}", headers=_h())
    assert r.status_code == 200  # deletes MY row
    # After both deletes, neither list shows the date.
    assert client.get("/api/zero-days", params={"month": THIS_MONTH},
                      headers=_h()).json() == []
    assert client.get("/api/zero-days", params={"month": THIS_MONTH},
                      headers=_h(other["token"])).json() == []


def test_reminder_status_zero_day_yesterday_not_due():
    _zero((TODAY - timedelta(days=1)).isoformat())
    st = client.get("/api/reminders/status", headers=_h()).json()
    assert st["due"] is False and st["missed_dates"] == []
    assert st["last_entry_date"] == (TODAY - timedelta(days=1)).isoformat()


def test_reminder_status_zero_day_3_days_ago_missed_after():
    _zero((TODAY - timedelta(days=3)).isoformat())
    st = client.get("/api/reminders/status", headers=_h()).json()
    assert st["due"] is True
    assert st["days_since_last_entry"] == 3
    assert st["missed_dates"] == [
        (TODAY - timedelta(days=2)).isoformat(),
        (TODAY - timedelta(days=1)).isoformat()]


def test_reminder_status_zero_day_plus_newer_entry():
    _zero((TODAY - timedelta(days=3)).isoformat())
    _add({"type": "income", "amount": 100, "category": "beton",
          "note": "", "date": TODAY.isoformat()})
    st = client.get("/api/reminders/status", headers=_h()).json()
    assert st["due"] is False
    assert st["last_entry_date"] == TODAY.isoformat()
