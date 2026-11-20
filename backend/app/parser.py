"""Rule-based Bangla/English quick-entry parser.

Parses free text such as "আজ বাজারে ৫০০ টাকা খরচ" into
{type, amount, category, note, date}. Deterministic, no external AI API.
The same logic is mirrored client-side in static/app.js for instant
feedback, but the server endpoint POST /api/parse is the source of truth
(and what the tests verify).

Verified examples:
  "আজ বাজারে ৫০০ টাকা খরচ"      -> expense 500, bazar, today
  "গতকাল রিকশা ভাড়া ৮০ টাকা"   -> expense 80, jatayat, yesterday
  "বেতন পেলাম ৩০০০০ টাকা"       -> income 30000, beton
"""
import re
from datetime import date, timedelta

BN_DIGITS = "০১২৩৪৫৬৭৮৯"
BN_TO_EN = str.maketrans(BN_DIGITS, "0123456789")


def to_en_digits(text: str) -> str:
    return text.translate(BN_TO_EN)


# (keywords, category) — checked in order; first match wins.
EXPENSE_KEYWORDS = [
    (["বাজার", "বাজারে", "মুদি", "সবজি", "মাছ", "মাংস", "চাল", "ডাল", "তেল", "মসলা",
      "bazar", "grocery", "market"], "bazar"),
    (["খাবার", "খেলাম", "খাওয়া", "খাওয়া-দাওয়া", "রেস্টুরেন্ট", "হোটেল", "নাস্তা",
      "চা", "কফি", "দুপুরের খাবার", "রাতের খাবার", "food", "restaurant", "lunch",
      "dinner", "breakfast"], "khabar"),
    (["রিকশা", "রিক্সা", "বাস", "ভাড়া", "যাতায়াত", "ট্যাক্সি", "সিএনজি", "ট্রেন",
      "পেট্রোল", "অটো", "rickshaw", "bus fare", "transport", "taxi", "fare"], "jatayat"),
    (["বিল", "বিদ্যুৎ", "পানি", "গ্যাস", "ইন্টারনেট", "মোবাইল বিল", "ওয়াইফাই",
      "bill", "electricity", "water bill", "internet"], "bill"),
    (["ওষুধ", "ঔষধ", "ডাক্তার", "হাসপাতাল", "চিকিৎসা", "ফার্মেসি", "ঔষধের",
      "medicine", "doctor", "hospital", "pharmacy"], "oshudh"),
    (["পোশাক", "জামা", "কাপড়", "জুতা", "শার্ট", "প্যান্ট", "শাড়ি", "clothes",
      "dress", "shirt", "shoe"], "poshak"),
    (["শিক্ষা", "স্কুল", "কলেজ", "বই", "টিউশন", "পরীক্ষা", "ফি", "কোর্স",
      "education", "school", "book", "tuition", "course"], "shikkha"),
    (["বিনোদন", "সিনেমা", "ঘুরতে", "পার্ক", "খেলা", "মুভি", "ভ্রমণ",
      "entertainment", "movie", "cinema", "tour", "travel"], "binodon"),
]

INCOME_KEYWORDS = [
    (["বেতন", "স্যালারি", "salary", "মাইনে", "বেতন পেলাম"], "beton"),
    (["ব্যবসা", "দোকান", "বিক্রি", "business", "shop"], "bebsha"),
]

INCOME_SIGNALS = ["পেলাম", "পেয়েছি", "পাইছি", "আয়", "ইনকাম", "income", "পাওয়া",
                  "বেতন", "স্যালারি", "salary", "ব্যবসা", "বিক্রি", "পেলাম"]
EXPENSE_SIGNALS = ["খরচ", "দিলাম", "কিনলাম", "খেলাম", "খরচ করলাম", "দিয়েছি",
                   "কিনেছি", "খরচ হলো", "খরচ হয়েছে", "spent", "paid", "bought"]


def _find_amount(text: str):
    """Return the amount as float, or None. Prefers a number followed by
    টাকা/taka/tk; otherwise the largest number in the text."""
    norm = to_en_digits(text)
    # Number immediately followed by টাকা / taka / tk / ৳
    m = re.search(r"(\d[\d,]*\.?\d*)\s*(?:টাকা|taka|tk|৳)", norm, re.IGNORECASE)
    if m:
        return float(m.group(1).replace(",", ""))
    numbers = re.findall(r"\d[\d,]*\.?\d*", norm)
    if not numbers:
        return None
    return float(max(numbers, key=lambda n: float(n.replace(",", ""))).replace(",", ""))


def _find_date(text: str, today: date) -> date:
    t = text.lower()
    if "গতকাল" in text or "yesterday" in t:
        return today - timedelta(days=1)
    if "গত পরশু" in text or "day before yesterday" in t:
        return today - timedelta(days=2)
    if "পরশু" in text:
        return today + timedelta(days=2)
    if "আগামীকাল" in text or "tomorrow" in t:
        return today + timedelta(days=1)
    # "আজ" / "today" and no marker both mean today.
    return today


def _find_category(text: str, entry_type: str):
    low = text.lower()
    if entry_type == "income":
        for keywords, cat in INCOME_KEYWORDS:
            if any(k in text or k in low for k in keywords):
                return cat
        return "onnanno-ay"
    for keywords, cat in EXPENSE_KEYWORDS:
        if any(k in text or k in low for k in keywords):
            return cat
    return "onnanno"


def _clean_note(text: str) -> str:
    """Keep the original text as the note, minus the amount token and
    date words, so the pre-filled form is readable."""
    note = text.strip()
    # Remove Bengali/Latin amount + টাকা token
    note = re.sub(r"[০-৯0-9][০-৯0-9,]*\.?[০-৯0-9]*\s*(?:টাকা|taka|tk|৳)?", "", note)
    for w in ["গতকাল", "আজ", "yesterday", "today"]:
        note = note.replace(w, "")
    note = re.sub(r"\s+", " ", note).strip(" ,।")
    return note or text.strip()


def parse_text(text: str, today: date | None = None) -> dict:
    """Parse quick-entry text. Never raises on ordinary input."""
    today = today or date.today()
    text = (text or "").strip()
    if not text:
        return {"type": "expense", "amount": None, "category": "onnanno",
                "note": "", "date": today.isoformat()}

    # Type: income signals win over expense signals when both appear
    # only if the income keyword is the stronger cue (e.g. বেতন).
    is_income = any(s in text for s in INCOME_SIGNALS) or \
        any(s in text.lower() for s in ("income", "salary"))
    is_expense = any(s in text for s in EXPENSE_SIGNALS)
    if is_income and not is_expense:
        entry_type = "income"
    elif is_income and any(k in text for k in ("বেতন", "স্যালারি", "salary", "ব্যবসা")):
        entry_type = "income"
    else:
        entry_type = "expense"

    category = _find_category(text, entry_type)
    amount = _find_amount(text)
    entry_date = _find_date(text, today)
    note = _clean_note(text)

    return {
        "type": entry_type,
        "amount": amount,
        "category": category,
        "note": note,
        "date": entry_date.isoformat(),
    }
