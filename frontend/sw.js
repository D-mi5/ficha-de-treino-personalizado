const CACHE_NAME = "treino-feminino-v43";
const ASSETS_TO_CACHE = [
  "/",
  "/form",
  "/dashboard",
  "/resultado",
  "/offline.html",
  "/styles/output.css",
  "/scripts/form.js",
  "/scripts/result.js",
  "/scripts/pwa.js",
  "/manifest.webmanifest",
  "/assets/icons/icon-192.svg",
  "/assets/icons/icon-512.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((oldKey) => caches.delete(oldKey)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const isNavigationRequest = event.request.mode === "navigate";

  // Para páginas HTML, prioriza rede para evitar tela antiga em rotas como /entrar.
  if (isNavigationRequest) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === "basic") {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(async () => (await caches.match(event.request)) || (await caches.match("/offline.html"))),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== "basic") {
            return networkResponse;
          }

          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          return networkResponse;
        })
        .catch(() => (isNavigationRequest ? caches.match("/offline.html") : caches.match("/")));
    }),
  );
});
