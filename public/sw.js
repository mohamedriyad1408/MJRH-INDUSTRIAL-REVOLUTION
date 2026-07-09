// MJRH Service Worker — v1.0
// Minimal PWA service worker for offline shell and asset caching.

const CACHE_NAME = "mjrh-v1";
const PRECACHE_URLS = ["/", "/favicon.png", "/logo.png", "/mjrh-logo.png"];

// Install: precache shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for assets
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET
  if (request.method !== "GET") return;

  // Skip Supabase API calls (always network)
  if (url.hostname.includes("supabase.co") || url.hostname.includes("supabase.io")) return;

  // For navigation requests: network-first (SPA shell)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/"))
    );
    return;
  }

  // For static assets: cache-first
  if (url.pathname.startsWith("/assets/") || url.pathname.match(/\.(png|jpg|jpeg|svg|woff2?|css|js)$/)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Default: network-first
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
