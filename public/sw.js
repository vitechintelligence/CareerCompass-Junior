const PUBLIC_CACHE = "ccj-public-v1";
const PUBLIC_SHELL = ["/international", "/offline", "/vitech-logo.svg"];

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
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && ["/", "/international", "/books", "/vn"].includes(url.pathname)) {
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
