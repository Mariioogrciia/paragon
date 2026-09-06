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

// --- Notificaciones push (ver lib/webPush.ts) -------------------------------
// El payload lo manda enviarPush() ya como JSON: { title, body, url?, icon? }.
// Sin `event.waitUntil`, el navegador puede matar el Service Worker antes de
// que termine de pintar la notificación y esta nunca llega a aparecer.
self.addEventListener('push', (event) => {
  let datos = { title: 'Paragon', body: 'Tienes una novedad.' };
  try {
    if (event.data) datos = event.data.json();
  } catch (error) {
    // Un payload que no es JSON no debe tumbar el aviso entero — se enseña
    // el genérico de arriba en vez de nada.
  }

  event.waitUntil(
    self.registration.showNotification(datos.title, {
      body: datos.body,
      icon: datos.icon || '/logo.jpg',
      badge: '/logo.jpg',
      data: { url: datos.url || '/' },
    })
  );
});

// Clic en la notificación: llevar a la pestaña ya abierta si existe (en vez
// de abrir una segunda), y si no, abrir una nueva en la URL del aviso.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const existente = clientList.find((c) => new URL(c.url).pathname === new URL(url, self.location.origin).pathname);
      if (existente) {
        existente.focus();
        return;
      }
      await self.clients.openWindow(url);
    })()
  );
});
