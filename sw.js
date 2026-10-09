// 予約ノート service worker
// アプリを更新したら VERSION の数字を1つ上げてください
const VERSION = "v25";
const CACHE = "yoyaku-note-" + VERSION;
const FILES = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png", "./access.js"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  // 画面本体：ネットにつながれば最新版、つながらなければ保存しておいた版
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put("./index.html", copy)); return res;
    }).catch(() => caches.match("./index.html")));
    return;
  }
  // 利用コードの一覧：いつも最新を確認（電波がないときは保存しておいた版）
  if (new URL(req.url).pathname.endsWith("/access.js")) {
    e.respondWith(fetch(req, {cache: "no-store"}).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put("./access.js", copy)); return res;
    }).catch(() => caches.match("./access.js")));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
