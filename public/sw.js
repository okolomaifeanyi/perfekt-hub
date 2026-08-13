// Minimal service worker: just enough for installability + a basic offline
// fallback. Deliberately does NOT cache API responses, post/feed data, or
// HTML pages beyond the offline fallback — this app's data changes
// constantly and most of this session's bugs were exactly this kind of
// staleness, so caching dynamic content here would trade one staleness bug
// for another. Static, content-hashed build assets are safe to cache since
// a new deploy ships under new hashed filenames anyway.
const CACHE_NAME = "perfekthub-static-v1";
const OFFLINE_URL = "/offline";
const PRECACHE_URLS = [OFFLINE_URL, "/manifest.webmanifest", "/icon-192", "/icon-512"];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const { request } = event;
  if (request.method !== "GET") return;

  // Navigations: network first, fall back to the offline page when the
  // network is unreachable. Never serve a cached HTML page in place of a
  // live one.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Same-origin static build assets: cache-first, since Next.js ships these
  // under content-hashed filenames — a stale cache entry just means an old
  // asset that's still byte-identical to what it was cached from.
  const url = new URL(request.url);
  if (url.origin === self.location.origin && url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request))
    );
  }
});
