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
  "বাড়ি ভাড়া দিলাম ১০০০০ টাকা" -> expense 10000, bari-bhara
  "বাড়ি ভাড়া পেলাম ২০০০০ টাকা" -> income 20000, bhara-ay
  "বিদ্যুৎ বিল দিলাম ১৫০০ টাকা"  -> expense 1500, biddut-bill
  "টিউশন ফি পেলাম ৫০০০ টাকা"    -> income 5000, tuition
  "ফ্রিল্যান্সিং থেকে পেলাম ১৫০০০ টাকা" -> income 15000, freelancing

Ordering matters: more specific phrases are checked BEFORE generic ones
(বিদ্যুৎ বিল before বিল, বাড়ি ভাড়া before ভাড়া/যাতায়াত, জুতা before
পোশাক, বই before শিক্ষা, ডাক্তার before ওষুধ, পেট্রোল before যাতায়াত).
Old category codes are never renamed or deleted, so saved entries keep
working; the generic "bill" category is kept for old entries.
"""
import re
from datetime import date, timedelta

BN_DIGITS = "০১২৩৪৫৬৭৮৯"
BN_TO_EN = str.maketrans(BN_DIGITS, "0123456789")
_BN_LETTER = "অ-হড়ঢ়য়"


def to_en_digits(text: str) -> str:
    return text.translate(BN_TO_EN)


def _kw_match(text: str, keyword: str) -> bool:
    """Match a keyword in text. Short (<=2 char) Bangla keywords need a
    word boundary on both sides, so "চা" does not match "চাষ" and "ফি"
    does not match "ফিতরা". Longer keywords use plain substring match,
    so genitives like "বাজারের" still match."""
    if len(keyword) <= 2 and any("\u0980" <= ch <= "\u09ff" for ch in keyword):
        return re.search(
            rf"(?<![{_BN_LETTER}]){re.escape(keyword)}(?![{_BN_LETTER}])",
            text) is not None
    return keyword in text or keyword in text.lower()


def _any_kw(text: str, keywords) -> bool:
    return any(_kw_match(text, k) for k in keywords)


# (keywords, category) — checked in order; first match wins.
EXPENSE_KEYWORDS = [
    (["বাড়ি ভাড়া", "বাসা ভাড়া", "ফ্ল্যাট ভাড়া", "house rent",
      "বাড়িভাড়া"], "bari-bhara"),
    (["বিদ্যুৎ বিল", "বিদ্যুৎ", "electricity bill", "electricity"], "biddut-bill"),
    (["গ্যাস বিল", "গ্যাস", "gas bill", "gas"], "gas-bill"),
    (["পানি বিল", "পানি", "water bill", "water"], "pani-bill"),
    (["ইন্টারনেট বিল", "ইন্টারনেট", "ওয়াইফাই", "wifi", "internet"], "internet-bill"),
    (["মোবাইল বিল", "মোবাইল রিচার্জ", "রিচার্জ", "mobile recharge",
      "mobile bill", "recharge"], "mobile-bill"),
    (["ব্যবসার খরচ", "দোকানের খরচ", "business expense"], "bebshar-khoroch"),
    (["বাজার", "বাজারে", "মুদি", "সবজি", "মাছ", "মাংস", "চাল", "ডাল", "তেল", "মসলা",
      "bazar", "grocery", "market"], "bazar"),
    (["খাবার", "খেলাম", "খাওয়া", "খাওয়া-দাওয়া", "রেস্টুরেন্ট", "হোটেল", "নাস্তা",
      "চা", "কফি", "দুপুরের খাবার", "রাতের খাবার", "food", "restaurant", "lunch",
      "dinner", "breakfast"], "khabar"),
    (["ডাক্তার", "ডাক্তার দেখা", "চিকিৎসা", "doctor", "treatment"], "doctor"),
    (["ওষুধ", "ঔষধ", "হাসপাতাল", "ফার্মেসি", "ঔষধের",
      "medicine", "hospital", "pharmacy"], "oshudh"),
    (["বই", "বইয়ের", "স্টেশনারি", "খাতা", "কলম", "পেন্সিল",
      "book", "stationery", "notebook", "pen"], "boi-stationery"),
    (["শিক্ষা", "স্কুল", "কলেজ", "টিউশন ফি", "পরীক্ষা", "ফি", "কোর্স",
      "ভর্তি", "education", "school", "tuition fee", "course",
      "exam fee"], "shikkha"),
    (["জুতা", "ব্যাগ", "জুতো", "স্যান্ডেল", "shoe", "bag"], "juta-bag"),
    (["পোশাক", "জামা", "কাপড়", "শার্ট", "প্যান্ট", "শাড়ি", "clothes",
      "dress", "shirt"], "poshak"),
    (["ভ্রমণ", "ভ্রমণে", "ট্যুর", "tour", "travel", "trip"], "bhromon"),
    (["খেলাধুলা", "ক্রিকেট", "ফুটবল", "জিম", "ব্যাডমিন্টন",
      "খেলার সরঞ্জাম", "sports", "cricket", "football", "gym"], "kheladhula"),
    (["বিনোদন", "সিনেমা", "ঘুরতে", "পার্ক", "খেলা দেখ", "মুভি",
      "entertainment", "movie", "cinema"], "binodon"),
    (["পেট্রোল", "ডিজেল", "জ্বালানি", "অকটেন", "petrol", "diesel",
      "fuel"], "petrol"),
    (["রিকশা", "রিক্সা", "বাস", "ভাড়া", "যাতায়াত", "ট্যাক্সি", "সিএনজি", "ট্রেন",
      "অটো", "rickshaw", "bus fare", "transport", "taxi", "fare"], "jatayat"),
    (["গাড়ি মেরামত", "বাইক মেরামত", "সার্ভিসিং", "মেরামত",
      "vehicle service", "car repair"], "janbahon-rokkhon"),
    (["জাকাত", "যাকাত", "সদকা", "দান", "ফিতরা", "zakat", "donation",
      "charity"], "dan"),
    (["মসজিদ", "মন্দির", "ধর্মীয়", "মিলাদ", "মাহফিল", "mosque",
      "religious"], "dhormio"),
    (["বিয়ে", "বিয়ের", "অনুষ্ঠান", "গায়ে হলুদ", "wedding", "event"], "biye"),
    (["উপহার", "গিফট", "gift"], "upohar"),
    (["প্রসাধনী", "কসমেটিক", "ক্রিম", "শ্যাম্পু", "সাবান",
      "cosmetic"], "proshadhoni"),
    (["সেলুন", "চুল কাটা", "নাপিত", "salon", "haircut", "barber"], "selun"),
    (["লন্ড্রি", "ধোলাই", "laundry"], "laundry"),
    (["আসবাব", "ফার্নিচার", "গৃহস্থালি", "বাসন", "চেয়ার", "টেবিল",
      "furniture", "household"], "grihosthali"),
    (["ফ্রিজ", "টিভি", "টেলিভিশন", "ল্যাপটপ", "মোবাইল কিনলাম",
      "ইলেকট্রনিক্স", "ফ্যান", "electronics", "laptop", "fridge"], "electronics"),
    (["কুকুর", "বিড়াল", "পোষা", "পাখি", "পোষা প্রাণী", "pet"], "posha-prani"),
    (["কৃষি", "চাষ", "সার", "বীজ", "খামার", "farming"], "krishi"),
    (["ঋণ পরিশোধ", "ঋণের কিস্তি", "কিস্তি", "ধার পরিশোধ",
      "loan repayment", "emi", "installment"], "rin-porishodh"),
    (["বীমা", "ইন্স্যুরেন্স", "insurance"], "bima"),
    (["সঞ্চয়", "বিনিয়োগ", "ডিপিএস", "এফডিআর", "savings",
      "investment", "dps"], "sonchoy"),
    (["ট্যাক্স", "আয়কর", "ভ্যাট", "tax", "vat"], "tax"),
    (["শিশু", "বাচ্চা", "বাচ্চার", "খেলনা", "ছেলেমেয়ে", "শিশুর",
      "child", "baby", "toy"], "shishur-khoroch"),
    (["বিল", "bill"], "bill"),
]

INCOME_KEYWORDS = [
    (["রেমিট্যান্স", "বিদেশ থেকে", "remittance", "abroad"], "remittance"),
    (["ফ্রিল্যান্সিং", "ফ্রিল্যান্স", "freelancing", "freelance",
      "আপওয়ার্ক", "ফাইভার"], "freelancing"),
    (["টিউশন", "পড়ানো", "পড়িয়ে", "প্রাইভেট পড়া", "tuition",
      "tutoring"], "tuition"),
    (["ফসল বিক্রি", "ফসল", "কৃষি আয়", "ধান বিক্রি", "crop sale",
      "farm income"], "krishi-ay"),
    (["বাড়ি ভাড়া", "বাসা ভাড়া", "দোকান ভাড়া", "ফ্ল্যাট ভাড়া",
      "ভাড়া পেলাম", "rent income", "house rent"], "bhara-ay"),
    (["অনলাইন আয়", "অনলাইন থেকে", "ইউটিউব", "ফেসবুক পেজ",
      "online income", "youtube"], "online-ay"),
    (["পুরনো জিনিস", "পুরনো", "পুরাতন", "old item"], "purono-bikri"),
    (["ঋণ ফেরত", "ধার ফেরত", "loan repaid", "loan back"], "rin-ferot"),
    (["সুদ", "লভ্যাংশ", "ডিভিডেন্ড", "interest", "dividend"], "shud"),
    (["বোনাস", "bonus"], "bonus"),
    (["সালামি", "উপহার পেলাম", "উপহার", "salami", "gift received"], "upohar-ay"),
    (["পার্ট টাইম", "পার্ট-টাইম", "part time", "part-time"], "part-time"),
    (["কমিশন", "commission"], "commission"),
    (["বেতন", "স্যালারি", "salary", "মাইনে", "বেতন পেলাম"], "beton"),
    (["ব্যবসা", "দোকান", "বিক্রি", "business", "shop"], "bebsha"),
]

INCOME_SIGNALS = ["পেলাম", "পেয়েছি", "পাইছি", "আয়", "ইনকাম", "income", "পাওয়া",
                  "বেতন", "স্যালারি", "salary", "ব্যবসা", "বিক্রি", "পেলাম",
                  "ফ্রিল্যান্সিং", "রেমিট্যান্স", "বোনাস", "কমিশন", "সুদ",
                  "সালামি", "টিউশন", "ভাড়া পেলাম", "ঋণ ফেরত"]
EXPENSE_SIGNALS = ["খরচ", "দিলাম", "কিনলাম", "খেলাম", "খরচ করলাম", "দিয়েছি",
                   "কিনেছি", "খরচ হলো", "খরচ হয়েছে", "পরিশোধ", "কিস্তি",
                   "spent", "paid", "bought"]


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
    if entry_type == "income":
        for keywords, cat in INCOME_KEYWORDS:
            if _any_kw(text, keywords):
                return cat
        return "onnanno-ay"
    for keywords, cat in EXPENSE_KEYWORDS:
        if _any_kw(text, keywords):
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

    # Type: a receiving verb (পেলাম/পেয়েছি) means income, a paying verb
    # (দিলাম/খরচ/কিনলাম) means expense. When both appear, the receiving
    # verb wins ("বেতন পেলাম ... খরচ" is about the salary); when neither
    # appears, the matched category decides ("ডাক্তার দেখালাম" -> expense,
    # "ফ্রিল্যান্সিং ১৫০০০ টাকা" -> income). This keeps collisions right:
    # "ব্যবসার খরচ" -> expense (no receiving verb), "টিউশন ফি দিলাম" ->
    # expense, "টিউশন ফি পেলাম" -> income, "বাড়ি ভাড়া দিলাম" -> expense,
    # "বাড়ি ভাড়া পেলাম" -> income.
    is_income = _any_kw(text, INCOME_SIGNALS)
    is_expense = _any_kw(text, EXPENSE_SIGNALS)
    if is_income and not is_expense:
        entry_type = "income"
    elif is_expense and not is_income:
        entry_type = "expense"
    elif is_income and is_expense:
        entry_type = "income" if _any_kw(text, ["পেলাম", "পেয়েছি", "পাইছি"]) else "expense"
    else:
        # No verb at all: let the category lists decide.
        income_cat = next(
            (cat for keywords, cat in INCOME_KEYWORDS
             if _any_kw(text, keywords)), None)
        entry_type = "income" if income_cat else "expense"

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
