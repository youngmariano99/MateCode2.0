const CACHE_NAME = "matecode-v3";
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

  // Navegaciones (HTML) y el resto de los assets: red primero, para no
  // servir nunca un shell viejo que pida chunks JS de un build anterior ya
  // borrado del servidor (eso rompía la hidratación después de cada
  // deploy). El caché queda solo como respaldo para cuando no hay red.
  e.respondWith(
    fetch(e.request)
      .then((networkResponse) => {
        if (networkResponse.status === 200) {
          // clone() tiene que llamarse acá mismo, en el mismo tick en que
          // llega la respuesta: si se difiere hasta que resuelva
          // caches.open() (un then anidado), el body ya puede estar en
          // uso y clone() tira "Response body is already used".
          const responseParaCache = networkResponse.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(e.request, responseParaCache));
        }
        return networkResponse;
      })
      .catch(() => caches.match(e.request))
  );
});
