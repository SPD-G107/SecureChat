// SecureChat Service Worker (PWA Offline Shell & Installability Support)
// 100% Local / Zero Cloud APIs or CDNs

const CACHE_NAME = 'securechat-cache-v1';
const CORE_ASSETS = [
  '/',
  '/chat',
  '/login',
  '/register',
  '/verify-key',
  '/manifest.json',
  '/favicon.png',
  '/logo.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS).catch((err) => {
        console.warn('PWA shell pre-cache note:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
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

// Chrome requires a fetch handler for PWA installability
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bypass Socket.IO and non-GET requests
  if (event.request.method !== 'GET' || url.pathname.startsWith('/socket.io') || url.pathname.startsWith('/api')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const toCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, toCache).catch(() => {});
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/chat');
          }
        });
      })
  );
});

// ==========================================
// W3C Web Push Background Notifications
// Handles Incoming Calls & Messages when App is in background / closed
// ==========================================
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : 'New SecureChat notification' };
  }

  const isCall = data.type === 'incoming_call';
  const title = data.title || (isCall ? '📞 Incoming Call' : 'SecureChat Notification');

  const options = {
    body: data.body || (isCall ? 'Someone is calling you...' : 'You have a new encrypted message'),
    icon: '/logo.png',
    badge: '/favicon.png',
    vibrate: isCall
      ? [500, 250, 500, 250, 500, 250, 500, 250, 500]
      : [200, 100, 200],
    tag: isCall ? 'securechat-incoming-call' : 'securechat-message',
    renotify: true,
    requireInteraction: isCall ? true : false,
    data: {
      url: data.url || '/chat',
      type: data.type,
      callerId: data.callerId,
      isVideo: data.isVideo,
    },
    actions: isCall
      ? [
          { action: 'accept', title: '🟢 Accept' },
          { action: 'decline', title: '🔴 Decline' },
        ]
      : [
          { action: 'open', title: '💬 Open' },
        ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};
  let targetUrl = data.url || '/chat';

  if (action === 'decline') {
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

