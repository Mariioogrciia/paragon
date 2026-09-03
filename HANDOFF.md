# Paragon — traspaso

Estado del proyecto y de la sesión de trabajo, para retomarlo sin tener que
releer todo el historial. Fecha: **3 de septiembre de 2026**.

---

## Qué es

Rastreador de trofeos y logros multiplataforma (Next.js 16 + Drizzle +
Postgres en Supabase, desplegado en Vercel). Lee perfiles **públicos** de PSN
y Steam con **una sola credencial del servidor** (`PSN_NPSSO`,
`STEAM_API_KEY`): nadie entrega contraseñas, vincular una cuenta es solo decir
"este soy yo ahí". Todo lo que se pinta sale de **nuestra** base, nunca en
directo de Sony o Valve — eso es lo que permite que un amigo vea tu progreso
aunque esas APIs jamás le dejaran consultarlo.

**Ojo:** el proyecto se ha trabajado en paralelo entre dos agentes (este y
Antigravity/Gemini en el IDE). Varias funciones existen por duplicado o a
medias. Antes de tocar algo, mira si ya está hecho.

---

## Decisiones de arquitectura que conviene no romper

| Decisión | Por qué |
|---|---|
| `games.id` = `<plataforma>-<id nativo>` | El mismo juego en PSN y Steam son **dos filas**: sus sets de logros no coinciden y mezclarlos daría porcentajes sin sentido. |
| Catálogo compartido (`games`) + progreso por usuario (`user_game`) | Dos personas con el mismo juego comparten la ficha y no los datos. |
| `platform: "manual"` | Cajón para lo que no tiene API (Switch, retro). No participa en `platform_account`. Su `nativeId` es `<igdbId>:<dispositivo>`. |
| El acento del tema se declara en canal RGB (`--accent-rgb`) | Permite derivar los tintes translúcidos. Antes iban a pelo (`rgba(74,158,255,.14)`) por toda la app y por eso cambiar de color "no cambiaba nada". |
| El cron va por tandas y con reloj | Una cuenta con PSN+Steam tarda ~25 s. Vercel corta a 60. Se sincronizan los perfiles más rancios y el resto entra a la hora siguiente. |

---

## La trampa recurrente de este código

**Cosas que parecen funcionar y no hacen nada.** Ha pasado cinco veces en una
sola sesión, siempre igual: la interfaz está lista, el dato existe en la base,
y en medio falta una línea que nadie ve porque **no da error**.

- `TrophyList` agrupaba por DLC, pero `getGameDetail` no seleccionaba
  `groupId`: todo caía en "Juego Base".
- La ficha pintaba el PEGI, pero `getLibrary` no seleccionaba `pegi`.
- El PEGI se leía de `age_ratings.category`, campo que **IGDB ya no
  devuelve**: responde 200 y llega vacío.
- Pedir dos cláusulas `fields` en una consulta de IGDB devuelve 200 y
  **descarta silenciosamente** parte de lo pedido.
- El botón "Ver un perfil de ejemplo" apuntaba a un handle inexistente: 404.

**Regla:** cuando conectes un dato nuevo, compruébalo **en la base y en
pantalla**, no solo que compile. Y si un agente edita con scripts de
sustitución de texto, que verifiquen que el patrón casó — un `print("ok")`
incondicional me costó una hora depurando un cambio que nunca se escribió.

---

## Qué se hizo en esta sesión

### Datos y catálogo
- **IGDB conectado** (`lib/igdb/client.ts`): OAuth de Twitch, token cacheado.
  Alimenta próximos lanzamientos, el buscador de juegos manuales y el PEGI.
- **Fecha de salida honesta**: IGDB rellena con el 31 de diciembre cuando solo
  sabe el año. La precisión real se lee de `release_dates.human`, así que
  *The Witcher IV* dice "Durante 2028" y no "31 dic 2028", y no lleva cuenta
  atrás falsa.
- **PEGI en 242 de 284 juegos**. Emparejado por título contra IGDB en cuatro
  oleadas (lote exacto → alias → uno a uno sin distinguir mayúsculas), con
  limpieza de títulos de PSN. Los 42 restantes se verificaron uno a uno: 29 no
  existen en IGDB con ese nombre y 11 no tienen clasificación. **Nunca se usa
  búsqueda difusa**: `search "Elden Ring"` devuelve "Elden Ring Nightreign", y
  para una etiqueta de edad el juego equivocado es peor que ninguna etiqueta.
- **Horas de juego**: 182/265 en PSN (el historial de PSN son 220 títulos
  frente a 265 juegos; los de PS3 y retirados no están) y 16/16 en Steam.
- **DLC**: `groupId`/`groupName` llegan por fin a la interfaz. El platino se
  calcula **solo sobre el juego base**, y si lo tienes con expansiones
  pendientes la ficha lo dice en vez de dejar la barra al 84%.

### Funciones
- **Juegos manuales** (Switch, retro): búsqueda en IGDB y alta a mano.
- **Ficha global** `/juego/[id]`: nota media, cuánta gente lo juega, reseñas.
- **`/ritmo`**: histórico de trofeos por mes con desglose por mes (día a día,
  metal, juego y trofeo a trofeo). Sale de `earnedAt`, que llevaba tiempo
  guardándose sin usarse.
- **Cron** `/api/cron/sync` (horario): sincroniza perfiles, rellena fichas sin
  detalle, clasifica PEGI y genera avisos.
- **Modo enfoque** `/u/[handle]/[gameId]/enfoque`: capa negra a pantalla
  completa con los 3 trofeos más cercanos, botones de 64 px, guía de YouTube y
  Wake Lock. Móvil y PC.
- **Avisos** `/avisos` + campana: platino cerca, lanzamiento de un juego
  deseado, y un amigo que platina algo que tú tienes a medias.
- **Dificultad estimada del platino**: a partir de la rareza, con la escala en
  seis tramos y el porcentaje siempre visible al lado. Ordenación nueva en la
  biblioteca: "Platino más asequible".
- **Perfil de ejemplo** `/ejemplo` con datos ficticios, para la portada.

---

## Pendiente

**Funciones acordadas y no hechas:**
1. **`igdbId` en `games` + emparejado.** Unificaría la ficha global entre
   plataformas y repartiría carátulas, géneros y PEGI a lo que falta. El
   emparejador por título ya está escrito (`pegiPorTitulo`), se reutiliza.
   **No tocado a propósito**: toca esquema y backfill sobre la base de
   producción, y esta sesión ha ido sin ti delante — mejor con tú mirando.
2. ~~Compartir el Wrap como imagen~~ → hecho el 3 de septiembre de 2026, con
   `ImageResponse` de `next/og` (ya viene con Next, no hizo falta el paquete
   `@vercel/og` suelto). Ruta [`/api/wrap/[handle]`](src/app/api/wrap/%5Bhandle%5D/route.tsx),
   1200×630, mismas tres tarjetas que `ParagonWrap` con los mismos números
   (`juegoDestacado`/`generoTop` se exportaron desde ahí para no duplicar la
   cuenta). Botón "Compartir imagen" en la cabecera del Wrap del perfil.
3. **Instalable en el móvil (PWA)** — aplazado a propósito.

**Fallos conocidos, arreglados el 3 de septiembre de 2026:**
- ~~Xbox, Epic y Ubisoft son vinculables pero no existen~~ → sus `resolve*`
  ([profiles.ts](src/lib/profiles.ts)) ahora devuelven `legible: false` (igual
  Google, que tampoco tiene lector real), y `syncLibrary`
  ([sync.ts](src/lib/sync.ts)) corta explícito si la plataforma no es `psn` ni
  `steam`, por si algo vuelve a marcar `isPublic` sin querer. Ya no se le pide
  la biblioteca a Steam con un gamertag de Xbox. Se sigue pudiendo vincular la
  cuenta (queda guardada y visible), simplemente no sincroniza — que es lo que
  la propia UI ya decía ("en fase de desarrollo").
- ~~`unlinkAccountAction` solo desvincula PSN y Steam~~ → ahora acepta las seis
  plataformas ([actions.ts](src/app/actions.ts)).
- ~~El cron por hora no despliega en plan Hobby~~ (Vercel: "Hobby accounts are
  limited to daily cron jobs") → `vercel.json` a `0 3 * * *` y lotes por
  pasada más grandes en [route.ts](src/app/api/cron/sync/route.ts), para
  aprovechar la única ejecución diaria.
- ~~La app se sentía lenta~~ → `getLibrary` ([profiles.ts](src/lib/profiles.ts))
  reintentaba el PEGI en IGDB (cuatro oleadas, la última una consulta por
  título) para los mismos ~40 juegos **en cada carga de biblioteca**, porque
  solo marcaba `pegi` cuando IGDB devolvía algo y nunca cuando no encontraba
  nada. Ahora también escribe `metadataSyncedAt` al no encontrar nada, igual
  que ya hacía `syncIgdbMetadata`, así que esos juegos se dejan de repreguntar
  y solo los reintenta el cron en su rotación aleatoria.

**Fallos conocidos sin arreglar:**
- **`/juego/[id]` significa dos cosas**: un `games.id` (`psn-NPWR…`) o un id
  numérico de IGDB. Funciona, pero se inventa ids como
  `manual-1234:deseados`. Lo arregla el punto 1.
- **Google Play** es un stub: su propia API no puede devolver la biblioteca de
  un jugador, solo logros del juego atado al Client ID.

**Sin probar de punta a punta** (solo hay un usuario en la base):
- Aviso de "un amigo te adelanta" — el SQL se validó a mano, el camino
  completo no.
- Aviso de lanzamiento — los deseados actuales aún no han salido.

---

## Operación

Variables de entorno (ver `.env.example`):

| Variable | Notas |
|---|---|
| `DATABASE_URL` / `DIRECT_URL` | Supabase. La segunda, solo para DDL. |
| `AUTH_SECRET`, `AUTH_GOOGLE_*`, `AUTH_DISCORD_*` | Auth.js. |
| `PSN_NPSSO` | **Caduca cada ~2 meses.** Cuando caduque, deja de sincronizar todo PSN. |
| `STEAM_API_KEY` | No caduca. |
| `IGDB_CLIENT_ID` / `IGDB_CLIENT_SECRET` | Twitch dev. |
| `CRON_SECRET` | **Falta en Vercel.** Sin ella la ruta del cron devuelve 503 a propósito. |

**Para que el cron funcione en producción hacen falta tres cosas:** subir
`vercel.json` y la ruta, poner `CRON_SECRET` en las variables de Vercel, y
redesplegar. El plan Hobby limita los crons a **una ejecución diaria**; el
`vercel.json` pide una por hora, así que si estás en Hobby hay que bajarlo a
`0 3 * * *` y subir los lotes por pasada.

**Migraciones:** la tabla `notification` se creó con SQL explícito
(`CREATE TABLE IF NOT EXISTS`), no con `db:push`, para no darle a una
herramienta la ocasión de proponer cambios sobre una base de producción.
Recomendado seguir así con lo aditivo.
