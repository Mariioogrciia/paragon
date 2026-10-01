# Paragon — extensión de sincronización de PSN y Epic

Resuelve el bloqueo de "solo entran amigos de la cuenta maestra" (ver
`ROADMAP.md` §0 y `HALLAZGOS.md` §1) sin pedirle a nadie que copie su NPSSO
a mano ni que Paragon lo guarde: la extensión lee la sesión de PSN que el
propio navegador ya tiene abierta (la misma que usarías para copiar el
NPSSO manualmente) y se lo manda a Paragon **una vez por sincronización**.
Paragon lo usa al vuelo y lo descarta — nunca llega a la base de datos (ver
`authenticateWithNpssoEphemeral` en `src/lib/psn/auth.ts`).

## Cómo funciona

1. **Conectar** (una vez): el popup abre `/movil/enlazar-extension` en una
   pestaña — esa página ya sabe quién eres por tu cookie normal de Paragon,
   genera un token propio de la extensión (independiente de tu sesión web,
   ver `mintExtensionSession`) y lo deja en el DOM. `content.js`, que solo
   corre en esa URL exacta, lo lee y se lo pasa al `background.js`, que lo
   guarda en `chrome.storage.local`.
2. **Sincronizar** (cada vez que se pulse): `background.js` pide
   `https://ca.account.sony.com/api/v1/ssocookie` con las cookies que ya
   tengas de `playstation.com` — es el mismo endpoint que da el NPSSO
   cuando lo copias a mano — y manda ese token, junto con el de Paragon
   (`Authorization: Bearer`), a `POST /api/extension/psn-sync`.
3. El backend (`linkPsnWithOwnToken` en `src/lib/profiles.ts`) cambia ese
   NPSSO por un access token de PSN, resuelve la cuenta (`"me"`, sin
   necesidad de conocer el onlineId de antemano) y sincroniza biblioteca +
   detalle de los juegos más recientes con `syncLibrary(..., { psnAuth })`
   — todo con el token del USUARIO, no con el de la cuenta maestra.

## Por qué "los juegos más recientes" y no todos

El token es efímero: vive solo lo que dura esa sincronización. A
diferencia de una cuenta amiga de la maestra (que puede pedir el detalle
de un juego cualquier día, perezosamente, al abrir su ficha), aquí no hay
un token guardado con el que hacerlo después — por eso `syncLibrary` trae
el detalle de golpe, en la misma pasada, para los juegos más recientes
(`PSN_OWN_TOKEN_DETAIL_LIMIT` en `src/lib/sync.ts`, mismo patrón que ya
usan Steam/Xbox/Epic). El resto de la biblioteca queda con sus totales
pero sin trofeo a trofeo hasta la siguiente sincronización — se resuelve
volviendo a pulsar "Sincronizar" cuando haga falta, no es un fallo.

## Probarla en local (sin publicarla en ninguna tienda todavía)

1. `chrome://extensions` → activa "Modo de desarrollador" → "Cargar
   descomprimida" → selecciona esta carpeta (`extension/`).
2. Pulsa el icono de la extensión → "Conectar con Paragon" (te pedirá
   iniciar sesión si no la tienes ya).
3. En otra pestaña, entra en `playstation.com` con tu cuenta real de PSN.
4. Vuelve al popup de la extensión → "Sincronizar PSN ahora".

`manifest.json` apunta a `https://platinos-nine.vercel.app` a pelo (un
manifest no puede leer variables de entorno) — si el dominio cambia algún
día, es el único sitio que hay que tocar (junto con `capacitor.config.ts`,
que tiene el mismo valor por el mismo motivo).

## Qué falta antes de publicarla de verdad

- Icono propio (hoy reutiliza `public/logo.png` tal cual, sin recortar
  para los tamaños que pide la Chrome Web Store).
- Revisar la política de contenido de Sony/PlayStation antes de subirla a
  ninguna tienda — automatiza un paso que hoy se hace a mano, pero sigue
  siendo un uso no oficial de la sesión de PSN.
- Versión para Firefox (el manifest de arriba es MV3, que Firefox también
  soporta desde 2023, pero no se ha probado ahí).


## Epic Games (desde la versión 1.1.0)

Epic bloquea con su protección antibots (Cloudflare) las consultas que hace
el servidor de Paragon (403, `cf-mitigated: challenge`, comprobado el 1 oct
2026), pero no las de un navegador de verdad con la sesión del usuario. Por
eso `epic.js` corre en `store.epicgames.com`, hace desde ahí las mismas
consultas GraphQL que la propia página de "Mis logros" y entrega el
resultado a `POST /api/extension/epic-sync`. **No esquiva ninguna
protección**: es el navegador de la persona consultando su propio perfil.

Cómo se usa: abrir en `store.epicgames.com` el avatar → "Mis logros" (la URL
acaba en `/u/<id de 32 caracteres>`), pulsar el icono de la extensión →
"Sincronizar Epic ahora".

- **Progreso declarado.** El servidor no puede comprobar esos datos (con PSN
  la extensión manda una credencial y el servidor lee él mismo). Por eso lo
  de Epic NO puntúa: ni nivel Paragon, ni clasificaciones, ligas, clanes,
  temporadas, retos ni insignias (ver `src/lib/declarado.ts`), y se marca en
  la interfaz como "Progreso declarado localmente".
- **Validación.** El servidor normaliza todo campo a campo, con topes de
  tamaño y solo imágenes de dominios de Epic (`src/lib/epic/extensionData.ts`).
- **Solo se actualiza al sincronizar a mano**: el cron del servidor no puede
  leer Epic y lo salta.
- Si Epic cambia los hashes de sus "persisted queries", hay que actualizarlos
  en `epic.js` y en `src/lib/epic/client.ts`.
- Recargar las pestañas de Epic abiertas antes de instalar/actualizar la
  extensión, para que tengan `epic.js`.
