// build marker: 2026-08-08T11:06:35.694Z — no-op, verifies the update-banner mechanism
// Phase 0 service worker stub — passthrough only, plus Web Push handling.
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

// Web Push: payload is JSON {title, body, url} sent by the server
// (see apps/server/src/modules/push/notify.ts).
self.addEventListener('push', (event) => {
  let data = { title: 'BRICK CITY', body: '', url: '/chat' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    /* malformed payload — fall back to defaults */
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/logo-mark.svg',
      badge: '/logo-mark.svg',
      data: { url: data.url },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
