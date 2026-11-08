// 予約ノート（個） service worker
// アプリを更新したら VERSION の数字を1つ上げてください
const VERSION = "v1";
const PREFIX = "yoyaku-note-ko-";
const CACHE = PREFIX + VERSION;
const FILES = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];
const ROOT = new URL("./", self.registration.scope).pathname;

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  // このアプリの古い保存だけを消す（同じサイトの別アプリの保存は消さない）
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith(PREFIX) && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const path = new URL(req.url).pathname;
  if (!path.startsWith(ROOT)) return;
  if (req.mode === "navigate") {
    if (path !== ROOT && path !== ROOT + "index.html") return;
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put("./index.html", copy)); return res;
    }).catch(() => caches.match("./index.html")));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
