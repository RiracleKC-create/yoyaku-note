// 予約ノート service worker
// アプリを更新したら VERSION の数字を1つ上げてください
const VERSION = "v94";
const PREFIX = "yoyaku-note-v";
const CACHE = "yoyaku-note-" + VERSION;
const ROOT = new URL("./", self.registration.scope).pathname;
const FILES = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png", "./access.js"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith(PREFIX) && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  // スクショの「共有」で予約ノートが選ばれたとき：画像を一時保存して、画面に読み取りを頼む
  if (req.method === "POST" && new URL(req.url).pathname.endsWith("/share-target")) {
    e.respondWith((async () => {
      try {
        const fd = await req.formData(), files = fd.getAll("img").filter(f => f && f.size);
        const name = "yoyaku-share:" + ROOT; await caches.delete(name); const c = await caches.open(name);
        await Promise.all(files.map((f, i) => c.put("./shared-" + i, new Response(f, {headers: {"content-type": f.type || "image/png", "x-time": String(f.lastModified || Date.now() + i)}}))));
      } catch (err) {}
      return Response.redirect(ROOT + "?shared=1", 303);
    })());
    return;
  }
  if (req.method !== "GET") return;
  // 別フォルダのアプリ（予約ノート（個）など）には手を出さない
  const path = new URL(req.url).pathname;
  if (path.startsWith(ROOT) && path.slice(ROOT.length).includes("/")) return;
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
  // スクショ読み取りの部品（cdn.jsdelivr.net）：一度読んだら端末に残して、電波がなくても使えるように
  if (new URL(req.url).hostname === "cdn.jsdelivr.net") {
    e.respondWith(caches.open("yoyaku-note-ocr").then(c => c.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) c.put(req, res.clone()); return res;
    }))));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
