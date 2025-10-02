// Service Worker for Quran Tracker PWA
const CACHE_NAME = 'quran-tracker-v1.0.2';
const RUNTIME_CACHE = 'quran-tracker-runtime-v2';

// Files to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/hadits-data.json',
  '/manifest.json',
  'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.error('[SW] Cache install failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - Strategy yang diperbaiki
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests kecuali fonts dan CDN
  if (url.origin !== location.origin && 
      !url.hostname.includes('googleapis.com') &&
      !url.hostname.includes('gstatic.com') &&
      !url.hostname.includes('jsdelivr.net')) {
    return;
  }

  // CACHE FIRST untuk HTML (agar data tidak hilang saat refresh)
  if (request.mode === 'navigate' || 
      (request.method === 'GET' && request.headers.get('accept') && 
       request.headers.get('accept').includes('text/html'))) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          // Fetch in background untuk update cache
          const fetchPromise = fetch(request)
            .then((networkResponse) => {
              // Clone dan update cache
              if (networkResponse && networkResponse.status === 200) {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => {
                  cache.put(request, responseToCache);
                });
              }
              return networkResponse;
            })
            .catch((error) => {
              console.log('[SW] Network fetch failed, using cache:', error);
              return cachedResponse;
            });
          
          // Return cache immediately, atau fetch jika cache tidak ada
          return cachedResponse || fetchPromise;
        })
    );
    return; // PENTING: stop execution di sini
  }

  // CACHE FIRST untuk assets lainnya (CSS, JS, images, fonts)
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          console.log('[SW] Serving from cache:', request.url);
          return cachedResponse;
        }

        // Not in cache, fetch from network
        return fetch(request)
          .then((networkResponse) => {
            // Don't cache if not a valid response
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'error') {
              return networkResponse;
            }

            // Clone and cache the response
            const responseToCache = networkResponse.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              console.log('[SW] Caching new resource:', request.url);
              cache.put(request, responseToCache);
            });

            return networkResponse;
          })
          .catch((error) => {
            console.error('[SW] Fetch failed:', error);
            
            // Return offline page if available
            return caches.match('/offline.html')
              .then((offlineResponse) => {
                return offlineResponse || new Response('Offline');
              });
          });
      })
  );
});

// Background Sync - for future offline data sync
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered');
  
  if (event.tag === 'sync-quran-data') {
    event.waitUntil(syncQuranData());
  }
});

// Push notification handler
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'Jangan lupa tilawah Al-Quran hari ini!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    tag: 'quran-reminder',
    requireInteraction: false,
    actions: [
      {
        action: 'open',
        title: 'Buka Aplikasi'
      },
      {
        action: 'close',
        title: 'Tutup'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Quran Tracker', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  
  event.notification.close();

  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Helper function for background sync
async function syncQuranData() {
  try {
    console.log('[SW] Syncing Quran data...');
    return Promise.resolve();
  } catch (error) {
    console.error('[SW] Sync failed:', error);
    return Promise.reject(error);
  }
}

// Message handler for communication with main app
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
  
  if (event.data.action === 'clearCache') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      }).then(() => {
        event.ports[0].postMessage({ success: true });
      })
    );
  }
});
