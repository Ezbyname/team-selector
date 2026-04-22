const CACHE_NAME = 'team-selector-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Install Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Activate Service Worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch with Network First for API, Cache First for Static Assets
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // NEVER cache API requests - always go to network
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request));
    return;
  }

  // ONLY cache GET requests for static assets
  if (request.method !== 'GET') {
    event.respondWith(fetch(request));
    return;
  }

  // Cache static assets only (HTML, CSS, JS, images, fonts)
  const isStaticAsset = /\.(html|css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i.test(url.pathname) ||
                        url.pathname === '/' ||
                        url.pathname === '/index.html' ||
                        url.pathname === '/manifest.json';

  if (!isStaticAsset) {
    event.respondWith(fetch(request));
    return;
  }

  // Cache-first strategy for static assets
  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(request).then(response => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone and cache the response
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(request, responseToCache);
            });

          return response;
        });
      })
  );
});
