const CACHE_NAME = 'paragon-offline-v1';
const OFFLINE_URL = '/offline';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // Solo cacheamos la ruta offline y el logo (opcional)
      await cache.add(new Request(OFFLINE_URL, { cache: 'reload' }));
    })()
  );
  // Fuerza al Service Worker a tomar control inmediatamente
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Activa el nuevo Service Worker para todas las pestañas
      if ('navigationPreload' in self.registration) {
        await self.registration.navigationPreload.enable();
      }
    })()
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Solo nos importan las peticiones de navegación (cuando cargas una página)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const preloadResponse = await event.preloadResponse;
          if (preloadResponse) {
            return preloadResponse;
          }

          // Intenta cargar por red primero
          const networkResponse = await fetch(event.request);
          return networkResponse;
        } catch (error) {
          // Si falla la red, devuelve la página offline de la caché
          const cache = await caches.open(CACHE_NAME);
          const cachedResponse = await cache.match(OFFLINE_URL);
          return cachedResponse || new Response('Offline', { status: 503, statusText: 'Offline' });
        }
      })()
    );
  }
});
