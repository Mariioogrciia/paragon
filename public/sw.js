// Se registra como /sw.js?v=<commit> (ServiceWorkerRegister.tsx): cada
// despliegue es un script "nuevo" para el navegador, así que se reinstala y
// vuelve a guardar la página offline con los chunks de ESE despliegue.
const CACHE_NAME = 'paragon-offline-v2';
const OFFLINE_URL = '/offline';
const ASSET_RE = /\/_next\/static\/[^"'\s)\\]+/g;

async function cachearPaginaOffline() {
  const cache = await caches.open(CACHE_NAME);
  // Sin cookies: la copia offline no debe llevar la cabecera con el nombre y
  // la foto de quien estaba conectado al instalarse.
  const respuesta = await fetch(new Request(OFFLINE_URL, { cache: 'reload', credentials: 'omit' }));
  if (!respuesta.ok) throw new Error('offline ' + respuesta.status);
  const html = await respuesta.clone().text();
  await cache.put(OFFLINE_URL, respuesta);

  // Sin su CSS y sus chunks, la página offline salía sin estilos y el
  // minijuego no arrancaba: solo se guardaba el HTML.
  const assets = new Set(html.match(ASSET_RE) || []);
  const css = [...assets].filter((u) => u.endsWith('.css'));
  await Promise.allSettled(
    css.map(async (u) => {
      const r = await fetch(u);
      const texto = await r.text();
      for (const fuente of texto.match(ASSET_RE) || []) assets.add(fuente);
    }),
  );
  await Promise.allSettled([...assets].map((u) => cache.add(u)));
}

self.addEventListener('install', (event) => {
  event.waitUntil(cachearPaginaOffline().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const nombres = await caches.keys();
      await Promise.all(nombres.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)));
      if ('navigationPreload' in self.registration) {
        await self.registration.navigationPreload.enable();
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const preloadResponse = await event.preloadResponse;
          if (preloadResponse) return preloadResponse;
          return await fetch(request);
        } catch (error) {
          const cache = await caches.open(CACHE_NAME);
          const cachedResponse = await cache.match(OFFLINE_URL);
          return cachedResponse || new Response('Offline', { status: 503, statusText: 'Offline' });
        }
      })(),
    );
    return;
  }

  // Chunks con hash: inmutables, así que la copia guardada vale siempre. Solo
  // se sirven de caché los que guardó la instalación; el resto va a la red.
  const url = new URL(request.url);
  if (request.method === 'GET' && url.origin === self.location.origin && url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const guardado = await cache.match(request, { ignoreSearch: true });
        return guardado || fetch(request);
      })(),
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
    }),
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
    })(),
  );
});
