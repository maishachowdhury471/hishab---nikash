"""Deterministic, rule-based AI Advice.

Generated only from the month's REAL stored totals vs last month —
no external AI API. Always returns 2-4 short strings in the chosen
language (bn = Bangla, en = English).
"""
from .parser import BN_DIGITS  # noqa: F401  (re-exported helper location)

EXPENSE_CATEGORIES = ["bazar", "khabar", "jatayat", "bill", "oshudh",
                      "poshak", "shikkha", "binodon", "onnanno"]
INCOME_CATEGORIES = ["beton", "bebsha", "onnanno-ay"]

CAT_BN = {
    "bazar": "বাজার", "khabar": "খাবার", "jatayat": "যাতায়াত", "bill": "বিল",
    "oshudh": "ওষুধ", "poshak": "পোশাক", "shikkha": "শিক্ষা", "binodon": "বিনোদন",
    "onnanno": "অন্যান্য", "beton": "বেতন", "bebsha": "ব্যবসা",
    "onnanno-ay": "অন্যান্য আয়",
}
CAT_EN = {
    "bazar": "Bazar", "khabar": "Food", "jatayat": "Transport", "bill": "Bills",
    "oshudh": "Medicine", "poshak": "Clothing", "shikkha": "Education",
    "binodon": "Entertainment", "onnanno": "Others", "beton": "Salary",
    "bebsha": "Business", "onnanno-ay": "Other income",
}


def bn_digits(value) -> str:
    """Convert Latin digits in a value to Bengali digits."""
    return str(value).translate(str.maketrans("0123456789", BN_DIGITS))


def fmt_money(amount: float, lang: str) -> str:
    text = f"{amount:,.0f}"
    if lang == "bn":
        text = bn_digits(text)
    return f"৳{text}" if lang == "bn" else f"Tk {text}"


def fmt_pct(pct: float, lang: str) -> str:
    text = f"{pct:.0f}%"
    return bn_digits(text) if lang == "bn" else text


def _cat_name(cat: str, lang: str) -> str:
    return CAT_BN.get(cat, cat) if lang == "bn" else CAT_EN.get(cat, cat)


def generate_advice(month_totals: dict, prev_totals: dict, lang: str = "bn") -> list:
    """month_totals / prev_totals: {"income": float, "expense": float,
    "by_category": {cat: float}}. Returns 2-4 advice strings."""
    lang = "bn" if lang == "bn" else "en"
    income = month_totals.get("income", 0.0)
    expense = month_totals.get("expense", 0.0)
    by_cat = month_totals.get("by_category", {}) or {}
    prev_by_cat = prev_totals.get("by_category", {}) or {}
    prev_expense = prev_totals.get("expense", 0.0)
    savings = income - expense

    advice = []

    if expense <= 0 and income <= 0:
        if lang == "bn":
            return [
                "এই মাসে এখনো কোনো হিসাব যোগ করা হয়নি। প্রথম খরচ বা আয় যোগ করুন।",
                "প্রতিদিনের ছোট খরচও লিখে রাখলে মাস শেষে পুরো হিসাব মিলে যাবে।",
            ]
        return [
            "No entries yet this month. Add your first income or expense.",
            "Recording even small daily expenses gives you a full picture at month end.",
        ]

    # 1. Top spending category + share of total expense.
    exp_cats = {c: v for c, v in by_cat.items() if c in EXPENSE_CATEGORIES and v > 0}
    if exp_cats:
        top_cat, top_amt = max(exp_cats.items(), key=lambda kv: kv[1])
        share = (top_amt / expense * 100) if expense else 0
        if lang == "bn":
            advice.append(
                f"এই মাসে সবচেয়ে বেশি খরচ {_cat_name(top_cat, lang)} খাতে — "
                f"{fmt_money(top_amt, lang)} ({fmt_pct(share, lang)} মোট খরচের)।")
        else:
            advice.append(
                f"Your biggest spending this month is {_cat_name(top_cat, lang)} — "
                f"{fmt_money(top_amt, lang)} ({fmt_pct(share, lang)} of total spending).")

    # 2. Biggest increase vs last month (expense categories only).
    increases = []
    for cat, amt in exp_cats.items():
        prev = prev_by_cat.get(cat, 0.0)
        if prev > 0 and amt > prev:
            increases.append((cat, (amt - prev) / prev * 100, amt - prev))
    if increases:
        cat, pct, diff = max(increases, key=lambda x: x[1])
        if lang == "bn":
            advice.append(
                f"গত মাসের তুলনায় {_cat_name(cat, lang)} খাতে খরচ বেড়েছে "
                f"{fmt_pct(pct, lang)} ({fmt_money(diff, lang)} বেশি)। এদিকে একটু নজর দিন।")
        else:
            advice.append(
                f"Spending on {_cat_name(cat, lang)} is up {fmt_pct(pct, lang)} "
                f"vs last month ({fmt_money(diff, lang)} more). Keep an eye on it.")

    # 3. Savings: positive / negative.
    if income > 0:
        if savings >= 0:
            if lang == "bn":
                advice.append(
                    f"এই মাসে আপনার সঞ্চয় {fmt_money(savings, lang)} — আয় "
                    f"{fmt_money(income, lang)}, খরচ {fmt_money(expense, lang)}।")
            else:
                advice.append(
                    f"Your savings this month are {fmt_money(savings, lang)} — income "
                    f"{fmt_money(income, lang)}, spending {fmt_money(expense, lang)}.")
        else:
            if lang == "bn":
                advice.append(
                    f"সতর্কতা: এই মাসে খরচ আয়ের চেয়ে {fmt_money(-savings, lang)} বেশি। "
                    f"অপ্রয়োজনীয় খরচ কমানোর চেষ্টা করুন।")
            else:
                advice.append(
                    f"Warning: spending is {fmt_money(-savings, lang)} more than income "
                    f"this month. Try cutting non-essential spending.")
    else:
        if lang == "bn":
            advice.append("এই মাসে এখনো কোনো আয় যোগ করা হয়নি — আয় যোগ করলে সঞ্চয়ের হিসাব মিলবে।")
        else:
            advice.append("No income recorded yet this month — add income to see your savings.")

    # 4. A tip, only if we still have room (max 4 items).
    if len(advice) < 4:
        if prev_expense > 0 and expense < prev_expense:
            drop = (prev_expense - expense) / prev_expense * 100
            if lang == "bn":
                advice.append(f"ভালো খবর! গত মাসের তুলনায় খরচ কমেছে {fmt_pct(drop, lang)}। এভাবে চালিয়ে যান।")
            else:
                advice.append(f"Good news! Spending is down {fmt_pct(drop, lang)} vs last month. Keep it up.")
        elif exp_cats:
            if lang == "bn":
                advice.append("প্রতিদিন খরচ লেখার অভ্যাস ধরে রাখুন — মাস শেষে কোথায় টাকা যাচ্ছে স্পষ্ট হবে।")
            else:
                advice.append("Keep logging expenses daily — by month end you will see exactly where the money goes.")

    return advice[:4]
