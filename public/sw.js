// Minimal service worker: caches the app shell and static assets so the UI
// can still load when the network is briefly unavailable. No offline data
// sync — that is explicitly out of scope for the MVP, but this leaves room
// to add it later (e.g. a background sync queue) without touching the shell.
//
// Every same-origin request, including the RSC/data fetches Next.js issues
// for a client-side <Link> navigation (these are "fetch" requests, not
// "navigate" ones), goes network-first: the cache is only a fallback for
// when the network is unreachable. Serving cache-first here would mean a
// click always shows the previous state of the page until a full reload.
const CACHE_NAME = "kigardeki-v2";
const APP_SHELL = ["/", "/today", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png", "/offline"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL).catch(() => undefined))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => (await caches.match(request)) || (request.mode === "navigate" ? await caches.match("/offline") : undefined))
  );
});
