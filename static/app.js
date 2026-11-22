/* Hisab Nikash — frontend.
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
    appTitle: "হিসাব নিকাশ", appSubtitle: "দৈনন্দিন আয়-ব্যয়ের স্মার্ট হিসাব",
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
    installHint: "ব্রাউজারের মেনু থেকে “Add to Home screen” / “হোম স্ক্রিনে যোগ করুন” চাপুন — তাহলে অ্যাপের মতো খুলবে। ইন্টারনেট না থাকলেও হিসাব দেখা ও লেখা যাবে।",
    pendingTag: "⏳ পাঠানো বাকি",
    offlineBanner: "📶 অফলাইনে আছো",
    offlineBannerPending: "📶 অফলাইনে আছো",
    onlineSyncPending: "🌐 ইন্টারনেট ফিরেছে — {n}টি হিসাব পাঠানো হচ্ছে…",
    aiNeedsInternet: "AI বুঝতে ইন্টারনেট লাগে — ফরমে নিজে লিখে সংরক্ষণ করো।",
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
    notifyEnable: "রিমাইন্ডার চালু করো", notifyDisable: "রিমাইন্ডার বন্ধ করো",
    notifyOn: "✅ রিমাইন্ডার চালু আছে",
    notifyOff: "রিমাইন্ডার বন্ধ আছে।",
    notifyNeedPermission: "নোটিফিকেশনের অনুমতি দিলে তবেই রিমাইন্ডার আসবে — ব্রাউজারের অনুমতির বাক্সে Allow চাপুন।",
    notifyDenied: "নোটিফিকেশনের অনুমতি বন্ধ করা আছে — ব্রাউজারের সাইট সেটিংস থেকে অনুমতি দিলে রিমাইন্ডার চালু হবে।",
    notifyDeniedNative: "নোটিফিকেশনের অনুমতি বন্ধ আছে — ফোনের Settings → Apps → হিসাব নিকাশ → Notifications থেকে চালু করলে রিমাইন্ডার আসবে।",
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
    authGoogleNative: "Google দিয়ে লগইন",
    logout: "লগআউট", loggedInAs: "লগইন:",
    adminBtnLabel: "অ্যাডমিন", adminTitle: "🛡️ অ্যাডমিন ড্যাশবোর্ড",
    adminBack: "ফিরে যাও", adminStatsTitle: "পরিসংখ্যান",
    statTotalUsers: "মোট ইউজার", statNewUsers: "নতুন (৭ দিন)",
    statTotalEntries: "মোট এন্ট্রি", statEntriesToday: "আজকের এন্ট্রি",
    statActiveUsers: "সক্রিয় (৭ দিন)",
    maintTitle: "রক্ষণাবেক্ষণ মোড",
    maintToggle: "রক্ষণাবেক্ষণ মোড চালু",
    maintMsgPh: "রক্ষণাবেক্ষণের বার্তা (ঐচ্ছিক)",
    maintSave: "সংরক্ষণ করুন",
    maintOnlyAdmin: "শুধু মূল অ্যাডমিনই রক্ষণাবেক্ষণ বদলাতে পারেন।",
    maintBanner: "⚠️ রক্ষণাবেক্ষণ মোড চালু আছে — সাধারণ ব্যবহারকারীরা এখন অ্যাপ ব্যবহার করতে পারছেন না।",
    maintScreenTitle: "রক্ষণাবেক্ষণ চলছে",
    tryLater: "পরে আবার চেষ্টা করুন।",
    adminUsersTitle: "ব্যবহারকারী",
    adminSearchPh: "নাম বা ইমেইল খুঁজুন…",
    roleOnlyAdmin: "শুধু মূল অ্যাডমিনই রোল বদলাতে পারেন।",
    roleAdmin: "অ্যাডমিন", roleSupport: "সাপোর্ট", roleUser: "ইউজার",
    daysLeft: "দিন বাকি",
    support2d: "সাপোর্ট ২ দিন", support3d: "সাপোর্ট ৩ দিন",
    support7d: "সাপোর্ট ৭ দিন", support15d: "সাপোর্ট ১৫ দিন",
    makeAdmin: "অ্যাডমিন করুন", roleChange: "পরিবর্তন করুন",
    joinedLabel: "যোগদান", entriesLabel: "এন্ট্রি",
    lastActiveLabel: "সর্বশেষ সক্রিয়",
    noUsersFound: "কোনো ব্যবহারকারী পাওয়া যায়নি।",
    adminLoadErr: "অ্যাডমিন তথ্য লোড করা যায়নি — আবার চেষ্টা করুন।",
    adminOfflineNote: "অফলাইনে আছো — শেষবারের সংরক্ষিত তথ্য দেখানো হচ্ছে।",
    adminMutationsOffline: "অফলাইনে বন্ধ আছে — ইন্টারনেট ফিরলে করা যাবে।",
    roleChanged: "রোল পরিবর্তন করা হয়েছে।",
    settingsSaved: "সেটিংস সংরক্ষণ করা হয়েছে।",
    selfRowNote: "নিজের রোল বদলানো যায় না।",
    mainAdminNote: "মূল অ্যাডমিনের রোল বদলানো যায় না।",
    neverActive: "এখনো সক্রিয় হননি",
  },
  en: {
    appTitle: "Hisab Nikash", appSubtitle: "Smart daily income-expense tracker",
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
    installHint: "From the browser menu choose “Add to Home screen” — it will open like an app. You can view and write accounts even without internet.",
    pendingTag: "⏳ pending",
    offlineBanner: "📶 You're offline",
    offlineBannerPending: "📶 You're offline",
    onlineSyncPending: "🌐 Back online — sending {n} entries…",
    aiNeedsInternet: "AI needs internet to understand — write it in the form yourself and save.",
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
    notifyEnable: "Turn on reminders", notifyDisable: "Turn off reminders",
    notifyOn: "✅ Reminders are on",
    notifyOff: "Reminders are off.",
    notifyNeedPermission: "Reminders need notification permission — press Allow in the browser prompt.",
    notifyDenied: "Notification permission is blocked — allow it in the browser's site settings to turn reminders on.",
    notifyDeniedNative: "Notification permission is off — turn it on in your phone's Settings → Apps → Hisab Nikash → Notifications and reminders will come.",
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
    authGoogleNative: "Sign in with Google",
    logout: "Log out", loggedInAs: "Logged in:",
    adminBtnLabel: "Admin", adminTitle: "🛡️ Admin Dashboard",
    adminBack: "Back", adminStatsTitle: "Statistics",
    statTotalUsers: "Total users", statNewUsers: "New (7 days)",
    statTotalEntries: "Total entries", statEntriesToday: "Today's entries",
    statActiveUsers: "Active (7 days)",
    maintTitle: "Maintenance mode",
    maintToggle: "Turn on maintenance mode",
    maintMsgPh: "Maintenance message (optional)",
    maintSave: "Save",
    maintOnlyAdmin: "Only the main admin can change maintenance.",
    maintBanner: "⚠️ Maintenance mode is on — normal users cannot use the app right now.",
    maintScreenTitle: "Under maintenance",
    tryLater: "Please try again later.",
    adminUsersTitle: "Users",
    adminSearchPh: "Search by name or email…",
    roleOnlyAdmin: "Only the main admin can change roles.",
    roleAdmin: "Admin", roleSupport: "Support", roleUser: "User",
    daysLeft: "days left",
    support2d: "Support 2 days", support3d: "Support 3 days",
    support7d: "Support 7 days", support15d: "Support 15 days",
    makeAdmin: "Make admin", roleChange: "Change",
    joinedLabel: "Joined", entriesLabel: "Entries",
    lastActiveLabel: "Last active",
    noUsersFound: "No users found.",
    adminLoadErr: "Could not load admin data — please try again.",
    adminOfflineNote: "You're offline — showing the last saved data.",
    adminMutationsOffline: "Off while offline — you can do this when the internet returns.",
    roleChanged: "Role changed.",
    settingsSaved: "Settings saved.",
    selfRowNote: "You cannot change your own role.",
    mainAdminNote: "The main admin's role cannot be changed.",
    neverActive: "Not active yet",
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
  const res = await fetch(apiBase() + path, Object.assign({}, opts, { headers }));
  if (res.status === 401) logout();
  return res;
}
function showAuth() {
  $("authScreen").classList.remove("hidden");
  $("appMain").classList.add("hidden");
  $("adminScreen").classList.add("hidden");
  $("maintenanceScreen").classList.add("hidden");
  $("logoutBtn").classList.add("hidden");
  $("adminBtn").classList.add("hidden");
  $("loggedInLine").classList.add("hidden");
}
function showApp() {
  $("authScreen").classList.add("hidden");
  $("adminScreen").classList.add("hidden");
  $("maintenanceScreen").classList.add("hidden");
  $("appMain").classList.remove("hidden");
  $("logoutBtn").classList.remove("hidden");
  $("loggedInLine").classList.remove("hidden");
  $("loggedInUser").textContent = currentUser ? currentUser.username : "";
  updateAdminUI();
}

/* ---------------- admin dashboard + maintenance mode (v10) ------------
   One permanent admin (Maisha) monitors the whole site; she can also
   grant time-limited "support" roles (2/3/7/15 days) and turn
   maintenance mode on/off from the dashboard. Support staff can view
   the dashboard but cannot change roles or settings. The same web code
   runs in the PWA and in the Capacitor APK, so both get it identically. */
let siteCfg = null;
async function fetchSiteConfig() {
  try {
    const res = await fetch(apiBase() + "/api/config");
    if (res.ok) {
      siteCfg = await res.json();
      try { localStorage.setItem("hn-site-cfg", JSON.stringify(siteCfg)); } catch (e2) { /* ignore */ }
      return siteCfg;
    }
  } catch (e) { /* offline — fall through to the cached config */ }
  // Offline (or a failed fetch): use the last saved public config, so a
  // cached maintenance state still applies; otherwise maintenance-off.
  try {
    const raw = localStorage.getItem("hn-site-cfg");
    if (raw) siteCfg = JSON.parse(raw);
  } catch (e2) { /* ignore */ }
  return siteCfg || {};
}
/* The signed-in user's role, cached when the server last returned it, so
   staff can still open the admin screen offline. Only ever reuses the
   role the SERVER returned for this login — never grants staff by itself.
   A cached time-limited support role is only reused while still valid. */
function cacheCurrentUser() {
  try {
    if (currentUser) localStorage.setItem("hn-user", JSON.stringify(currentUser));
  } catch (e) { /* ignore */ }
}
function loadCachedUser() {
  try {
    const raw = localStorage.getItem("hn-user");
    if (!raw) return null;
    const u = JSON.parse(raw);
    if (!u || typeof u !== "object" || !u.username) return null;
    if (u.role === "support" && u.support_until && new Date(u.support_until) < Date.now()) {
      u.role = "user";
    }
    return u;
  } catch (e) { return null; }
}
function isStaffUser() {
  const r = currentUser && currentUser.role;
  return r === "admin" || r === "support";
}
function isAdminUser() {
  return !!(currentUser && currentUser.role === "admin");
}
function roleBadgeText(u) {
  if (!u) return "";
  if (u.role === "admin") return t("roleAdmin");
  if (u.role === "support") {
    if (u.support_until) {
      const days = Math.max(0, Math.ceil((new Date(u.support_until) - Date.now()) / 86400000));
      return t("roleSupport") + " (" + fmtNum(days) + " " + t("daysLeft") + ")";
    }
    return t("roleSupport");
  }
  return "";
}
function updateAdminUI() {
  const btn = $("adminBtn");
  if (btn) btn.classList.toggle("hidden", !isStaffUser());
  const badge = $("roleBadge");
  if (badge) {
    const txt = roleBadgeText(currentUser);
    badge.textContent = txt ? "• " + txt : "";
    badge.classList.toggle("hidden", !txt);
  }
  updateMaintBanner();
}
function updateMaintBanner() {
  const b = $("maintBanner");
  if (!b) return;
  const on = !!(siteCfg && siteCfg.maintenance_mode) && isStaffUser();
  b.classList.toggle("hidden", !on);
  if (on) $("maintBannerMsg").textContent = siteCfg.maintenance_message || "";
}
function showMaintenanceScreen(msg) {
  $("authScreen").classList.add("hidden");
  $("appMain").classList.add("hidden");
  $("adminScreen").classList.add("hidden");
  $("logoutBtn").classList.add("hidden");
  $("adminBtn").classList.add("hidden");
  $("loggedInLine").classList.add("hidden");
  $("maintScreenMsg").textContent = msg || "";
  $("maintenanceScreen").classList.remove("hidden");
}
function afterLogin(data) {
  // Success path for Google sign-in.
  currentUser = data.user;
  cacheCurrentUser();
  try {
    localStorage.setItem("hn-token", data.token);
    localStorage.setItem("hn-username", data.user.username);
  } catch (e2) { /* ignore */ }
  // Maintenance mode: staff go straight in, everyone else sees the
  // maintenance screen even though they just signed in (the login
  // endpoint itself is not blocked, but the app is).
  if (siteCfg && siteCfg.maintenance_mode && !isStaffUser()) {
    showMaintenanceScreen(siteCfg.maintenance_message || "");
    return;
  }
  showApp();
  postTokenToSW();
  resetForm();
  loadAll().then(() => flushPendingQueue());
  updateNotifyUI();
  checkReminders();
  syncPushSubscription();
  autoPromptReminders();
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
async function postGoogleIdToken(idToken) {
  // Shared by the browser (GIS) and the Capacitor APK (native sign-in):
  // the server verifies the Google ID token and returns our own JWT.
  const err = $("authError");
  err.classList.add("hidden");
  let res;
  try {
    res = await fetch(apiBase() + "/api/auth/google", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_token: idToken }),
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
async function onGoogleCredential(resp) {
  await postGoogleIdToken(resp.credential);
}

/* ---------------- Native Google sign-in (Capacitor APK only) -----------
   The APK loads this same page in its own WebView, where Google Identity
   Services is blocked (disallowed_useragent). So inside the APK we call
   the native @codetrix-studio/capacitor-google-auth plugin through the
   Capacitor bridge (window.Capacitor.registerPlugin — the native side
   injects the plugin headers, so no plugin JS needs importing here) and
   send its ID token to the same /api/auth/google endpoint. In a normal
   browser none of this runs — the GIS button above is used instead. */
function isCapacitor() {
  try {
    return !!(window.Capacitor && window.Capacitor.getPlatform &&
      window.Capacitor.getPlatform() !== "web");
  } catch (e) { return false; }
}
/* The Capacitor APK (v1.2+) bundles this same page locally, so its origin
   is https://localhost and API calls must go to the live server by
   absolute URL. In a browser the page is served by the server itself, so
   relative paths stay as they are. Computed lazily (at call time) because
   the Capacitor bridge may only appear after this script first runs. */
const LIVE_API = "https://hishab-nikash-production.up.railway.app";
function apiBase() {
  try { return isCapacitor() ? LIVE_API : ""; } catch (e) { return ""; }
}
/* Diagnostic readout (v9.3): the native plugin never appears on Maisha's
   phone even though the bridge is there, in both the remote-page build
   (v1.1.1) and the local-bundle build (v1.2.0). Collect what the page
   actually sees so a screenshot of the login screen shows the cause. */
const hnDiag = {};
function collectDiag(stage) {
  try {
    const C = window.Capacitor || null;
    hnDiag.stage = stage;
    hnDiag.hasCapacitor = !!C;
    hnDiag.platform = C && C.getPlatform ? String(C.getPlatform()) : "n/a";
    hnDiag.hasIsPluginAvailable = C ? typeof C.isPluginAvailable : "n/a";
    try {
      hnDiag.isPluginAvailable = C && C.isPluginAvailable
        ? String(C.isPluginAvailable("GoogleAuth")) : "n/a";
    } catch (e) { hnDiag.isPluginAvailable = "error: " + (e && e.message ? e.message : e); }
    try {
      hnDiag.pluginHeaders = C && C.PluginHeaders
        ? C.PluginHeaders.map((h) => h.name).join(",") : "missing";
    } catch (e) { hnDiag.pluginHeaders = "error"; }
    try {
      hnDiag.pluginsKeys = C && C.Plugins ? Object.keys(C.Plugins).join(",") : "missing";
    } catch (e) { hnDiag.pluginsKeys = "error"; }
    hnDiag.directRegister = hnDiag.directRegister || "not-tried";
    hnDiag.signInError = hnDiag.signInError || "";
  } catch (e) { /* never break login for diagnostics */ }
  renderDiag();
}
function renderDiag() {
  try {
    const box = $("diagBox");
    if (!box) return;
    if (!isCapacitor()) { box.classList.add("hidden"); return; }
    const lines = Object.keys(hnDiag).map((k) => k + ": " + hnDiag[k]);
    box.textContent = "পরীক্ষার তথ্য (স্ক্রিনশট দিও):\n" + lines.join("\n");
    box.classList.remove("hidden");
  } catch (e) { /* ignore */ }
}
function nativeGooglePlugin() {
  // DO NOT call window.Capacitor.registerPlugin: it does not exist in
  // the runtime the APK injects (native-bridge.js) — it only exists in
  // the full @capacitor/core npm bundle. The injected runtime already
  // exposes the plugin stub at window.Capacitor.Plugins.GoogleAuth
  // (signIn / signOut / refresh / initialize), whose methods call the
  // native plugin through nativePromise. Calling registerPlugin threw
  // "not a function" on every attempt in v9–v9.4 — that was the whole bug.
  try {
    if (!isCapacitor()) { hnDiag.lastFail = "no-capacitor"; return null; }
    const C = window.Capacitor;
    if (C.isPluginAvailable && !C.isPluginAvailable("GoogleAuth")) {
      hnDiag.lastFail = "not-available";
      return null;
    }
    const GA = C.Plugins && C.Plugins.GoogleAuth;
    if (!GA) { hnDiag.lastFail = "no-plugins-stub"; return null; }
    hnDiag.lastFail = "ok";
    return GA;
  } catch (e) {
    hnDiag.lastFail = "threw: " + (e && e.message ? e.message : e);
    return null;
  }
}
async function onNativeGoogleSignIn() {
  const err = $("authError");
  err.classList.add("hidden");
  const GA = nativeGooglePlugin();
  if (!GA) {
    err.textContent = t("authGoogleErr");
    err.classList.remove("hidden");
    return;
  }
  let user;
  try {
    user = await GA.signIn();
  } catch (e) {
    const msg = (e && e.message) ? e.message : String(e);
    hnDiag.signInError = msg;
    renderDiag();
    err.textContent = "Google লগইন হয়নি: " + msg;
    err.classList.remove("hidden");
    return;
  }
  const idToken = (user && user.authentication && user.authentication.idToken) ||
    (user && user.idToken);
  if (!idToken) {
    err.textContent = t("authGoogleErr");
    err.classList.remove("hidden");
    return;
  }
  await postGoogleIdToken(idToken);
}
async function initNativeGoogle(cfg) {
  // Show the native button instead of the GIS button. Returns true when
  // the native path is in use; false means "fall through to GIS".
  hnDiag.attempts = (hnDiag.attempts || 0) + 1;
  collectDiag("init");
  const GA = nativeGooglePlugin();
  if (!GA) return false;
  try {
    // Native initialize is a no-op that resolves; the real config
    // (clientId/scopes) lives in the APK's capacitor.config.ts.
    if (GA.initialize) await GA.initialize({
      clientId: cfg.google_client_id, scopes: ["profile", "email"],
    });
  } catch (e) { /* continue — sign-in still works without it */ }
  $("nativeGoogleBox").classList.remove("hidden");
  $("nativeGoogleBtn").onclick = onNativeGoogleSignIn;
  return true;
}
async function initGoogle() {
  let cfg = {};
  try {
    const res = await fetch(apiBase() + "/api/config");
    if (res.ok) { cfg = await res.json(); siteCfg = cfg; }
  } catch (e) { /* offline — Google stays hidden */ }
  // Maintenance screen already showing (decided by initAuth, which runs
  // first) → do not touch the login screen at all.
  if (!$("maintenanceScreen").classList.contains("hidden")) return;
  // Maintenance mode and not staff → maintenance screen, not login.
  if (cfg.maintenance_mode && !isStaffUser()) {
    showMaintenanceScreen(cfg.maintenance_message || "");
    return;
  }
  if (!cfg.google_enabled || !cfg.google_client_id) {
    $("googleNote").classList.remove("hidden");
    return;
  }
  // Native sign-in is APK-only. In a browser/PWA go straight to GIS:
  // v9.4's retry loop ran the native attempts (which always fail in a
  // browser) 30 times with 1s waits, so the PWA's Google button took
  // ~30 seconds to appear — it looked removed. The APK path below is
  // unchanged: keep retrying there, since the plugin can appear late.
  if (isCapacitor()) {
    // Inside the Capacitor APK, use native Google sign-in (GIS is blocked
    // in a WebView). The Capacitor bridge injects window.Capacitor as the
    // page loads, which can race with this script — v1.2.1's diagnostic
    // showed the plugin IS available in the end (isPluginAvailable: true,
    // GoogleAuth in PluginHeaders) even though the first attempts failed,
    // so keep retrying in the background instead of giving up after 4s:
    // if the plugin appears later, swap the note for the button.
    const tryNative = async () => {
      if (await initNativeGoogle(cfg)) {
        $("googleNote").classList.add("hidden");
        return true;
      }
      return false;
    };
    if (await tryNative()) return;
    for (let i = 0; i < 29; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      if (await tryNative()) return;
    }
    // The bridge is there but the native plugin never appeared: GIS
    // cannot work inside the app's WebView (it would open a blank
    // Google page in Chrome), so do not show it — say so instead.
    // Keep trying in the background: if the plugin shows up late,
    // the button replaces this note.
    collectDiag("failed");
    const note = $("googleNote");
    note.textContent = "অ্যাপের ভেতরে Google লগইন চালু হচ্ছে না — অ্যাপটি বন্ধ করে আবার খুলে দেখুন।";
    note.classList.remove("hidden");
    const bg = setInterval(async () => {
      if (await tryNative()) clearInterval(bg);
    }, 2000);
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
  // Best effort: also sign out of native Google inside the APK, so the
  // next sign-in shows the account chooser again. Never block logout.
  try {
    const GA = nativeGooglePlugin();
    if (GA && GA.signOut) GA.signOut().catch(() => {});
  } catch (e) { /* ignore */ }
  try {
    localStorage.removeItem("hn-token");
    localStorage.removeItem("hn-username");
    localStorage.removeItem("hn-user");
  } catch (e) { /* ignore */ }
  entriesCache = [];
  summaryCache = null;
  reminderStatusCache = null;
  reminderHistoryCache = [];
  $("adminScreen").classList.add("hidden");
  $("maintBanner").classList.add("hidden");
  renderAll();
  postTokenToSW();
  // Logged out during maintenance → the visitor sees the maintenance
  // screen, not the login screen.
  if (siteCfg && siteCfg.maintenance_mode) {
    showMaintenanceScreen(siteCfg.maintenance_message || "");
    return;
  }
  showAuth();
}
async function initAuth() {
  // Public config first: it tells us whether the site is in
  // maintenance mode (and its message) before we decide which screen
  // to show. During maintenance, non-staff get 503 from /api/auth/me.
  const cfg = await fetchSiteConfig();
  const token = getToken();
  if (!token) {
    if (cfg.maintenance_mode) {
      showMaintenanceScreen(cfg.maintenance_message || "");
      return;
    }
    showAuth(); updateNotifyUI(); return;
  }
  try {
    const res = await apiFetch("/api/auth/me");
    if (res.status === 503 || !res.ok) {
      // 503 = maintenance mode for non-staff; any other failure while
      // maintenance is on also means "visitor", not "log in".
      if (cfg.maintenance_mode) {
        showMaintenanceScreen(cfg.maintenance_message || "");
        return;
      }
      showAuth(); return;
    }
    const data = await res.json();
    currentUser = data.user;
    cacheCurrentUser();
    showApp();
    postTokenToSW();
    loadAll().then(() => flushPendingQueue());
    updateNotifyUI();
    checkReminders();
    syncPushSubscription();
    autoPromptReminders();
  } catch (e) {
    // Network throw with a saved token = offline, not logged out (v10.3):
    // open the app with cached data and the offline queue. A 401 is a
    // response, not a throw — apiFetch already logged out and cleared the
    // token by then, so getToken() is null and we show the login screen.
    if (getToken()) {
      // Offline: reuse the role the server last returned for this login,
      // so a staff user still sees the 🛡️ button and can open admin.
      try { currentUser = loadCachedUser() || { username: localStorage.getItem("hn-username") || "", role: "user" }; } catch (e2) { currentUser = { username: "", role: "user" }; }
      showApp();
      postTokenToSW();
      loadAll().then(() => flushPendingQueue());
      updateNotifyUI();
      checkReminders();
      updateOfflineBanner();
      if (isCapacitor()) autoPromptReminders();
    } else {
      showAuth();
    }
  }
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

/* ---------------- admin dashboard (v10) ---------------- */
let adminUsersCache = [];
let adminSettingsCache = null;
function setAdminStatus(msg, isErr) {
  const el = $("adminStatus");
  el.textContent = msg || "";
  el.classList.toggle("hidden", !msg);
  el.className = "text-sm mt-2 break-words " + (isErr ? "text-red-600" : "text-emerald-700");
}
async function openAdmin() {
  if (!isStaffUser()) return;
  $("appMain").classList.add("hidden");
  $("authScreen").classList.add("hidden");
  $("maintenanceScreen").classList.add("hidden");
  $("adminScreen").classList.remove("hidden");
  window.scrollTo(0, 0);
  await loadAdminDashboard();
}
function closeAdmin() {
  $("adminScreen").classList.add("hidden");
  showApp();
}
async function loadAdminDashboard() {
  setAdminStatus("", false);
  const offNote = $("adminOfflineNote");
  if (offNote) offNote.classList.add("hidden");
  try {
    const [sRes, setRes, uRes] = await Promise.all([
      apiFetch("/api/admin/stats"),
      apiFetch("/api/admin/settings"),
      apiFetch("/api/admin/users"),
    ]);
    if (!sRes.ok || !setRes.ok || !uRes.ok) throw new Error("load failed");
    const stats = await sRes.json();
    const settings = await setRes.json();
    renderAdminStats(stats);
    adminSettingsCache = settings;
    renderAdminSettings(settings);
    adminUsersCache = await uRes.json();
    renderAdminUsers();
    // Cache for offline viewing (stats + settings + users).
    try {
      localStorage.setItem("hn-cache-admin-stats", JSON.stringify(stats));
      localStorage.setItem("hn-cache-admin-settings", JSON.stringify(settings));
      localStorage.setItem("hn-cache-admin-users", JSON.stringify(adminUsersCache));
    } catch (e2) { /* ignore */ }
  } catch (e) {
    // Offline: render the last saved admin data, if any.
    try {
      const cs = localStorage.getItem("hn-cache-admin-stats");
      const cm = localStorage.getItem("hn-cache-admin-settings");
      const cu = localStorage.getItem("hn-cache-admin-users");
      if (cs && cm && cu) {
        renderAdminStats(JSON.parse(cs));
        adminSettingsCache = JSON.parse(cm);
        renderAdminSettings(adminSettingsCache);
        adminUsersCache = JSON.parse(cu);
        renderAdminUsers();
        setAdminStatus(t("adminOfflineNote"), false);
        if (offNote) offNote.classList.remove("hidden");
        return;
      }
    } catch (e2) { /* ignore */ }
    setAdminStatus(t("adminLoadErr"), true);
  }
}
function renderAdminStats(s) {
  const items = [
    [t("statTotalUsers"), s.total_users],
    [t("statNewUsers"), s.new_users_7d],
    [t("statTotalEntries"), s.total_entries],
    [t("statEntriesToday"), s.entries_today],
    [t("statActiveUsers"), s.active_users_7d],
  ];
  $("adminStats").innerHTML = items.map(([label, val]) =>
    `<div class="bg-gray-50 rounded-lg p-3 text-center min-w-0"><div class="text-[11px] sm:text-xs text-gray-500 truncate">${escapeHtml(label)}</div><div class="font-bold text-lg sm:text-xl break-words">${fmtNum(val)}</div></div>`).join("");
}
function renderAdminSettings(s) {
  const isAdmin = isAdminUser();
  const offline = !navigator.onLine;
  $("maintToggle").checked = !!s.maintenance_mode;
  $("maintMsg").value = s.maintenance_message || "";
  // Admin mutations never run offline — the controls are disabled and a
  // note says so. (Support users already cannot change these.)
  $("maintToggle").disabled = !isAdmin || offline;
  $("maintMsg").disabled = !isAdmin || offline;
  $("maintSaveBtn").disabled = !isAdmin || offline;
  if (offline) {
    $("maintNote").textContent = t("adminMutationsOffline");
    $("maintNote").classList.remove("hidden");
    $("adminRoleNote").textContent = t("adminMutationsOffline");
    $("adminRoleNote").classList.remove("hidden");
  } else {
    $("maintNote").textContent = t("maintOnlyAdmin");
    $("maintNote").classList.toggle("hidden", isAdmin);
    $("adminRoleNote").textContent = t("roleOnlyAdmin");
    $("adminRoleNote").classList.toggle("hidden", isAdmin);
  }
}
async function saveAdminSettings() {
  if (!isAdminUser() || !navigator.onLine) return;
  try {
    const res = await apiFetch("/api/admin/settings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        maintenance_mode: $("maintToggle").checked,
        maintenance_message: $("maintMsg").value,
      }),
    });
    if (!res.ok) throw new Error("save failed");
    const s = await res.json();
    siteCfg = Object.assign({}, siteCfg, {
      maintenance_mode: s.maintenance_mode,
      maintenance_message: s.maintenance_message,
    });
    renderAdminSettings(s);
    setAdminStatus(t("settingsSaved"), false);
  } catch (e) {
    setAdminStatus(t("adminLoadErr"), true);
  }
}
function adminRoleBadge(u) {
  if (u.role === "admin") return `<span class="text-xs font-bold bg-emerald-100 text-emerald-800 rounded-full px-2 py-0.5 shrink-0">${escapeHtml(t("roleAdmin"))}</span>`;
  if (u.role === "support") {
    let extra = "";
    if (u.support_until) {
      const days = Math.max(0, Math.ceil((new Date(u.support_until) - Date.now()) / 86400000));
      extra = " (" + fmtNum(days) + " " + escapeHtml(t("daysLeft")) + ")";
    }
    return `<span class="text-xs font-bold bg-amber-100 text-amber-800 rounded-full px-2 py-0.5 shrink-0">${escapeHtml(t("roleSupport"))}${extra}</span>`;
  }
  return `<span class="text-xs font-bold bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 shrink-0">${escapeHtml(t("roleUser"))}</span>`;
}
function renderAdminUsers() {
  const q = ($("adminUserSearch").value || "").toLowerCase();
  const rows = adminUsersCache.filter((u) =>
    !q || (u.username || "").toLowerCase().includes(q) ||
    (u.email || "").toLowerCase().includes(q));
  $("adminNoUsers").classList.toggle("hidden", rows.length > 0);
  const canChange = isAdminUser();
  const offline = !navigator.onLine;
  $("adminUserList").innerHTML = rows.map((u) => {
    const self = !!(currentUser && u.id === currentUser.id);
    const disabled = offline || !canChange || self || u.is_main_admin;
    const why = !canChange ? t("roleOnlyAdmin")
      : self ? t("selfRowNote")
      : u.is_main_admin ? t("mainAdminNote") : "";
    const joined = u.created_at ? fmtDate(u.created_at.slice(0, 10)) : "—";
    const lastActive = u.last_entry_at ? fmtDate(u.last_entry_at)
      : (u.last_login_at ? fmtDate(u.last_login_at.slice(0, 10)) : t("neverActive"));
    let cur = u.role;
    if (u.role === "support" && u.support_until) {
      const days = Math.max(1, Math.round((new Date(u.support_until) - Date.now()) / 86400000));
      const near = [2, 3, 7, 15].reduce((a, b) =>
        Math.abs(b - days) < Math.abs(a - days) ? b : a);
      cur = "support:" + near;
    }
    const opts = [
      ["user", t("roleUser")],
      ["support:2", t("support2d")], ["support:3", t("support3d")],
      ["support:7", t("support7d")], ["support:15", t("support15d")],
      ["admin", t("makeAdmin")],
    ];
    const sel = `<select data-role-sel="${u.id}" ${disabled ? "disabled" : ""} class="border rounded-lg px-2 py-2 text-sm bg-white min-w-0 flex-1">` +
      opts.map(([v, label]) => `<option value="${v}" ${v === cur ? "selected" : ""}>${escapeHtml(label)}</option>`).join("") + `</select>`;
    const btn = `<button type="button" data-role-apply="${u.id}" ${disabled ? "disabled" : ""} class="btn-primary rounded-lg px-3 py-2 text-sm font-bold shrink-0 disabled:opacity-50">${escapeHtml(t("roleChange"))}</button>`;
    return `<div class="border rounded-lg p-3 space-y-2">
      <div class="flex items-start justify-between gap-2 min-w-0">
        <div class="min-w-0">
          <div class="font-bold break-words">${escapeHtml(u.username)}</div>
          <div class="text-xs text-gray-500 break-words">${escapeHtml(u.email || "")}</div>
        </div>
        ${adminRoleBadge(u)}
      </div>
      <div class="text-xs text-gray-500 break-words">${escapeHtml(t("joinedLabel"))}: ${joined} • ${escapeHtml(t("entriesLabel"))}: ${fmtNum(u.entries_count)} • ${escapeHtml(t("lastActiveLabel"))}: ${escapeHtml(lastActive)}</div>
      <div class="flex gap-2">${sel}${btn}</div>
      ${why ? `<p class="text-xs text-amber-700">${escapeHtml(why)}</p>` : ""}
    </div>`;
  }).join("");
}
async function applyRoleChange(userId, btn) {
  if (!navigator.onLine) return; // role changes never run offline
  const sel = document.querySelector(`[data-role-sel="${userId}"]`);
  const val = sel ? sel.value : "user";
  let role = val, days = null;
  if (val.startsWith("support:")) { role = "support"; days = Number(val.split(":")[1]); }
  btn.disabled = true;
  try {
    const res = await apiFetch(`/api/admin/users/${userId}/role`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(days ? { role, days } : { role }),
    });
    if (!res.ok) throw new Error("role change failed");
    const updated = await res.json();
    adminUsersCache = adminUsersCache.map((u) => u.id === userId ? updated : u);
    renderAdminUsers();
    setAdminStatus(t("roleChanged"), false);
  } catch (e) {
    setAdminStatus(t("adminLoadErr"), true);
    btn.disabled = false;
  }
}

/* ---------------- language ---------------- */
function applyLang() {
  document.documentElement.lang = lang === "bn" ? "bn" : "en";
  document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll("[data-i18n-ph]").forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
  $("langToggle").textContent = lang === "bn" ? "EN" : "বাং";
  // Icon-only AI buttons: keep their accessible labels in sync with language.
  $("aiParseBtn").setAttribute("aria-label", t("parseBtnLabel"));
  $("aiParseBtn").setAttribute("title", t("parseBtnLabel"));
  $("micBtn").setAttribute("aria-label", t("micLabel"));
  $("micBtn").setAttribute("title", t("micLabel"));
  $("adminBtn").setAttribute("aria-label", t("adminBtnLabel"));
  $("adminBtn").setAttribute("title", t("adminBtnLabel"));
  applyTheme();
  localStorage.setItem("hn-lang", lang);
  fillCategoryOptions();
  renderAll();
  updateAdminUI();
  updateOfflineBanner();
  if (!$("adminScreen").classList.contains("hidden")) {
    if (adminSettingsCache) renderAdminSettings(adminSettingsCache);
    renderAdminUsers();
  }
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
  if (id && isTmpId(id)) {
    // A not-yet-synced entry: never PUT a tmp id to the server — merge
    // into its queued create instead, then try to flush (v10.3).
    saveEntryOffline(id, payload);
    return;
  }
  let res = null;
  try {
    res = await apiFetch(id ? `/api/entries/${id}` : "/api/entries", {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    // Network throw = offline → queue it instead of alerting (v10.3).
    saveEntryOffline(id, payload);
    return;
  }
  if (res.status === 401) return; // apiFetch already showed the login screen
  if (!res.ok) {
    if (!navigator.onLine) { saveEntryOffline(id, payload); return; }
    alert(await res.text()); return;
  }
  resetForm();
  loadAll();
  checkReminders();
  flushPendingQueue();
  // APK: today's accounts are now written — cancel today's local reminder.
  if (payload.date === localTodayStr()) cancelLocalReminder();
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
  const entry = pendingDeleteEntry;
  closeDeleteModal();
  if (isTmpId(id)) { deleteEntryOffline(id, entry); return; }
  try {
    const res = await apiFetch(`/api/entries/${id}`, { method: "DELETE" });
    if (res.status === 401) return;
    if (!res.ok && !navigator.onLine) { deleteEntryOffline(id, entry); return; }
  } catch (err) {
    // Network throw = offline → queue the delete (v10.3).
    deleteEntryOffline(id, entry);
    return;
  }
  loadAll();
  flushPendingQueue();
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
  if (!navigator.onLine) {
    // AI parsing needs the server — say so inline, keep the manual
    // form working offline (v10.3).
    const box = $("aiResult");
    box.classList.remove("hidden");
    box.textContent = t("aiNeedsInternet");
    return;
  }
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
          <div class="font-medium break-words">${CAT_NAME[lang][e.category] || e.category}${e._pending ? ` <span class="inline-block align-middle text-[11px] font-semibold bg-amber-100 text-amber-800 rounded px-1.5 py-0.5 whitespace-nowrap">${t("pendingTag")}</span>` : ""}${e.note ? ` — <span class="text-gray-500 font-normal">${escapeHtml(e.note)}</span>` : ""}</div>
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
  try {
    const [eRes, sRes] = await Promise.all([
      apiFetch(`/api/entries?month=${curMonth}`),
      apiFetch(`/api/summary?month=${curMonth}&lang=${lang}`),
    ]);
    entriesCache = eRes.ok ? await eRes.json() : [];
    summaryCache = sRes.ok ? await sRes.json() : null;
    if (eRes.ok && sRes.ok) {
      // Online and fresh: server is the source of truth. Layer this
      // month's not-yet-synced ops back on top (v10.3), then cache.
      mergePendingIntoCache();
      saveMonthCache(curMonth, entriesCache, summaryCache);
    }
  } catch (e) {
    // Network throw (offline): fall back to the last-loaded month data.
    // A 401 is a *response*, not a throw, so this never masks a logout.
    const cached = loadMonthCache(curMonth);
    if (cached) {
      entriesCache = cached.entries || [];
      summaryCache = cached.summary || null;
    } else {
      entriesCache = [];
      summaryCache = null;
    }
    // Pending ops for this month still apply on top of the cached data.
    mergePendingIntoCache();
  }
  // Remember the newest entry date on this device so the missed-days
  // card can work fully offline (status API refines it when online).
  if (entriesCache.length) {
    const maxDate = entriesCache.reduce((m, e) => (e.date > m ? e.date : m), entriesCache[0].date);
    try {
      const stored = localStorage.getItem("hn-last-entry-date");
      if (!stored || maxDate > stored) localStorage.setItem("hn-last-entry-date", maxDate);
    } catch (e) { /* ignore */ }
  }
  scheduleLocalReminder(); // APK: (re)create the daily 09:00 local reminder
  renderAll();
}

/* ---------------- offline-first (v10.3) ------------
   Maisha's rule: everything that exists must also work offline, and
   sync when the internet returns. Layers:
   - Last-loaded month data is cached in localStorage, so the app opens
     offline with real data (the server stays the source of truth online).
   - Entry creates/updates/deletes made offline go into a per-device
     queue (hn-pending-queue) and are applied to the list immediately
     (optimistic, marked "pending"), then flushed in order when online.
   - The service worker is untouched: it still caches only the app shell
     and never caches API responses. The queue lives here, in app.js. */
const PENDING_QUEUE_KEY = "hn-pending-queue";
function loadPendingQueue() {
  try {
    const raw = localStorage.getItem(PENDING_QUEUE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (e) { return []; }
}
function savePendingQueue(q) {
  try { localStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify(q)); } catch (e) { /* ignore */ }
}
function isTmpId(id) { return String(id || "").startsWith("tmp-"); }
function makeTmpId() {
  return "tmp-" + Date.now() + "-" + Math.floor(Math.random() * 1e9);
}
function monthCacheKey(kind, month) { return "hn-cache-" + kind + "-" + month; }
function saveMonthCache(month, entries, summary) {
  try {
    localStorage.setItem(monthCacheKey("entries", month), JSON.stringify(entries || []));
    localStorage.setItem(monthCacheKey("summary", month), JSON.stringify(summary || null));
  } catch (e) { /* ignore */ }
}
function loadMonthCache(month) {
  try {
    const eRaw = localStorage.getItem(monthCacheKey("entries", month));
    const sRaw = localStorage.getItem(monthCacheKey("summary", month));
    if (eRaw == null && sRaw == null) return null;
    return {
      entries: eRaw ? JSON.parse(eRaw) : [],
      summary: sRaw ? JSON.parse(sRaw) : null,
    };
  } catch (e) { return null; }
}
function sortEntriesCache() {
  // Server order is date desc, id desc; a just-added offline entry
  // belongs at the top of its day, so tmp entries sort first on ties.
  entriesCache.sort((a, b) => (b.date || "").localeCompare(a.date || "")
    || (isTmpId(a.id) ? -1 : isTmpId(b.id) ? 1 : (b.id - a.id)));
}
function opAffectsMonth(op, month) {
  if (!op) return false;
  if (op.op === "create" || op.op === "update") {
    if (op.payload && op.payload.date && op.payload.date.slice(0, 7) === month) return true;
    if (op.op === "update" && op.prevDate && op.prevDate.slice(0, 7) === month) return true;
    return false;
  }
  if (op.op === "delete") return !!(op.date && op.date.slice(0, 7) === month);
  return false;
}
function pendingAffectsMonth(month) {
  return loadPendingQueue().some((op) => opAffectsMonth(op, month));
}
function pctChangeLocal(n, o) {
  // Same rule as the server's pct_change (backend/app/main.py):
  // old == 0 → null, else round((new - old) / old * 100, 1).
  if (!o) return null;
  return Math.round((n - o) / o * 1000) / 10;
}
function refreshLocalSummary() {
  // Only when pending ops touch this month: recompute the pure sums
  // (income/expense/savings, by_category, comparison, pct changes,
  // overspend) from the local list with the SAME rules as the server
  // (_totals + pct_change + the overspend rule in backend/app/main.py).
  // Advice stays from the cached server summary — it refreshes on sync.
  // With no pending ops, the server summary is used verbatim, so online
  // behaviour is byte-for-byte unchanged.
  if (!pendingAffectsMonth(curMonth)) return;
  const prev = summaryCache || {};
  const prevByCat = prev.prev_by_category || {};
  const income = entriesCache.filter((e) => e.type === "income").reduce((s, e) => s + (+e.amount || 0), 0);
  const expense = entriesCache.filter((e) => e.type === "expense").reduce((s, e) => s + (+e.amount || 0), 0);
  const byCat = {};
  entriesCache.forEach((e) => { byCat[e.category] = (byCat[e.category] || 0) + (+e.amount || 0); });
  const cats = [...new Set([...Object.keys(byCat), ...Object.keys(prevByCat)])];
  const comparison = cats
    .filter((c) => (byCat[c] || 0) !== 0 || (prevByCat[c] || 0) !== 0)
    .map((c) => {
      const cm = byCat[c] || 0, pm = prevByCat[c] || 0;
      return { category: c, this_month: cm, last_month: pm,
               difference: Math.round((cm - pm) * 100) / 100,
               pct_change: pctChangeLocal(cm, pm) };
    });
  const overspend = Object.keys(byCat)
    .filter((c) => (prevByCat[c] || 0) > 0 && (byCat[c] || 0) > (prevByCat[c] || 0) * 1.3)
    .map((c) => ({ category: c,
      pct_increase: Math.round(((byCat[c] - prevByCat[c]) / prevByCat[c]) * 1000) / 10,
      this_month: byCat[c], last_month: prevByCat[c] }));
  const prevIncome = prev.prev_income || 0, prevExpense = prev.prev_expense || 0, prevSavings = prev.prev_savings || 0;
  const savings = income - expense;
  summaryCache = Object.assign({}, prev, {
    month: curMonth, income, expense, savings,
    income_pct_change: pctChangeLocal(income, prevIncome),
    expense_pct_change: pctChangeLocal(expense, prevExpense),
    savings_pct_change: pctChangeLocal(savings, prevSavings),
    by_category: byCat, comparison, overspend,
  });
  if (!Array.isArray(summaryCache.advice)) summaryCache.advice = [];
}
function mergePendingIntoCache() {
  // After a load (online or from cache), re-apply this month's pending
  // ops on top of the base data so queued entries don't vanish from the
  // list while waiting for the flush. The base is rebuilt from the
  // server/cache on every load, so this is idempotent — creates are
  // skipped when their tmp id is already present.
  const queue = loadPendingQueue();
  if (!queue.length) return;
  let changed = false;
  queue.forEach((op) => {
    if (!opAffectsMonth(op, curMonth)) return;
    if (op.op === "create") {
      if (!entriesCache.some((x) => String(x.id) === String(op.tmpId))) {
        entriesCache.push(Object.assign({}, op.payload, { id: op.tmpId, _pending: true }));
        changed = true;
      }
    } else if (op.op === "update") {
      const e = entriesCache.find((x) => String(x.id) === String(op.id));
      if (e) { Object.assign(e, op.payload); e._pending = true; changed = true; }
    } else if (op.op === "delete") {
      const before = entriesCache.length;
      entriesCache = entriesCache.filter((x) => String(x.id) !== String(op.id));
      if (entriesCache.length !== before) changed = true;
    }
  });
  if (changed) { sortEntriesCache(); refreshLocalSummary(); }
}
function rememberNewestEntryDate() {
  if (!entriesCache.length) return;
  const maxDate = entriesCache.reduce((m, e) => (e.date > m ? e.date : m), entriesCache[0].date);
  try {
    const stored = localStorage.getItem("hn-last-entry-date");
    if (!stored || maxDate > stored) localStorage.setItem("hn-last-entry-date", maxDate);
  } catch (e) { /* ignore */ }
}
function saveEntryOffline(id, payload) {
  // Queue the op and apply it to the list immediately — exactly the
  // same visible outcome as the online success path (form reset,
  // re-render, reminder check, today's local reminder cancelled).
  if (!getToken()) return;
  const queue = loadPendingQueue();
  if (id) {
    if (isTmpId(id)) {
      // Never PUT a tmp id to the server — merge into its queued create.
      const op = queue.find((o) => o.op === "create" && o.tmpId === id);
      if (op) op.payload = Object.assign({}, payload);
      const e = entriesCache.find((x) => String(x.id) === String(id));
      if (e) {
        Object.assign(e, payload);
        if (String(e.date || "").slice(0, 7) !== curMonth) {
          entriesCache = entriesCache.filter((x) => String(x.id) !== String(id));
        }
      }
    } else {
      const e = entriesCache.find((x) => String(x.id) === String(id));
      let prevDate = null;
      if (e) {
        prevDate = e.date;
        Object.assign(e, payload);
        e._pending = true;
        if (String(e.date || "").slice(0, 7) !== curMonth) {
          entriesCache = entriesCache.filter((x) => String(x.id) !== String(id));
        }
      }
      const ex = queue.find((o) => o.op === "update" && String(o.id) === String(id));
      if (ex) { ex.payload = Object.assign({}, payload); if (prevDate) ex.prevDate = prevDate; }
      else queue.push({ op: "update", id, payload: Object.assign({}, payload), prevDate });
    }
  } else {
    const tmpId = makeTmpId();
    queue.push({ op: "create", tmpId, payload: Object.assign({}, payload) });
    if (String(payload.date || "").slice(0, 7) === curMonth) {
      entriesCache.push(Object.assign({}, payload, { id: tmpId, _pending: true }));
      sortEntriesCache();
    }
  }
  savePendingQueue(queue);
  refreshLocalSummary();
  saveMonthCache(curMonth, entriesCache, summaryCache);
  rememberNewestEntryDate();
  resetForm();
  renderAll();
  updateOfflineBanner();
  checkReminders();
  flushPendingQueue();
  if (payload.date === localTodayStr()) cancelLocalReminder();
}
function deleteEntryOffline(id, entry) {
  if (!getToken()) return;
  const queue = loadPendingQueue();
  if (isTmpId(id)) {
    // The entry only exists in the queue — drop its queued create
    // (and any update for it) instead of queueing a delete for a
    // server id that does not exist yet.
    for (let i = queue.length - 1; i >= 0; i--) {
      if ((queue[i].op === "create" && queue[i].tmpId === id) || queue[i].id === id) queue.splice(i, 1);
    }
  } else {
    // A delete supersedes any queued update for the same entry.
    for (let i = queue.length - 1; i >= 0; i--) {
      if (queue[i].op === "update" && String(queue[i].id) === String(id)) queue.splice(i, 1);
    }
    queue.push({ op: "delete", id, date: entry ? entry.date : null });
  }
  savePendingQueue(queue);
  entriesCache = entriesCache.filter((x) => String(x.id) !== String(id));
  refreshLocalSummary();
  saveMonthCache(curMonth, entriesCache, summaryCache);
  renderAll();
  updateOfflineBanner();
  checkReminders();
  flushPendingQueue();
}
let flushingQueue = false;
async function flushPendingQueue() {
  // Send queued ops in order when online. Guarded so two flushes never
  // run concurrently. Network failure stops the flush and keeps the rest
  // queued; a 4xx (bad data) drops that op and continues; a 401 stops
  // (apiFetch already logged out). After a full flush, reload from the
  // server so ids and totals are authoritative.
  if (flushingQueue || !getToken() || !navigator.onLine) return;
  const queue = loadPendingQueue();
  if (!queue.length) return;
  flushingQueue = true;
  try {
    while (queue.length) {
      const op = queue[0];
      try {
        if (op.op === "create") {
          const res = await apiFetch("/api/entries", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(op.payload),
          });
          if (res.status === 401) return;
          if (!res.ok) {
            if (res.status >= 400 && res.status < 500) { queue.shift(); savePendingQueue(queue); continue; }
            return; // 5xx — stop, retry later
          }
          const saved = await res.json();
          const e = entriesCache.find((x) => String(x.id) === String(op.tmpId));
          if (e) { e.id = saved.id; delete e._pending; }
          queue.forEach((o) => { if (o.id === op.tmpId) o.id = saved.id; });
          queue.shift();
        } else if (op.op === "update") {
          const res = await apiFetch(`/api/entries/${op.id}`, {
            method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(op.payload),
          });
          if (res.status === 401) return;
          if (!res.ok) {
            if (res.status >= 400 && res.status < 500) { queue.shift(); savePendingQueue(queue); continue; }
            return;
          }
          const e = entriesCache.find((x) => String(x.id) === String(op.id));
          if (e) delete e._pending;
          queue.shift();
        } else if (op.op === "delete") {
          const res = await apiFetch(`/api/entries/${op.id}`, { method: "DELETE" });
          if (res.status === 401) return;
          if (!res.ok) {
            if (res.status >= 400 && res.status < 500) { queue.shift(); savePendingQueue(queue); continue; }
            return;
          }
          queue.shift();
        } else {
          queue.shift(); // unknown op — drop it rather than blocking forever
        }
        savePendingQueue(queue);
        updateOfflineBanner();
      } catch (err) {
        return; // network throw — stop, keep the rest queued
      }
    }
    updateOfflineBanner();
    await loadAll();
  } finally {
    flushingQueue = false;
  }
}
function updateOfflineBanner() {
  const b = $("offlineBanner");
  if (!b) return;
  updateAiSectionOffline(); // runs first: the online early-return below must not skip it
  const n = loadPendingQueue().length;
  if (navigator.onLine && n === 0) { b.classList.add("hidden"); return; }
  b.classList.remove("hidden");
  const txt = $("offlineBannerText");
  if (!navigator.onLine) {
    txt.textContent = n > 0
      ? t("offlineBannerPending").replace("{n}", fmtNum(n))
      : t("offlineBanner");
  } else {
    txt.textContent = t("onlineSyncPending").replace("{n}", fmtNum(n));
  }
}
/* AI quick entry needs the server, so the section is only shown when
   online; offline it is completely hidden (the manual form below is the
   way to write entries then). Re-shown on 'online'. */
function updateAiSectionOffline() {
  const card = $("aiCard");
  if (card) card.classList.toggle("hidden", !navigator.onLine);
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
      await reg.showNotification("হিসাব নিকাশ", {
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

/* ---------------- native notifications: auto-prompt + APK local reminder (v10.2) ------------
   Maisha's rule: when the app opens, the phone itself must ask to allow
   notification reminders; once allowed, reminders stay ON until the app /
   APK is uninstalled. Two surfaces, two mechanisms:
   - PWA (Chrome): Web Push — Notification.requestPermission() + the
     existing push subscription.
   - APK (Capacitor WebView): Web Push can NEVER work here — Android's
     WebView has no PushManager, so no subscription can exist. Instead we
     schedule a native LOCAL notification every day at 09:00 via the
     @capacitor/local-notifications plugin (installed in the APK build;
     absent here → everything below degrades silently).
   NEVER call window.Capacitor.registerPlugin — it does not exist in the
   injected Capacitor 7 runtime (v9.5 root cause). Plugins are reached
   only through window.Capacitor.Plugins.<Name>, guarded for undefined. */
const LOCAL_REMINDER_ID = 1001;
function localNotificationsPlugin() {
  try {
    const C = window.Capacitor;
    if (!C || !C.Plugins) return null;
    return C.Plugins.LocalNotifications || null;
  } catch (e) { return null; }
}
function remindersOn() {
  try { return localStorage.getItem("hn-reminders-on") === "1"; } catch (e) { return false; }
}
function markRemindersAsked() {
  try { localStorage.setItem("hn-reminders-asked", "1"); } catch (e) { /* ignore */ }
}
function localTodayStr() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function hasEntryToday() {
  const today = localTodayStr();
  if (entriesCache.some((e) => e.date === today)) return true;
  try { return localStorage.getItem("hn-last-entry-date") === today; } catch (e) { return false; }
}
async function scheduleLocalReminder() {
  // APK only. Re-runs on every app open with the same fixed id, so
  // re-scheduling replaces the old one and the 09:00 daily reminder
  // survives reboots and stays until uninstall.
  if (!isCapacitor() || !remindersOn()) return;
  const LN = localNotificationsPlugin();
  if (!LN) return;
  try {
    if (hasEntryToday()) {
      // Today's accounts are already written — no notification today.
      await LN.cancel({ notifications: [{ id: LOCAL_REMINDER_ID }] });
      return;
    }
    await LN.schedule({ notifications: [{
      id: LOCAL_REMINDER_ID,
      title: "হিসাব নিকাশ",
      body: I18N.bn.reminderMsg,
      schedule: { on: { hour: 9, minute: 0 }, repeats: true },
    }] });
  } catch (e) { /* plugin not ready — next app open retries */ }
}
async function cancelLocalReminder() {
  if (!isCapacitor()) return;
  const LN = localNotificationsPlugin();
  if (!LN) return;
  try { await LN.cancel({ notifications: [{ id: LOCAL_REMINDER_ID }] }); } catch (e) { /* ignore */ }
}
async function autoPromptReminders() {
  // Ask once per install, the first time a logged-in user opens the app
  // with reminders still off. Shows the phone's own native allow/block
  // dialog — never a custom modal. After a real decision (allow or deny)
  // the "asked" flag is set and this never auto-prompts again; dismissing
  // the dialog without deciding leaves the flag unset so it can ask again.
  if (!currentUser) return;
  try {
    if (localStorage.getItem("hn-reminders-on") === "1") return;
    if (localStorage.getItem("hn-reminders-asked") === "1") return;
  } catch (e) { return; }
  if (isCapacitor()) {
    const LN = localNotificationsPlugin();
    if (!LN) return; // older APK without the plugin — nothing to ask
    try {
      const st = await LN.checkPermissions();
      const disp = st && st.display;
      if (disp === "granted") {
        try { localStorage.setItem("hn-reminders-on", "1"); } catch (e) { /* ignore */ }
        markRemindersAsked();
        scheduleLocalReminder();
        updateNotifyUI();
        return;
      }
      if (disp === "denied") { markRemindersAsked(); return; }
      if (disp !== "prompt") return; // unknown state — retry next open
      const res = await LN.requestPermissions();
      if (res && res.display === "granted") {
        try { localStorage.setItem("hn-reminders-on", "1"); } catch (e) { /* ignore */ }
        markRemindersAsked();
        scheduleLocalReminder();
        updateNotifyUI();
      } else if (res && res.display === "denied") {
        markRemindersAsked();
      }
      // "prompt" again = dismissed without deciding — ask again next open.
    } catch (e) { /* plugin not ready — retry on next open */ }
    return;
  }
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
  if (Notification.permission !== "default") { markRemindersAsked(); return; }
  try {
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      await enableReminders();
      markRemindersAsked();
    } else if (perm === "denied") {
      markRemindersAsked();
    }
  } catch (e) { /* will retry on next open */ }
}

function updateNotifyUI() {
  const enableBtn = $("notifyEnableBtn"), disableBtn = $("notifyDisableBtn");
  const statusEl = $("notifyStatus");
  const supported = ("Notification" in window) && ("serviceWorker" in navigator) && ("PushManager" in window);
  let on = false;
  try { on = localStorage.getItem("hn-reminders-on") === "1"; } catch (e) { /* ignore */ }
  if (isCapacitor()) {
    // APK: Web Push can never work in the WebView (no PushManager) — the
    // reminder is a native local notification instead (v10.2).
    if (!localNotificationsPlugin()) {
      statusEl.textContent = t("notifyUnsupported");
      enableBtn.classList.add("hidden"); disableBtn.classList.add("hidden");
      return;
    }
    if (on) {
      statusEl.textContent = t("notifyOn");
      enableBtn.classList.add("hidden"); disableBtn.classList.remove("hidden");
    } else {
      statusEl.textContent = t("notifyOff");
      enableBtn.classList.remove("hidden"); disableBtn.classList.add("hidden");
    }
    return;
  }
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
  if (isCapacitor()) {
    // APK: ask the native Android permission, then schedule the daily
    // 09:00 local notification (v10.2). No Web Push here — no PushManager.
    const LN = localNotificationsPlugin();
    if (!LN) { statusEl.textContent = t("notifyUnsupported"); return; }
    let res = null;
    try { res = await LN.requestPermissions(); } catch (e) { /* ignore */ }
    if (!res || res.display !== "granted") {
      if (res && res.display === "denied") markRemindersAsked();
      statusEl.textContent = t("notifyDeniedNative");
      $("notifyEnableBtn").classList.remove("hidden");
      $("notifyDisableBtn").classList.add("hidden");
      return;
    }
    try { localStorage.setItem("hn-reminders-on", "1"); } catch (e) { /* ignore */ }
    markRemindersAsked();
    await scheduleLocalReminder();
    updateNotifyUI();
    return;
  }
  if (!("Notification" in window)) { statusEl.textContent = t("notifyUnsupported"); return; }
  let perm = Notification.permission;
  if (perm === "default") perm = await Notification.requestPermission();
  if (perm === "denied") markRemindersAsked();
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
  // APK first: cancel the daily local notification (guarded no-op in the
  // PWA). The "asked" flag is NOT cleared — the user decided; they can
  // re-enable from the card any time.
  await cancelLocalReminder();
  try { localStorage.setItem("hn-reminders-on", "0"); } catch (e) { /* ignore */ }
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
  updateNotifyUI();
}
$("notifyEnableBtn").addEventListener("click", enableReminders);
$("notifyDisableBtn").addEventListener("click", disableReminders);
$("missedGoBtn").addEventListener("click", () => {
  $("entryDate").value = new Date().toISOString().slice(0, 10);
  $("entryForm").scrollIntoView({ behavior: "smooth" });
  $("amount").focus();
});
window.addEventListener("online", () => { updateOfflineBanner(); flushPendingQueue(); checkReminders(); });
window.addEventListener("offline", () => { updateOfflineBanner(); });
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

// Admin dashboard wiring.
$("adminBtn").addEventListener("click", openAdmin);
$("adminBackBtn").addEventListener("click", closeAdmin);
$("maintSaveBtn").addEventListener("click", saveAdminSettings);
$("adminUserSearch").addEventListener("input", renderAdminUsers);
$("adminUserList").addEventListener("click", (ev) => {
  const btn = ev.target.closest("[data-role-apply]");
  if (!btn || btn.disabled) return;
  applyRoleChange(Number(btn.dataset.roleApply), btn);
});

resetForm();
applyLang();
// initAuth first: it decides the maintenance screen and sets
// currentUser, so initGoogle can tell staff from visitors.
initAuth().then(() => initGoogle());
