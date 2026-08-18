// Minimal PWA service worker — caches the app shell for installability and basic
// offline resilience. Real offline-tolerant lead/call-note capture with background
// sync (spec Section 9) is a bigger feature (IndexedDB queue + sync API) not built here.
//
// It also backs the traveller companion app at /trip, which has a harder
// requirement: it must open and show hotel addresses, driver phone numbers and
// emergency contacts with no signal at all, abroad.

// Bumping this version purges every previously cached response on activate.
// v2 evicted entries poisoned by the pre-fix handler, which cached error
// responses; v3 evicts the authenticated /api/* responses it also used to cache.
const CACHE_NAME = 'holiday-vibez-shell-v3';
// '/trip' is precached alongside the CRM shell so a traveller who installs the
// app to their home screen and opens it with no signal still gets the document;
// its JS chunks and their trip data come from the runtime cache below.
const SHELL_ASSETS = ['/', '/logo.png', '/manifest.json', '/trip', '/trip-manifest.json'];

// Firebase Cloud Messaging background handler — shows a notification when a
// push arrives while no tab has focus. This is a static file (served from
// public/, not processed by Next.js), so it can't read process.env — these
// values must be filled in by hand to match the same NEXT_PUBLIC_FIREBASE_*
// values in apps/web/.env.local once you have a real Firebase project (see
// README's Push Notifications section). Firebase's web config is the
// standard public client config, safe to embed — protected by Firebase's own
// security rules, not secrecy.
const FIREBASE_CONFIG = {
  apiKey: '',
  projectId: '',
  messagingSenderId: '',
  appId: '',
};

if (FIREBASE_CONFIG.apiKey) {
  importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');
  firebase.initializeApp(FIREBASE_CONFIG);
  const messaging = firebase.messaging();
  messaging.onBackgroundMessage((payload) => {
    const { title, body } = payload.notification ?? {};
    if (!title) return;
    self.registration.showNotification(title, { body, icon: '/logo.png' });
  });
}

self.addEventListener('install', (event) => {
  // Deliberately not cache.addAll(): that rejects atomically, so a single
  // asset 404ing would abort the whole install and leave the app with no
  // service worker at all. Each asset is cached independently instead.
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => Promise.all(SHELL_ASSETS.map((url) => cache.add(url).catch(() => {})))),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

// Network-first, falling back to the cache. Two rules matter more than they look:
//
//  1. Only successful responses are cached. `fetch()` resolves — it does not
//     reject — for a 500 or a captive portal's interception page, so caching
//     unconditionally lets one bad response overwrite a good cached copy
//     permanently. A traveller abroad on hotel wifi hits exactly that.
//  2. A failed response falls back to the cache too, not just a thrown error,
//     for the same reason: the API being down should surface the saved copy,
//     not the 500.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Never cache API responses. Two reasons: they're authenticated, so they
  // don't belong in a Cache Storage bucket shared across everyone who uses the
  // device; and silently replaying a stale one defeats the traveller app's own
  // offline cache, which stores the trip in localStorage with a syncedAt
  // timestamp and shows an explicit "showing your saved copy" banner. Letting
  // the fetch genuinely fail is what triggers that banner — the traveller must
  // be able to tell a cached flight time from a live one.
  if (new URL(event.request.url).pathname.startsWith('/api/')) return;

  // On a thrown network error there is nothing to hand back but an error.
  const servedFromCache = () =>
    caches.match(event.request).then((hit) => hit ?? Response.error());

  // For a response that arrived but wasn't ok, prefer a cached copy — and when
  // there is none, hand back the ORIGINAL response rather than Response.error().
  // Response.error() makes the page's fetch() reject with a TypeError, which
  // would turn every genuine 400/404 into an indistinguishable "Failed to
  // fetch" and hide the status the caller needs to handle it.
  const preferCacheOver = (response) =>
    caches.match(event.request).then((hit) => hit ?? response);

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Opaque (no-cors, e.g. cross-origin images) responses report status 0
        // but are still worth caching — `ok` is false for them, so allow them
        // through explicitly rather than treating them as failures.
        const cacheable = response.ok || response.type === 'opaque';
        if (!cacheable) return preferCacheOver(response);

        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return response;
      })
      .catch(servedFromCache),
  );
});
