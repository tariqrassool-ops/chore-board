// Service worker for the Chore Board web app. Shows chore alerts pushed by the server
// (functions/src/index.ts) and opens the alarm screen when one is tapped.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let msg = {};
  try {
    msg = event.data ? event.data.json() : {};
  } catch (e) {
    msg = {};
  }
  const data = msg.data || {};
  const title = data.title || 'Chore time';
  const options = {
    body: data.body || 'One of your chores is due.',
    tag: data.key || 'chore',
    renotify: true,
    requireInteraction: true,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { key: data.key || '' },
  };
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      // If the board is open, jump straight to the alarm screen too.
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) =>
        list.forEach((c) => c.postMessage({ type: 'chore-alert', key: data.key || '' })),
      ),
    ]),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const key = (event.notification.data && event.notification.data.key) || '';
  const url = key ? '/alarm?key=' + encodeURIComponent(key) : '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) {
          c.postMessage({ type: 'chore-alert', key });
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
