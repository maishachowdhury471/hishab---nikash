/* AI Hisab Nikash service worker — caches the app shell so the UI loads
   offline where possible. Data lives on the server, so saving new entries
   still needs network; cached UI viewing works offline.
   Also handles Web Push reminders ('push'), missed-reminder catch-up when
   connectivity returns ('sync' tag hn-reminder-check) and notification
   clicks (opens the app).

   Honest limit: when Chrome is fully closed / force-stopped AND the phone
   is offline, no notification can fire on time — there are no Notification
   Triggers in stable Chrome. The 'sync' + in-app checks make sure a missed
   reminder still shows as soon as the app opens or the internet returns,
   with its original due time. */
const CACHE = "hisab-nikash-v2";
const SHELL = ["/", "/static/app.js", "/static/icon.svg", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  // Only cache same-origin GETs; API calls always go to the network.
  if (event.request.method !== "GET" || url.pathname.startsWith("/api")) return;
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});

/* ---- Daily reminder notifications ---- */
function bnDateTime(iso) {
  try {
    return new Date(iso).toLocaleString("bn-BD", {
      day: "numeric", month: "long", year: "numeric",
      hour: "numeric", minute: "2-digit",
    });
  } catch (e) { return iso; }
}

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { /* ignore */ }
  const title = data.title || "AI হিসাব নিকাশ — আজকের হিসাব";
  const body = data.body || "আজকের হিসাব কি লিখেছো? এখনই অ্যাপে ঢুকে আজকের খরচ বা আয় লিখে ফেলো।";
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/static/icon-192.png",
      badge: "/static/icon.svg",
      tag: "hn-daily-reminder",
      data: { url: "/", due_at: data.due_at || null },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) { client.navigate(url); return client.focus(); }
      }
      return clients.openWindow(url);
    })
  );
});

self.addEventListener("sync", (event) => {
  if (event.tag !== "hn-reminder-check") return;
  // Connectivity just returned: check for reminders that were due offline
  // and show them now, WITH the original due time in the text.
  event.waitUntil(
    fetch("/api/reminders/status").then((r) => r.json()).then((st) => {
      if (!st.due || !st.due_at) return;
      const body = "আজকের হিসাব কি লিখেছো? আজকের দিনটাও তোমার দৈনন্দিন হিসাবের মধ্যে পড়ে — এখনই অ্যাপে ঢুকে আজকের খরচ বা আয় লিখে ফেলো।\nআসার কথা ছিল: " + bnDateTime(st.due_at);
      return self.registration.showNotification("AI হিসাব নিকাশ — আজকের হিসাব", {
        body,
        icon: "/static/icon-192.png",
        badge: "/static/icon.svg",
        tag: "hn-daily-reminder",
        data: { url: "/", due_at: st.due_at },
      });
    }).catch(() => { /* still offline — the in-app check will catch it */ })
  );
});

self.addEventListener("message", (event) => {
  // Page asks the worker to show a notification (catch-up path).
  const data = event.data || {};
  if (data.type !== "show-reminder") return;
  event.waitUntil(
    self.registration.showNotification(data.title || "AI হিসাব নিকাশ", {
      body: data.body || "",
      icon: "/static/icon-192.png",
      badge: "/static/icon.svg",
      tag: "hn-daily-reminder",
      data: { url: "/", due_at: data.due_at || null },
    })
  );
});
