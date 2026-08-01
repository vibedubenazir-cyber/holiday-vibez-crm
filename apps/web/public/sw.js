// Minimal PWA service worker — caches the app shell for installability and basic
// offline resilience. Real offline-tolerant lead/call-note capture with background
// sync (spec Section 9) is a bigger feature (IndexedDB queue + sync API) not built here.
const CACHE_NAME = 'holiday-vibez-shell-v1';
const SHELL_ASSETS = ['/', '/logo.png', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(event.request)),
  );
});
