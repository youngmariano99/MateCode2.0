const CACHE_NAME = "matecode-v2";
const ASSETS = [
  "/",
  "/dashboard",
  "/login",
  "/recuperar-password",
  "/icon.png",
  "/manifest.json",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  if (
    url.pathname.startsWith("/_next/") ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/sync/")
  ) {
    e.respondWith(
      fetch(e.request).catch(() => {
        return caches.match(e.request);
      })
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(e.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(e.request, networkResponse));
          }
        });
        return cachedResponse;
      }
      return fetch(e.request);
    })
  );
});
