const PUBLIC_CACHE = "ccj-public-v5";
const PUBLIC_SHELL = ["/", "/offline", "/offline-practice", "/vitech-logo.svg", "/vitech-app-icon-512.png?v=3"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(PUBLIC_CACHE).then((cache) => cache.addAll(PUBLIC_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== PUBLIC_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache authenticated or user-specific surfaces. This prevents one account's
  // workspace data from being exposed to another person on a shared device.
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.startsWith("/workspace/") ||
    url.pathname.startsWith("/learn/")
  ) {
    // Never cache private responses. Protected navigations may fall back only to
    // the public offline explanation so a network loss is recoverable without
    // exposing another account's cached data.
    if (request.mode === "navigate") {
      event.respondWith(
        fetch(request).catch(async () => (await caches.match("/offline")) || Response.error()),
      );
    } else {
      event.respondWith(fetch(request));
    }
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && ["/", "/international", "/books", "/vn", "/offline-practice"].includes(url.pathname)) {
            const copy = response.clone();
            caches.open(PUBLIC_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match("/offline"))),
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || /\.(?:svg|png|jpg|jpeg|webp|css|js|woff2?)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (response.ok) caches.open(PUBLIC_CACHE).then((cache) => cache.put(request, response.clone()));
        return response;
      })),
    );
  }
});
