// Minimal PWA service worker — caches the app shell for installability and basic
// offline resilience. Real offline-tolerant lead/call-note capture with background
// sync (spec Section 9) is a bigger feature (IndexedDB queue + sync API) not built here.
const CACHE_NAME = 'holiday-vibez-shell-v1';
const SHELL_ASSETS = ['/', '/logo.png', '/manifest.json'];

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
