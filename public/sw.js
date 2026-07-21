const CACHE_VERSION = "gry-logiczne2-dev";
const BASE_PATH = new URL(self.registration.scope).pathname;
const BUILD_ASSETS = /* INJECT_BUILD_ASSETS */ [];
const NAVIGATION_TIMEOUT_MS = 3000;
const APP_SHELL = [
  BASE_PATH,
  `${BASE_PATH}index.html`,
  `${BASE_PATH}manifest.webmanifest`,
  `${BASE_PATH}icons/icon-192.png`,
  `${BASE_PATH}icons/icon-512.png`,
  `${BASE_PATH}icons/icon-maskable-512.png`,
  `${BASE_PATH}assets/mow-logo.jpg`,
  `${BASE_PATH}mentors/fokus.svg`,
  `${BASE_PATH}mentors/iskra.svg`,
  `${BASE_PATH}mentors/strateg.svg`,
];
const NAMED_TARGET_IMAGES = Array.from(
  { length: 36 },
  (_, index) => `${BASE_PATH}t-puzzle/named/figure-${String(index + 1).padStart(3, "0")}.svg`,
);

self.addEventListener("install", (event) => {
  const buildUrls = BUILD_ASSETS.map((asset) => `${BASE_PATH}${asset}`);
  const precacheUrls = [...new Set([...APP_SHELL, ...NAMED_TARGET_IMAGES, ...buildUrls])];
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(precacheUrls))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      Promise.race([
        fetch(request),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Navigation request timed out.")), NAVIGATION_TIMEOUT_MS),
        ),
      ])
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(`${BASE_PATH}index.html`, copy));
          return response;
        })
        .catch(() => caches.match(`${BASE_PATH}index.html`, { ignoreVary: true })),
    );
    return;
  }

  event.respondWith(
    caches.match(url.href, { ignoreVary: true }).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    }),
  );
});
