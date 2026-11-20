# AI Hisab Nikash — স্মার্ট হিসাব (Railway-ready)

দৈনন্দিন আয়-ব্যয়ের হিসাব রাখার ওয়েবসাইট। সম্পূর্ণ বাংলা (বাংলা/English টগল সহ),
AI দ্রুত লিখন (টাইপ বা ভয়েস), মাসের সারসংক্ষেপ, গত মাসের সাথে তুলনা, AI পরামর্শ
এবং বেশি খরচের সতর্কতা। কোনো নমুনা ডেটা নেই — শুরু থেকে খালি।

**Stack:** Python FastAPI (একটাই সার্ভিস — API + স্ট্যাটিক ফ্রন্টএন্ড), PostgreSQL
(Railway), SQLite ফলব্যাক (লোকাল ডেভ), SQLAlchemy (sync, `psycopg` ড্রাইভার),
সাদা HTML/JS + Tailwind CDN (কোনো npm build নেই), PWA (manifest + service worker)।

## Railway-তে লাইভ করার ধাপ (সঠিক ক্রম)

1. **কোড GitHub-এ তুলুন** — এই ফোল্ডারের সব ফাইল একটি GitHub রিপোজিটরিতে push করুন
   (যেমন `hisab-nikash`)।
2. **Railway-তে যান** — https://railway.app → **New Project → Deploy from GitHub repo**
   → ওই রিপোজিটরি বেছে নিন।
3. **PostgreSQL যোগ করুন** — প্রজেক্টে **+ New → Database → Add PostgreSQL**।
4. **ডাটাবেস লিংক করুন** — Postgres সার্ভিসে গিয়ে **Variables** থেকে
   `DATABASE_URL` কপি করুন; ওয়েব সার্ভিসের **Variables**-এ `DATABASE_URL` হিসেবে
   বসান (সাধারণত Railway নিজেই reference হিসেবে দেয়:
   `DATABASE_URL=${{Postgres.DATABASE_URL}}`)।
   > `DATABASE_URL` না দিলে অ্যাপ SQLite ফাইলে চলবে, কিন্তু Railway-তে ফাইল
   > স্থায়ী নয় — তাই Postgres অবশ্যই লিংক করুন।
5. **Deploy** — Railway নিজেই `Dockerfile` ধরে build করে deploy করবে
   (`railway.toml` দেখুন)। Deploy শেষ হলে **Settings → Networking → Generate Domain**
   চাপুন।
6. **খুলুন** — দেওয়া URL (যেমন `https://hisab-nikash.up.railway.app`) ব্রাউজারে
   খুলুন। প্রথম পাতায় “হিসাব” দেখা গেলেই লাইভ।

## লোকালে চালানো

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# SQLite (ডিফল্ট): DATABASE_URL না দিলেই চলবে; hisab.db ফাইল তৈরি হবে।
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
# অথবা Postgres: DATABASE_URL=postgresql+psycopg://user:pass@localhost:5432/hisab uvicorn ...
```

ব্রাউজারে খুলুন: http://localhost:8000

## টেস্ট

```bash
cd backend
python -m pytest tests/ -v
```

টেস্টে অস্থায়ী SQLite DB ব্যবহার হয় — আসল `hisab.db` ছোঁয় না।

## ফিচার

- **আয়/খরচ যোগ/সম্পাদনা/মুছে ফেলা:** তারিখ (ডিফল্ট আজ), টাকা, খাত, নোট।
  খরচের খাত: বাজার, খাবার, যাতায়াত, বিল, ওষুধ, পোশাক, শিক্ষা, বিনোদন, অন্যান্য।
  আয়ের খাত: বেতন, ব্যবসা, অন্যান্য আয়। দিন অনুযায়ী গ্রুপ করা তালিকা + মোট।
- **মাস নির্বাচন:** আগের/পরের মাস বোতাম + মাস ইনপুট। খাত অনুযায়ী বার চার্ট।
- **তুলনা:** এই মাস বনাম গত মাস — আয়/খরচ/সঞ্চয় কার্ড (+% পরিবর্তন) এবং
  খাতভিত্তিক টেবিল (এই মাস, গত মাস, পার্থক্য)।
- **AI দ্রুত লিখন:** লিখুন বা মাইকে বলুন (Web Speech API, `bn-BD`/`en-US`)।
  সার্ভার `POST /api/parse` পার্স করে ফরমে **বসিয়ে দেয় — কখনো নিজে সংরক্ষণ করে না**,
  ব্যবহারকারী যাচাই করে Save চাপেন। যাচাই করা উদাহরণ:
  - “আজ বাজারে ৫০০ টাকা খরচ” → খরচ ৳৫০০, বাজার, আজ
  - “গতকাল রিকশা ভাড়া ৮০ টাকা” → খরচ ৳৮০, যাতায়াত, গতকাল
  - “বেতন পেলাম ৩০০০০ টাকা” → আয় ৳৩০,০০০, বেতন
  বাংলা সংখ্যাও চলে (৫০০ → 500)।
- **AI পরামর্শ:** মাসের আসল মোট বনাম গত মাস থেকে নিয়মভিত্তিক (deterministic)
  ২–৪টি পরামর্শ — সবচেয়ে বড় খাত + অংশ, সবচেয়ে বেশি বেড়ে যাওয়া খাত, সঞ্চয়।
- **বেশি খরচের সতর্কতা:** কোনো খাত গত মাসের চেয়ে **৩০%-এর বেশি** বাড়লে সতর্কতা
  ব্যাজে খাতের নাম ও % দেখায়।
- **ভাষা:** সম্পূর্ণ বাংলা প্রথম, বাংলা/English টগল (পছন্দ localStorage-এ থাকে);
  বাংলা মোডে বাংলা সংখ্যা (০১২৩৪৫৬৭৮৯), English মোডে লাতিন সংখ্যা।
- **PWA:** `manifest.json` (নাম “AI Hisab Nikash”, theme `#047857`), আইকন
  (`icon.svg`, `icon-192.png`, `icon-512.png`), `sw.js` অ্যাপ শেল ক্যাশ করে।

## সীমাবদ্ধতা (সত্য কথা)

- **অফলাইন:** `sw.js` অ্যাপের চেহারা (UI) ক্যাশ করে, তাই অফলাইনে অ্যাপ খুলে দেখা
  যায়। কিন্তু হিসাব সার্ভারের ডাটাবেসে (PostgreSQL) থাকে, তাই **নতুন হিসাব
  সংরক্ষণে ইন্টারনেট লাগবেই** — অফলাইনে লেখা হিসাব সার্ভারে যাবে না।
- **ভয়েস:** মাইক বোতাম শুধু Web Speech API সমর্থন করে এমন ব্রাউজারে দেখায়
  (Chrome/Android); না থাকলে বোতাম লুকানো থাকে, টাইপ করে লেখা যায়।
- **AI:** কোনো বাইরের AI API ব্যবহার হয় না — পার্সার ও পরামর্শ দুটোই
  নিয়মভিত্তিক (rule-based), তাই সম্পূর্ণ বিনামূল্যে ও অফলাইন-নিরাপদ।

## API

| Method | পথ | কাজ |
|---|---|---|
| GET | `/api/health` | `{"status":"ok"}` |
| GET | `/api/entries?month=YYYY-MM` | মাসের হিসাবের তালিকা |
| POST | `/api/entries` | নতুন হিসাব (`type`, `amount>0`, `category`, `note`, `date`) |
| PUT | `/api/entries/{id}` | হিসাব আপডেট |
| DELETE | `/api/entries/{id}` | হিসাব মুছুন |
| GET | `/api/summary?month=YYYY-MM&lang=bn\|en` | মোট, খাতভিত্তিক, তুলনা, overspend, পরামর্শ |
| POST | `/api/parse` | `{text}` → `{type, amount, category, note, date}` |

ফ্রন্টএন্ড `/`-এ, manifest `/manifest.json`-এ, service worker `/sw.js`-এ।
