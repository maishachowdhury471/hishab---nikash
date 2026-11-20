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
  expense: ["bazar", "khabar", "jatayat", "bill", "oshudh", "poshak", "shikkha", "binodon", "onnanno"],
  income: ["beton", "bebsha", "onnanno-ay"],
};
const CAT_NAME = {
  bn: { bazar: "বাজার", khabar: "খাবার", jatayat: "যাতায়াত", bill: "বিল", oshudh: "ওষুধ", poshak: "পোশাক", shikkha: "শিক্ষা", binodon: "বিনোদন", onnanno: "অন্যান্য", beton: "বেতন", bebsha: "ব্যবসা", "onnanno-ay": "অন্যান্য আয়" },
  en: { bazar: "Bazar", khabar: "Food", jatayat: "Transport", bill: "Bills", oshudh: "Medicine", poshak: "Clothing", shikkha: "Education", binodon: "Entertainment", onnanno: "Others", beton: "Salary", bebsha: "Business", "onnanno-ay": "Other income" },
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
  const res = await fetch(id ? `/api/entries/${id}` : "/api/entries", {
    method: id ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) { alert(await res.text()); return; }
  resetForm();
  loadAll();
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
  await fetch(`/api/entries/${id}`, { method: "DELETE" });
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
  const res = await fetch("/api/parse", {
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
    fetch(`/api/entries?month=${curMonth}`),
    fetch(`/api/summary?month=${curMonth}&lang=${lang}`),
  ]);
  entriesCache = eRes.ok ? await eRes.json() : [];
  summaryCache = sRes.ok ? await sRes.json() : null;
  renderAll();
}

// PWA: register service worker.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => { /* offline cache is best-effort */ });
  });
}

resetForm();
applyLang();
loadAll();
