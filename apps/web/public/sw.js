// Phase 0 service worker stub — passthrough only.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // TODO(phase-1): add static asset caching strategy.
  event.respondWith(fetch(event.request));
});
