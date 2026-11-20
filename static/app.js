/* AI Hisab Nikash — frontend.
   Full Bangla first, Bangla/English toggle saved in localStorage.
   Bengali digits in Bangla mode, Latin digits in English mode.
   AI quick entry calls POST /api/parse and PRE-FILLS the form — never auto-saves.
*/
"use strict";

const BN = "০১২৩৪৫৬৭৮৯";
const toBn = (s) => String(s).replace(/[0-9]/g, (d) => BN[+d]);
const toEn = (s) => String(s).replace(/[০-৯]/g, (d) => "0123456789"[BN.indexOf(d)]);

const CATS = {
  expense: ["bazar", "khabar", "jatayat", "bill", "bari-bhara", "biddut-bill", "gas-bill", "pani-bill", "internet-bill", "mobile-bill", "oshudh", "doctor", "poshak", "juta-bag", "shikkha", "boi-stationery", "binodon", "bhromon", "upohar", "dan", "dhormio", "biye", "proshadhoni", "selun", "laundry", "grihosthali", "electronics", "janbahon-rokkhon", "petrol", "posha-prani", "krishi", "bebshar-khoroch", "rin-porishodh", "bima", "sonchoy", "tax", "shishur-khoroch", "kheladhula", "onnanno"],
  income: ["beton", "bebsha", "freelancing", "tuition", "krishi-ay", "bhara-ay", "shud", "bonus", "upohar-ay", "remittance", "online-ay", "part-time", "commission", "purono-bikri", "rin-ferot", "onnanno-ay"],
};
const CAT_NAME = {
  bn: { bazar: "বাজার", khabar: "খাবার", jatayat: "যাতায়াত", bill: "বিল", "bari-bhara": "বাড়ি ভাড়া", "biddut-bill": "বিদ্যুৎ বিল", "gas-bill": "গ্যাস বিল", "pani-bill": "পানি বিল", "internet-bill": "ইন্টারনেট বিল", "mobile-bill": "মোবাইল বিল/রিচার্জ", oshudh: "ওষুধ", doctor: "ডাক্তার/চিকিৎসা", poshak: "পোশাক", "juta-bag": "জুতা/ব্যাগ", shikkha: "শিক্ষা", "boi-stationery": "বই/স্টেশনারি", binodon: "বিনোদন", bhromon: "ভ্রমণ", upohar: "উপহার", dan: "দান/সদকা/জাকাত", dhormio: "ধর্মীয়/মসজিদ", biye: "বিয়ে/অনুষ্ঠান", proshadhoni: "প্রসাধনী", selun: "সেলুন/চুল কাটা", laundry: "লন্ড্রি", grihosthali: "গৃহস্থালি/আসবাব", electronics: "ইলেকট্রনিক্স/মোবাইল", "janbahon-rokkhon": "যানবাহন রক্ষণাবেক্ষণ", petrol: "পেট্রোল/জ্বালানি", "posha-prani": "পোষা প্রাণী", krishi: "কৃষি/চাষাবাদ", "bebshar-khoroch": "ব্যবসার খরচ", "rin-porishodh": "ঋণ পরিশোধ/কিস্তি", bima: "বীমা", sonchoy: "সঞ্চয়/বিনিয়োগ", tax: "ট্যাক্স/ফি", "shishur-khoroch": "শিশুর খরচ", kheladhula: "খেলাধুলা", onnanno: "অন্যান্য", beton: "বেতন", bebsha: "ব্যবসা", freelancing: "ফ্রিল্যান্সিং", tuition: "টিউশন/পড়ানো", "krishi-ay": "কৃষি আয়/ফসল বিক্রি", "bhara-ay": "বাড়ি/দোকান ভাড়া আয়", shud: "সুদ/লভ্যাংশ", bonus: "বোনাস", "upohar-ay": "উপহার/সালামি", remittance: "রেমিট্যান্স/বিদেশ থেকে", "online-ay": "অনলাইন আয়", "part-time": "পার্ট টাইম", commission: "কমিশন", "purono-bikri": "পুরনো জিনিস বিক্রি", "rin-ferot": "ঋণ ফেরত", "onnanno-ay": "অন্যান্য আয়" },
  en: { bazar: "Bazar", khabar: "Food", jatayat: "Transport", bill: "Bills", "bari-bhara": "House Rent", "biddut-bill": "Electricity Bill", "gas-bill": "Gas Bill", "pani-bill": "Water Bill", "internet-bill": "Internet Bill", "mobile-bill": "Mobile Bill / Recharge", oshudh: "Medicine", doctor: "Doctor / Treatment", poshak: "Clothing", "juta-bag": "Shoes / Bag", shikkha: "Education", "boi-stationery": "Books / Stationery", binodon: "Entertainment", bhromon: "Travel", upohar: "Gift", dan: "Donation / Zakat", dhormio: "Religious / Mosque", biye: "Wedding / Event", proshadhoni: "Cosmetics", selun: "Salon / Haircut", laundry: "Laundry", grihosthali: "Household / Furniture", electronics: "Electronics / Mobile", "janbahon-rokkhon": "Vehicle Maintenance", petrol: "Petrol / Fuel", "posha-prani": "Pet", krishi: "Farming", "bebshar-khoroch": "Business Expense", "rin-porishodh": "Loan Repayment / Instalment", bima: "Insurance", sonchoy: "Savings / Investment", tax: "Tax / Fees", "shishur-khoroch": "Child Expenses", kheladhula: "Sports", onnanno: "Others", beton: "Salary", bebsha: "Business", freelancing: "Freelancing", tuition: "Tuition / Teaching", "krishi-ay": "Farm Income / Crop Sale", "bhara-ay": "House / Shop Rent Income", shud: "Interest / Dividend", bonus: "Bonus", "upohar-ay": "Gift / Salami", remittance: "Remittance", "online-ay": "Online Income", "part-time": "Part-time", commission: "Commission", "purono-bikri": "Sale of Old Items", "rin-ferot": "Loan Repaid", "onnanno-ay": "Other income" },
};

const I18N = {
  bn: {
    appTitle: "AI হিসাব নিকাশ", appSubtitle: "দৈনন্দিন আয়-ব্যয়ের স্মার্ট হিসাব",
    income: "আয়", expense: "খরচ", savings: "সঞ্চয়",
    aiQuick: "AI দ্রুত লিখন", aiQuickHint: "লিখুন বা বলুন — যেমন: “আজ বাজারে ৫০০ টাকা খরচ”",
    aiPlaceholder: "যেমন: আজ বাজারে ৫০০ টাকা খরচ",
    parseBtnLabel: "AI দিয়ে বুঝে ফরমে বসান", micLabel: "ভয়েসে বলুন",
    aiEnterHint: "Enter চাপলেও চলবে — ফরমে বসিয়ে যাচাই করে সংরক্ষণ করুন।",
    addEntry: "নতুন হিসাব যোগ করুন", editEntry: "হিসাব সম্পাদনা করুন",
    amount: "টাকার পরিমাণ (৳)", category: "খাত", date: "তারিখ", note: "নোট (ঐচ্ছিক)",
    notePh: "যেমন: বাজারে মাছ কিনলাম", save: "সংরক্ষণ করুন", cancel: "বাতিল",
    dailyList: "এই মাসের হিসাব", emptyList: "এই মাসে এখনো কোনো হিসাব নেই।",
    summaryTitle: "মাসের সারসংক্ষেপ", adviceTitle: "AI পরামর্শ",
    compareTitle: "গত মাসের সাথে তুলনা", colCategory: "খাত", colThis: "এই মাস", colLast: "গত মাস", colDiff: "পার্থক্য",
    emptyCompare: "তুলনা করার মতো গত মাসের হিসাব নেই।",
    installTitle: "📱 ফোনে অ্যাপ হিসেবে বসান",
    installHint: "ব্রাউজারের মেনু থেকে “Add to Home screen” / “হোম স্ক্রিনে যোগ করুন” চাপুন — তাহলে অ্যাপের মতো খুলবে। অফলাইনে অ্যাপের চেহারা দেখা যাবে, তবে নতুন হিসাব সংরক্ষণে ইন্টারনেট লাগবে।",
    footer: "আপনার হিসাব, আপনার হাতে",
    parsedAs: "বোঝা গেল — নিচের ফরমে বসানো হয়েছে, যাচাই করে সংরক্ষণ করুন:",
    noAmount: "টাকার পরিমাণ পাওয়া যায়নি — ফরমে নিজে বসান।",
    listening: "শুনছি… বলুন", micUnsupported: "এই ব্রাউজারে ভয়েস সমর্থিত নয়।",
    overspendTitle: "⚠️ বেশি খরচের সতর্কতা", overspendLine: "খাতে খরচ গত মাসের চেয়ে বেড়েছে",
    edit: "সম্পাদনা", del: "মুছুন", confirmDelTitle: "এই হিসাবটি মুছে ফেলবেন?", confirmDelText: "মুছে ফেললে এই হিসাবটি আর ফিরে আসবে না।",
    developedBy: "এই অ্যাপটি ডেভেলপ করেছেন", themeDarkLabel: "ডার্ক মোড চালু করুন", themeLightLabel: "লাইট মোড চালু করুন",
    totalDay: "মোট", vsLast: "গত মাসের চেয়ে", noChange: "পরিবর্তন নেই",
    notifyTitle: "প্রতিদিনের হিসাবের রিমাইন্ডার",
    notifyText: "১ দিনের বেশি হিসাব না লিখলে সকাল ৯টায় মনে করিয়ে দেওয়া হবে — “আজকের দিনটাও তোমার দৈনন্দিন হিসাবের মধ্যে পড়ে, এখনই হিসাব লিখে ফেলো।”",
    notifyLimit: "সত্য কথা: ফোনের Chrome পুরোপুরি বন্ধ থাকলে আর ইন্টারনেট না থাকলে নোটিফিকেশন ঠিক সময়ে আসতে পারে না — এটা PWA-এর সীমা। তবে অ্যাপ খুললেই বা ইন্টারনেট ফিরলেই ছুটে যাওয়া রিমাইন্ডারটি আসল সময়সহ দেখিয়ে দেওয়া হবে।",
    notifyEnable: "রিমাইন্ডার চালু করো", notifyDisable: "রিমাইন্ডার বন্ধ করো",
    notifyOn: "✅ রিমাইন্ডার চালু আছে — ১ দিনের বেশি হিসাব না লিখলে সকাল ৯টায় নোটিফিকেশন আসবে।",
    notifyOff: "রিমাইন্ডার বন্ধ আছে।",
    notifyNeedPermission: "নোটিফিকেশনের অনুমতি দিলে তবেই রিমাইন্ডার আসবে — ব্রাউজারের অনুমতির বাক্সে Allow চাপুন।",
    notifyDenied: "নোটিফিকেশনের অনুমতি বন্ধ করা আছে — ব্রাউজারের সাইট সেটিংস থেকে অনুমতি দিলে রিমাইন্ডার চালু হবে।",
    notifyUnsupported: "এই ব্রাউজারে পুশ নোটিফিকেশন চলে না — তবে অ্যাপ খুললেই ছুটে যাওয়া দিনের রিমাইন্ডার দেখতে পাবেন।",
    notifyNoServerPush: "সার্ভারের পুশ এখনো সেট হয়নি — তবু অ্যাপ খোলা থাকলে বা ইন্টারনেট ফিরলে রিমাইন্ডার দেখাবে।",
    missedTitle: "⚠️ আজকের হিসাব এখনো লেখা হয়নি",
    missedText: "এই দিনগুলোর হিসাব লেখা হয়নি:",
    missedBtn: "আজকের হিসাব লিখুন",
    historyTitle: "রিমাইন্ডারের ইতিহাস",
    historyEmpty: "এখনো কোনো রিমাইন্ডার আসেনি।",
    reminderShort: "দৈনন্দিন হিসাবের রিমাইন্ডার",
    reminderMsg: "আজকের হিসাব কি লিখেছো? আজকের দিনটাও তোমার দৈনন্দিন হিসাবের মধ্যে পড়ে — এখনই অ্যাপে ঢুকে আজকের খরচ বা আয় লিখে ফেলো।",
    dueWas: "আসার কথা ছিল", sentAt: "পাঠানো হয়েছে",
    viaPush: "পুশ নোটিফিকেশন", viaLocal: "অ্যাপ খুলে দেখানো হয়েছে",
    agoNow: "এখনই", agoMin: "মিনিট আগে", agoHour: "ঘণ্টা আগে", agoDay: "দিন আগে",
    authIntro: "Google দিয়ে লগইন করুন — প্রত্যেকের হিসাব শুধু তার নিজের কাছেই দেখা যাবে, পাসওয়ার্ড মনে রাখতে হবে না।",
    authErrNetwork: "সার্ভারের সাথে যোগাযোগ করা যাচ্ছে না — ইন্টারনেট দেখে আবার চেষ্টা করুন।",
    authGoogleOff: "Google লগইন এখনো চালু হয়নি — শীঘ্রই চালু হবে।",
    authGoogleErr: "Google লগইন করা যায়নি, আবার চেষ্টা করুন।",
    logout: "লগআউট", loggedInAs: "লগইন:",
  },
  en: {
    appTitle: "AI Hisab Nikash", appSubtitle: "Smart daily income-expense tracker",
    income: "Income", expense: "Expense", savings: "Savings",
    aiQuick: "AI Quick Entry", aiQuickHint: "Type or speak — e.g. “আজ বাজারে ৫০০ টাকা খরচ”",
    aiPlaceholder: "e.g. Bazar 500 taka today",
    parseBtnLabel: "Understand with AI and fill the form", micLabel: "Speak",
    aiEnterHint: "Press Enter too — check the filled form, then save.",
    addEntry: "Add a new entry", editEntry: "Edit entry",
    amount: "Amount (Tk)", category: "Category", date: "Date", note: "Note (optional)",
    notePh: "e.g. Bought fish at the bazar", save: "Save", cancel: "Cancel",
    dailyList: "This month's entries", emptyList: "No entries yet this month.",
    summaryTitle: "Month summary", adviceTitle: "AI Advice",
    compareTitle: "Compare with last month", colCategory: "Category", colThis: "This month", colLast: "Last month", colDiff: "Difference",
    emptyCompare: "No last-month entries to compare with.",
    installTitle: "📱 Install as an app on your phone",
    installHint: "From the browser menu choose “Add to Home screen” — it will open like an app. The app shell works offline, but saving new entries needs internet.",
    footer: "Your accounts, in your hands",
    parsedAs: "Understood — filled into the form below, please check and save:",
    noAmount: "No amount found — please enter it in the form.",
    listening: "Listening… please speak", micUnsupported: "Voice input is not supported in this browser.",
    overspendTitle: "⚠️ Overspend warning", overspendLine: "spending is up vs last month",
    edit: "Edit", del: "Delete", confirmDelTitle: "Delete this entry?", confirmDelText: "Once deleted, this entry cannot be recovered.",
    developedBy: "Developed by", themeDarkLabel: "Switch to dark mode", themeLightLabel: "Switch to light mode",
    totalDay: "Total", vsLast: "vs last month", noChange: "No change",
    notifyTitle: "Daily accounts reminder",
    notifyText: "If you don't write any accounts for more than 1 day, you will be reminded at 9 AM — “Today is part of your daily accounts too, write today's accounts now.”",
    notifyLimit: "Honest limit: if Chrome is fully closed on your phone and there is no internet, the notification may not arrive on time — that is a PWA limit. But as soon as you open the app or the internet returns, the missed reminder will be shown with its original time.",
    notifyEnable: "Turn on reminders", notifyDisable: "Turn off reminders",
    notifyOn: "✅ Reminders are on — if you don't write any accounts for more than 1 day, a notification will come at 9 AM.",
    notifyOff: "Reminders are off.",
    notifyNeedPermission: "Reminders need notification permission — press Allow in the browser prompt.",
    notifyDenied: "Notification permission is blocked — allow it in the browser's site settings to turn reminders on.",
    notifyUnsupported: "Push notifications don't work in this browser — but opening the app will still show you any missed-day reminder.",
    notifyNoServerPush: "Server push is not set up yet — reminders will still show when you open the app or when the internet returns.",
    missedTitle: "⚠️ Today's accounts are not written yet",
    missedText: "No accounts were written on these days:",
    missedBtn: "Write today's accounts",
    historyTitle: "Reminder history",
    historyEmpty: "No reminders yet.",
    reminderShort: "Daily accounts reminder",
    reminderMsg: "Have you written today's accounts yet? Today is part of your daily accounts too — open the app now and write today's expense or income.",
    dueWas: "Was due", sentAt: "Sent",
    viaPush: "Push notification", viaLocal: "Shown when the app opened",
    agoNow: "just now", agoMin: "min ago", agoHour: "hours ago", agoDay: "days ago",
    authIntro: "Sign in with Google — each person's accounts are visible only to them, no password to remember.",
    authErrNetwork: "Cannot reach the server — check your internet and try again.",
    authGoogleOff: "Google sign-in is not set up yet — coming soon.",
    authGoogleErr: "Google sign-in failed, please try again.",
    logout: "Log out", loggedInAs: "Logged in:",
  },
};

let lang = localStorage.getItem("hn-lang") || "bn";
let theme = localStorage.getItem("hn-theme") || (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
function applyTheme() {
  const dark = theme === "dark";
  document.documentElement.classList.toggle("dark", dark);
  const btn = $("themeToggle");
  if (btn) {
    btn.textContent = dark ? "☀️" : "🌙";
    btn.setAttribute("aria-label", t(dark ? "themeLightLabel" : "themeDarkLabel"));
    btn.setAttribute("title", t(dark ? "themeLightLabel" : "themeDarkLabel"));
  }
  try { localStorage.setItem("hn-theme", theme); } catch (e) { /* ignore */ }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = dark ? "#111827" : "#047857";
}
let curMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
let curType = "expense";
let entriesCache = [];

const $ = (id) => document.getElementById(id);
const t = (key) => (I18N[lang] && I18N[lang][key]) || I18N.bn[key] || key;

/* ---------------- accounts (Google-only login) ----------------
   Every person signs in with Google — there is no username/password
   login at all. The server only ever returns the logged-in user's own
   entries, summary and reminders. The JWT lives in localStorage; any
   401 clears it and shows the login screen again. */
let currentUser = null;
function getToken() {
  try { return localStorage.getItem("hn-token"); } catch (e) { return null; }
}
async function apiFetch(path, opts = {}) {
  const headers = Object.assign({}, opts.headers || {});
  const token = getToken();
  if (token) headers["Authorization"] = "Bearer " + token;
  const res = await fetch(path, Object.assign({}, opts, { headers }));
  if (res.status === 401) logout();
  return res;
}
function showAuth() {
  $("authScreen").classList.remove("hidden");
  $("appMain").classList.add("hidden");
  $("logoutBtn").classList.add("hidden");
  $("loggedInLine").classList.add("hidden");
}
function showApp() {
  $("authScreen").classList.add("hidden");
  $("appMain").classList.remove("hidden");
  $("logoutBtn").classList.remove("hidden");
  $("loggedInLine").classList.remove("hidden");
  $("loggedInUser").textContent = currentUser ? currentUser.username : "";
}
function afterLogin(data) {
  // Success path for Google sign-in.
  currentUser = data.user;
  try {
    localStorage.setItem("hn-token", data.token);
    localStorage.setItem("hn-username", data.user.username);
  } catch (e2) { /* ignore */ }
  showApp();
  postTokenToSW();
  resetForm();
  loadAll();
  updateNotifyUI();
  checkReminders();
  syncPushSubscription();
}

/* ---------------- Sign in with Google ----------------
   Google Identity Services (GIS): the button is rendered by Google's
   own library, the server verifies the ID token (never trust it on the
   client alone). If Google is not set up (no GOOGLE_CLIENT_ID on the
   server) or the GIS script cannot load (offline), the button stays
   hidden and a note is shown instead. */
let googleReady = false;
function loadGoogleScript() {
  return new Promise((resolve) => {
    if (window.google && window.google.accounts) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve(!!(window.google && window.google.accounts));
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
}
async function onGoogleCredential(resp) {
  const err = $("authError");
  err.classList.add("hidden");
  let res;
  try {
    res = await fetch("/api/auth/google", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_token: resp.credential }),
    });
  } catch (e2) {
    err.textContent = t("authErrNetwork");
    err.classList.remove("hidden");
    return;
  }
  if (!res.ok) {
    err.textContent = t("authGoogleErr");
    err.classList.remove("hidden");
    return;
  }
  afterLogin(await res.json());
}
async function initGoogle() {
  let cfg = {};
  try {
    const res = await fetch("/api/config");
    if (res.ok) cfg = await res.json();
  } catch (e) { /* offline — Google stays hidden */ }
  if (!cfg.google_enabled || !cfg.google_client_id) {
    $("googleNote").classList.remove("hidden");
    return;
  }
  if (!await loadGoogleScript()) {
    $("googleNote").classList.remove("hidden");
    return;
  }
  try {
    window.google.accounts.id.initialize({
      client_id: cfg.google_client_id,
      callback: onGoogleCredential,
      auto_select: false,
    });
    $("googleBox").classList.remove("hidden");
    const slot = $("googleBtnSlot");
    window.google.accounts.id.renderButton(slot, {
      theme: "outline", size: "large", shape: "rectangular",
      width: Math.max(240, Math.min(360, slot.clientWidth || 320)),
    });
    googleReady = true;
  } catch (e) {
    $("googleNote").classList.remove("hidden");
  }
}
function logout() {
  currentUser = null;
  try {
    localStorage.removeItem("hn-token");
    localStorage.removeItem("hn-username");
  } catch (e) { /* ignore */ }
  entriesCache = [];
  summaryCache = null;
  reminderStatusCache = null;
  reminderHistoryCache = [];
  renderAll();
  postTokenToSW();
  showAuth();
}
async function initAuth() {
  const token = getToken();
  if (!token) { showAuth(); updateNotifyUI(); return; }
  try {
    const res = await apiFetch("/api/auth/me");
    if (!res.ok) { showAuth(); return; }
    const data = await res.json();
    currentUser = data.user;
    showApp();
    postTokenToSW();
    loadAll();
    updateNotifyUI();
    checkReminders();
    syncPushSubscription();
  } catch (e) { showAuth(); }
}
async function postTokenToSW() {
  // The service worker cannot read localStorage — hand it the token so
  // its Background Sync catch-up check can call the (authed) status API.
  if (!("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    if (reg.active) reg.active.postMessage({ type: "auth-token", token: getToken() });
  } catch (e) { /* ignore */ }
}
async function syncPushSubscription() {
  // Reminders were already on for this device: re-send the existing push
  // subscription now that we are logged in, so it is tied to this user
  // (otherwise the daily server push would not know whose it is).
  let on = false;
  try { on = localStorage.getItem("hn-reminders-on") === "1"; } catch (e) { /* ignore */ }
  if (!on || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    await apiFetch("/api/push/subscribe", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_id: deviceId(), subscription: sub.toJSON() }),
    });
  } catch (e) { /* best effort */ }
}

function fmtNum(n) {
  const s = Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });
  return lang === "bn" ? toBn(s) : s;
}
function fmtMoney(n) { return (lang === "bn" ? "৳" : "Tk ") + fmtNum(n); }
function fmtPct(p) { const s = (p > 0 ? "+" : "") + p.toFixed(0) + "%"; return lang === "bn" ? toBn(s) : s; }
function fmtDate(iso) {
  const d = new Date(iso + "T00:00:00");
  const days = { bn: ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহ", "শুক্র", "শনি"], en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] };
  const months = { bn: ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"], en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] };
  return `${days[lang][d.getDay()]} ${lang === "bn" ? toBn(d.getDate()) : d.getDate()} ${months[lang][d.getMonth()]} ${lang === "bn" ? toBn(d.getFullYear()) : d.getFullYear()}`;
}
function monthLabel(ym) {
  const [y, m] = ym.split("-").map(Number);
  const months = { bn: ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"], en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] };
  return `${months[lang][m - 1]} ${lang === "bn" ? toBn(y) : y}`;
}

/* ---------------- language ---------------- */
function applyLang() {
  document.documentElement.lang = lang === "bn" ? "bn" : "en";
  document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll("[data-i18n-ph]").forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
  $("langToggle").textContent = lang === "bn" ? "English" : "বাংলা";
  // Icon-only AI buttons: keep their accessible labels in sync with language.
  $("aiParseBtn").setAttribute("aria-label", t("parseBtnLabel"));
  $("aiParseBtn").setAttribute("title", t("parseBtnLabel"));
  $("micBtn").setAttribute("aria-label", t("micLabel"));
  $("micBtn").setAttribute("title", t("micLabel"));
  applyTheme();
  localStorage.setItem("hn-lang", lang);
  fillCategoryOptions();
  renderAll();
}
$("langToggle").addEventListener("click", () => { lang = lang === "bn" ? "en" : "bn"; applyLang(); });
$("themeToggle").addEventListener("click", () => { theme = theme === "dark" ? "light" : "dark"; applyTheme(); });

/* ---------------- month ---------------- */
function shiftMonth(delta) {
  const [y, m] = curMonth.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  curMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  loadAll();
}
$("prevMonth").addEventListener("click", () => shiftMonth(-1));
$("nextMonth").addEventListener("click", () => shiftMonth(1));
$("monthInput").addEventListener("change", (e) => { if (e.target.value) { curMonth = e.target.value; loadAll(); } });

/* ---------------- form ---------------- */
function fillCategoryOptions() {
  const sel = $("category");
  const keep = sel.value;
  sel.innerHTML = "";
  CATS[curType].forEach((c) => {
    const o = document.createElement("option");
    o.value = c; o.textContent = CAT_NAME[lang][c];
    sel.appendChild(o);
  });
  if (CATS[curType].includes(keep)) sel.value = keep;
}
function setType(type) {
  curType = type;
  $("typeExpense").classList.toggle("chip-active", type === "expense");
  $("typeIncome").classList.toggle("chip-active", type === "income");
  fillCategoryOptions();
}
$("typeExpense").addEventListener("click", () => setType("expense"));
$("typeIncome").addEventListener("click", () => setType("income"));

function resetForm() {
  $("editId").value = "";
  $("formTitle").textContent = t("addEntry");
  $("cancelEdit").classList.add("hidden");
  $("amount").value = ""; $("note").value = "";
  $("entryDate").value = new Date().toISOString().slice(0, 10);
  setType("expense");
}
$("cancelEdit").addEventListener("click", resetForm);

$("entryForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    type: curType,
    amount: parseFloat($("amount").value),
    category: $("category").value,
    note: $("note").value.trim(),
    date: $("entryDate").value,
  };
  const id = $("editId").value;
  const res = await apiFetch(id ? `/api/entries/${id}` : "/api/entries", {
    method: id ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (res.status === 401) return; // apiFetch already showed the login screen
  if (!res.ok) { alert(await res.text()); return; }
  resetForm();
  loadAll();
  checkReminders();
});

function startEdit(entry) {
  $("editId").value = entry.id;
  $("formTitle").textContent = t("editEntry");
  $("cancelEdit").classList.remove("hidden");
  setType(entry.type);
  $("amount").value = entry.amount;
  $("category").value = entry.category;
  $("entryDate").value = entry.date;
  $("note").value = entry.note || "";
  $("entryForm").scrollIntoView({ behavior: "smooth" });
}
/* ---------------- delete modal (custom) ---------------- */
let pendingDeleteId = null;
let pendingDeleteEntry = null;
function openDeleteModal(entry) {
  pendingDeleteId = entry.id;
  pendingDeleteEntry = entry;
  const box = $("deleteModalEntry");
  box.innerHTML = `<div class="font-semibold">${escapeHtml(CAT_NAME[lang][entry.category] || entry.category)}${entry.note ? ` — ${escapeHtml(entry.note)}` : ""}</div>`
    + `<div class="font-bold mt-1 ${entry.type === "income" ? "text-emerald-700" : "text-red-600"}">${entry.type === "income" ? "+" : "−"}${fmtMoney(entry.amount)} • ${fmtDate(entry.date)}</div>`;
  const modal = $("deleteModal");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  $("deleteModalCancel").focus();
}
function closeDeleteModal() {
  const modal = $("deleteModal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  pendingDeleteId = null;
  pendingDeleteEntry = null;
}
async function confirmDeleteModal() {
  if (pendingDeleteId == null) return;
  const id = pendingDeleteId;
  closeDeleteModal();
  await apiFetch(`/api/entries/${id}`, { method: "DELETE" });
  loadAll();
}
$("deleteModalCancel").addEventListener("click", closeDeleteModal);
$("deleteModalConfirm").addEventListener("click", confirmDeleteModal);
$("deleteModalBackdrop").addEventListener("click", closeDeleteModal);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !$("deleteModal").classList.contains("hidden")) closeDeleteModal();
});
function deleteEntry(entry) { openDeleteModal(entry); }

/* ---------------- AI quick entry ---------------- */
async function parseQuick(text) {
  const res = await apiFetch("/api/parse", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error("parse failed");
  return res.json();
}
function prefillFromParsed(p) {
  setType(p.type || "expense");
  if (p.amount != null) $("amount").value = p.amount;
  if (p.category && CATS[p.type || "expense"].includes(p.category)) $("category").value = p.category;
  if (p.date) $("entryDate").value = p.date;
  if (p.note) $("note").value = p.note;
  const box = $("aiResult");
  box.classList.remove("hidden");
  const parts = [t("parsedAs"), "<br><b>",
    (p.type === "income" ? t("income") : t("expense")), " • ",
    fmtMoney(p.amount || 0), " • ", CAT_NAME[lang][p.category] || p.category, " • ",
    p.date, "</b>"];
  if (p.amount == null) parts.push("<br>" + t("noAmount"));
  box.innerHTML = parts.join("");
  $("entryForm").scrollIntoView({ behavior: "smooth" });
  $("amount").focus();
}
$("aiParseBtn").addEventListener("click", async () => {
  const text = $("aiText").value.trim();
  if (!text) return;
  try { prefillFromParsed(await parseQuick(text)); }
  catch (err) { alert(err.message); }
});
$("aiText").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); $("aiParseBtn").click(); } });

// Mic — Web Speech API, hidden if unsupported.
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SR) {
  $("micBtn").style.display = "none";
} else {
  $("micBtn").addEventListener("click", () => {
    const rec = new SR();
    rec.lang = lang === "bn" ? "bn-BD" : "en-US";
    rec.interimResults = false;
    $("micStatus").classList.remove("hidden");
    $("micStatus").textContent = t("listening");
    rec.onresult = async (ev) => {
      const text = ev.results[0][0].transcript;
      $("aiText").value = text;
      $("micStatus").classList.add("hidden");
      try { prefillFromParsed(await parseQuick(text)); } catch (err) { /* keep text for manual parse */ }
    };
    rec.onerror = () => { $("micStatus").classList.add("hidden"); };
    rec.onend = () => { $("micStatus").classList.add("hidden"); };
    rec.start();
  });
}

/* ---------------- rendering ---------------- */
let summaryCache = null;

function renderAll() {
  $("monthLabel").textContent = monthLabel(curMonth);
  $("monthInput").value = curMonth;
  renderList();
  renderSummary();
  renderReminderSection();
}
function renderList() {
  const list = $("entryList");
  list.innerHTML = "";
  $("emptyList").classList.toggle("hidden", entriesCache.length > 0);
  const byDay = {};
  entriesCache.forEach((e) => { (byDay[e.date] = byDay[e.date] || []).push(e); });
  Object.keys(byDay).sort().reverse().forEach((day) => {
    const rows = byDay[day];
    const dayInc = rows.filter((r) => r.type === "income").reduce((s, r) => s + r.amount, 0);
    const dayExp = rows.filter((r) => r.type === "expense").reduce((s, r) => s + r.amount, 0);
    const head = document.createElement("div");
    head.className = "flex justify-between items-center gap-2 flex-wrap pt-3 pb-1";
    head.innerHTML = `<span class="font-semibold">${fmtDate(day)}</span>
      <span class="text-sm"><span class="text-emerald-700 font-semibold">+${fmtMoney(dayInc)}</span> <span class="text-red-600 font-semibold">−${fmtMoney(dayExp)}</span></span>`;
    list.appendChild(head);
    rows.forEach((e) => {
      const row = document.createElement("div");
      row.className = "flex items-center justify-between py-2 gap-2";
      row.innerHTML = `
        <div class="min-w-0 flex-1">
          <div class="font-medium break-words">${CAT_NAME[lang][e.category] || e.category}${e.note ? ` — <span class="text-gray-500 font-normal">${escapeHtml(e.note)}</span>` : ""}</div>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <span class="font-bold whitespace-nowrap ${e.type === "income" ? "text-emerald-700" : "text-red-600"}">${e.type === "income" ? "+" : "−"}${fmtMoney(e.amount)}</span>
          <button class="text-xs bg-gray-100 hover:bg-gray-200 rounded px-3 py-2 min-h-[40px]" data-act="edit">${t("edit")}</button>
          <button class="text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded px-3 py-2 min-h-[40px]" data-act="del">${t("del")}</button>
        </div>`;
      row.querySelector('[data-act="edit"]').addEventListener("click", () => startEdit(e));
      row.querySelector('[data-act="del"]').addEventListener("click", () => deleteEntry(e));
      list.appendChild(row);
    });
  });
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function renderSummary() {
  const s = summaryCache;
  if (!s) return;
  $("sumIncome").textContent = fmtMoney(s.income);
  $("sumExpense").textContent = fmtMoney(s.expense);
  $("sumSavings").textContent = fmtMoney(s.savings);

  // Category bars (expenses first, then income categories).
  const bars = $("categoryBars");
  bars.innerHTML = "";
  const maxAmt = Math.max(1, ...Object.values(s.by_category));
  const cats = [...CATS.expense, ...CATS.income].filter((c) => s.by_category[c] > 0);
  $("emptySummary").classList.toggle("hidden", cats.length > 0);
  cats.forEach((c) => {
    const amt = s.by_category[c];
    const isInc = CATS.income.includes(c);
    const row = document.createElement("div");
    row.innerHTML = `
      <div class="flex justify-between gap-2 text-sm"><span class="min-w-0 truncate">${CAT_NAME[lang][c]}</span><span class="font-semibold shrink-0 whitespace-nowrap">${fmtMoney(amt)}</span></div>
      <div class="bar-track h-3 mt-1"><div class="bar-fill ${isInc ? "bar-fill-inc" : "bar-fill-exp"}" style="width:${Math.round(amt / maxAmt * 100)}%"></div></div>`;
    bars.appendChild(row);
  });

  // Advice.
  const adv = $("adviceList");
  adv.innerHTML = "";
  (s.advice || []).forEach((a) => {
    const li = document.createElement("li");
    li.textContent = a;
    adv.appendChild(li);
  });

  // Overspend warnings (>30% above last month).
  const box = $("overspendBox");
  box.innerHTML = "";
  if (s.overspend && s.overspend.length) {
    box.classList.remove("hidden");
    const div = document.createElement("div");
    div.className = "bg-amber-50 border border-amber-300 rounded-xl p-4";
    div.innerHTML = `<p class="font-bold text-amber-800">${t("overspendTitle")}</p>` +
      s.overspend.map((o) =>
        `<p class="text-sm mt-1">⚠️ ${CAT_NAME[lang][o.category]} ${t("overspendLine")} ${lang === "bn" ? toBn(o.pct_increase.toFixed(0)) : o.pct_increase.toFixed(0)}% (${fmtMoney(o.this_month)} ${t("vsLast")} ${fmtMoney(o.last_month)})</p>`
      ).join("");
    box.appendChild(div);
  } else {
    box.classList.add("hidden");
  }

  // Comparison cards + table.
  const cards = $("compareCards");
  const card = (label, val, pct) => {
    const pctTxt = pct == null ? t("noChange") : fmtPct(pct);
    const cls = pct == null ? "text-gray-500" : pct > 0 ? "text-red-600" : "text-emerald-700";
    return `<div class="bg-gray-50 rounded-lg p-2 min-w-0"><div class="text-[11px] sm:text-xs text-gray-500 truncate">${label}</div>
      <div class="font-bold text-sm sm:text-base leading-snug break-words">${fmtMoney(val)}</div><div class="text-[11px] sm:text-xs ${cls}">${pctTxt}</div></div>`;
  };
  cards.innerHTML = card(t("income"), s.income, s.income_pct_change)
    + card(t("expense"), s.expense, s.expense_pct_change)
    + card(t("savings"), s.savings, s.savings_pct_change);
  const tb = $("compareTable");
  tb.innerHTML = "";
  const rows = (s.comparison || []).filter((r) => r.this_month > 0 || r.last_month > 0);
  $("emptyCompare").classList.toggle("hidden", rows.length > 0);
  rows.forEach((r) => {
    const tr = document.createElement("tr");
    tr.className = "border-b";
    const diffCls = r.difference > 0 ? "text-red-600" : r.difference < 0 ? "text-emerald-700" : "text-gray-500";
    tr.innerHTML = `<td class="py-2">${CAT_NAME[lang][r.category]}</td>
      <td class="py-2 text-right">${fmtMoney(r.this_month)}</td>
      <td class="py-2 text-right">${fmtMoney(r.last_month)}</td>
      <td class="py-2 text-right font-semibold ${diffCls}">${r.difference > 0 ? "+" : ""}${fmtMoney(r.difference)}</td>`;
    tb.appendChild(tr);
  });
}

/* ---------------- loading ---------------- */
async function loadAll() {
  $("monthLabel").textContent = monthLabel(curMonth);
  $("monthInput").value = curMonth;
  const [eRes, sRes] = await Promise.all([
    apiFetch(`/api/entries?month=${curMonth}`),
    apiFetch(`/api/summary?month=${curMonth}&lang=${lang}`),
  ]);
  entriesCache = eRes.ok ? await eRes.json() : [];
  summaryCache = sRes.ok ? await sRes.json() : null;
  // Remember the newest entry date on this device so the missed-days
  // card can work fully offline (status API refines it when online).
  if (entriesCache.length) {
    const maxDate = entriesCache.reduce((m, e) => (e.date > m ? e.date : m), entriesCache[0].date);
    try {
      const stored = localStorage.getItem("hn-last-entry-date");
      if (!stored || maxDate > stored) localStorage.setItem("hn-last-entry-date", maxDate);
    } catch (e) { /* ignore */ }
  }
  renderAll();
}

/* ---------------- daily reminders ----------------
   Layers (honest): server Web Push (daily cron trigger) when online;
   in-app + catch-up check on every load and on 'online'; Background Sync
   in the service worker when connectivity returns; fully-offline local
   check from the last known entry date stored on this device. */
let reminderStatusCache = null;
let reminderHistoryCache = [];

function deviceId() {
  let id = null;
  try { id = localStorage.getItem("hn-device-id"); } catch (e) { /* ignore */ }
  if (!id) {
    id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
      : "dev-" + Date.now() + "-" + Math.floor(Math.random() * 1e9);
    try { localStorage.setItem("hn-device-id", id); } catch (e) { /* ignore */ }
  }
  return id;
}
function urlB64ToUint8(b64) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
function fmtDateTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  const months = { bn: ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"], en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] };
  const day = lang === "bn" ? toBn(d.getDate()) : d.getDate();
  const year = lang === "bn" ? toBn(d.getFullYear()) : d.getFullYear();
  const h = d.getHours(), m = String(d.getMinutes()).padStart(2, "0");
  const h12 = h % 12 || 12;
  const time = lang === "bn"
    ? `${h < 12 ? "সকাল" : h < 16 ? "দুপুর" : h < 18 ? "বিকেল" : h < 20 ? "সন্ধ্যা" : "রাত"} ${toBn(h12)}:${toBn(m)}`
    : `${h12}:${m} ${h < 12 ? "AM" : "PM"}`;
  return `${day} ${months[lang][d.getMonth()]} ${year}, ${time}`;
}
function relTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  if (isNaN(diff) || diff < 60000) return t("agoNow");
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${lang === "bn" ? toBn(mins) : mins} ${t("agoMin")}`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${lang === "bn" ? toBn(hrs) : hrs} ${t("agoHour")}`;
  const days = Math.floor(hrs / 24);
  return `${lang === "bn" ? toBn(days) : days} ${t("agoDay")}`;
}

function renderMissed(st) {
  const card = $("missedCard");
  if (!st || !st.missed_dates || !st.missed_dates.length) {
    card.classList.add("hidden");
    return;
  }
  card.classList.remove("hidden");
  $("missedDates").textContent = t("missedText") + " " +
    st.missed_dates.map((d) => fmtDate(d)).join(", ");
}
function localMissedCheck() {
  // Fully offline: last known entry date lives on this device.
  let last = null;
  try { last = localStorage.getItem("hn-last-entry-date"); } catch (e) { /* ignore */ }
  if (!last) { renderMissed(null); return; }
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const missed = [];
  for (let d = new Date(new Date(last + "T00:00:00").getTime() + 86400000);
       d < today; d = new Date(d.getTime() + 86400000)) {
    missed.push(d.toISOString().slice(0, 10));
  }
  if (!missed.length) { renderMissed(null); return; }
  renderMissed({ missed_dates: missed, due_at: missed[missed.length - 1] + "T09:00:00" });
}
function renderReminderHistory(items) {
  const ul = $("reminderHistory");
  ul.innerHTML = "";
  $("emptyHistory").classList.toggle("hidden", items.length > 0);
  items.forEach((it) => {
    const li = document.createElement("li");
    li.className = "bg-gray-50 rounded-lg p-3";
    const when = it.sent_at || it.due_at;
    let html = `<div class="font-semibold">🔔 ${escapeHtml(t("reminderShort"))}</div>`;
    if (when) html += `<div>${t("sentAt")}: ${escapeHtml(fmtDateTime(when))} • ${escapeHtml(relTime(when))}</div>`;
    if (it.due_at && it.due_at !== it.sent_at) {
      html += `<div class="text-gray-500">${t("dueWas")}: ${escapeHtml(fmtDateTime(it.due_at))} • ${escapeHtml(relTime(it.due_at))}</div>`;
    }
    html += `<div class="text-xs text-gray-400 mt-1">${escapeHtml(it.channel === "push" ? t("viaPush") : t("viaLocal"))}</div>`;
    li.innerHTML = html;
    ul.appendChild(li);
  });
}
function renderReminderSection() {
  if (reminderStatusCache) renderMissed(reminderStatusCache.due ? reminderStatusCache : null);
  else localMissedCheck();
  renderReminderHistory(reminderHistoryCache);
}

async function showCatchUpReminder(st) {
  // A reminder that was due while offline, shown now with its ORIGINAL time.
  const body = `${t("reminderMsg")}\n${t("dueWas")}: ${fmtDateTime(st.due_at)} (${relTime(st.due_at)})`;
  try {
    if ("serviceWorker" in navigator && Notification.permission === "granted") {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification("AI হিসাব নিকাশ", {
        body, icon: "/static/icon-192.png", badge: "/static/icon.svg",
        tag: "hn-daily-reminder",
      });
      return true;
    }
  } catch (e) { /* in-app missed card still shows it */ }
  return false;
}

async function checkReminders() {
  localMissedCheck();
  if (!getToken()) return; // logged out — nothing personal to check
  if (!navigator.onLine) return;
  try {
    const res = await apiFetch("/api/reminders/status");
    if (!res.ok) return;
    const st = await res.json();
    reminderStatusCache = st;
    if (st.last_entry_date) {
      try { localStorage.setItem("hn-last-entry-date", st.last_entry_date); } catch (e) { /* ignore */ }
    }
    renderMissed(st.due ? st : null);
    const hRes = await apiFetch("/api/reminders/history");
    if (hRes.ok) {
      reminderHistoryCache = await hRes.json();
      renderReminderHistory(reminderHistoryCache);
    }
    if (st.due && st.due_at) {
      let lastShown = null;
      try { lastShown = localStorage.getItem("hn-last-shown-reminder"); } catch (e) { /* ignore */ }
      if (lastShown !== st.due_at) {
        await showCatchUpReminder(st);
        try { localStorage.setItem("hn-last-shown-reminder", st.due_at); } catch (e) { /* ignore */ }
        // Record it so the history shows the exact due + shown times.
        try {
          await apiFetch("/api/reminders/shown", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ device_id: deviceId(), due_at: st.due_at, channel: "local" }),
          });
          const r2 = await apiFetch("/api/reminders/history");
          if (r2.ok) { reminderHistoryCache = await r2.json(); renderReminderHistory(reminderHistoryCache); }
        } catch (e) { /* history is best-effort */ }
      }
    }
    // Ask the service worker to re-run this check when connectivity returns.
    if ("serviceWorker" in navigator && "SyncManager" in window) {
      try {
        const reg = await navigator.serviceWorker.ready;
        await reg.sync.register("hn-reminder-check");
      } catch (e) { /* sync not supported — load/online checks still run */ }
    }
  } catch (e) { /* offline — local check already ran */ }
}

function updateNotifyUI() {
  const enableBtn = $("notifyEnableBtn"), disableBtn = $("notifyDisableBtn");
  const statusEl = $("notifyStatus");
  const supported = ("Notification" in window) && ("serviceWorker" in navigator) && ("PushManager" in window);
  let on = false;
  try { on = localStorage.getItem("hn-reminders-on") === "1"; } catch (e) { /* ignore */ }
  if (!supported) {
    statusEl.textContent = t("notifyUnsupported");
    enableBtn.classList.add("hidden"); disableBtn.classList.add("hidden");
    return;
  }
  if (Notification.permission === "denied") {
    statusEl.textContent = t("notifyDenied");
    enableBtn.classList.remove("hidden"); disableBtn.classList.add("hidden");
    return;
  }
  if (on && Notification.permission === "granted") {
    statusEl.textContent = t("notifyOn");
    enableBtn.classList.add("hidden"); disableBtn.classList.remove("hidden");
  } else {
    statusEl.textContent = t("notifyOff");
    enableBtn.classList.remove("hidden"); disableBtn.classList.add("hidden");
  }
}

async function enableReminders() {
  const statusEl = $("notifyStatus");
  if (!("Notification" in window)) { statusEl.textContent = t("notifyUnsupported"); return; }
  let perm = Notification.permission;
  if (perm === "default") perm = await Notification.requestPermission();
  if (perm !== "granted") { statusEl.textContent = t("notifyNeedPermission"); updateNotifyUI(); return; }
  try {
    const cfg = await (await apiFetch("/api/config")).json();
    if (!cfg.push_enabled || !cfg.vapid_public_key) {
      // No server push yet — local + catch-up reminders still work.
      statusEl.textContent = t("notifyNoServerPush");
      try { localStorage.setItem("hn-reminders-on", "1"); } catch (e) { /* ignore */ }
      updateNotifyUI();
      return;
    }
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8(cfg.vapid_public_key),
      });
    }
    await apiFetch("/api/push/subscribe", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_id: deviceId(), subscription: sub.toJSON() }),
    });
    try { localStorage.setItem("hn-reminders-on", "1"); } catch (e) { /* ignore */ }
  } catch (e) { statusEl.textContent = t("notifyNoServerPush"); }
  updateNotifyUI();
}
async function disableReminders() {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await apiFetch("/api/push/unsubscribe", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_id: deviceId(), endpoint: sub.endpoint }),
      });
      await sub.unsubscribe();
    }
  } catch (e) { /* ignore */ }
  try { localStorage.removeItem("hn-reminders-on"); } catch (e) { /* ignore */ }
  updateNotifyUI();
}
$("notifyEnableBtn").addEventListener("click", enableReminders);
$("notifyDisableBtn").addEventListener("click", disableReminders);
$("missedGoBtn").addEventListener("click", () => {
  $("entryDate").value = new Date().toISOString().slice(0, 10);
  $("entryForm").scrollIntoView({ behavior: "smooth" });
  $("amount").focus();
});
window.addEventListener("online", checkReminders);
// Relative times ("৩ ঘণ্টা আগে") age live; local missed check re-runs.
setInterval(() => { renderReminderHistory(reminderHistoryCache); localMissedCheck(); }, 60000);

// PWA: register service worker.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => { /* offline cache is best-effort */ });
  });
}

// Logout wiring.
$("logoutBtn").addEventListener("click", () => logout());
$("logoutLink").addEventListener("click", () => logout());

resetForm();
applyLang();
initAuth();
initGoogle();
