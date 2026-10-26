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
