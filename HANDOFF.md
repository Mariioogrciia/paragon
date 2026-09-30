# Paragon — traspaso

Estado del proyecto y de la sesión de trabajo, para retomarlo sin tener que
releer todo el historial. Última actualización: **30 de septiembre de 2026**.

**Estado actual (29 sept 2026) — léelo antes que nada:**
- **Todo está commiteado y en `origin/master`** (desplegado en Vercel, región
  `fra1`). Lo único fuera del repo son `.env.local` y `scratch/`. El aviso de
  sesiones anteriores sobre "cambios sin commitear" ya no aplica.
- Las sesiones del **25 al 29 de septiembre** (auditorías y tres tandas de
  funciones) están documentadas **al final de este archivo**, en orden:
  auditoría de seguridad/plataforma → Functions Storage → segunda auditoría
  (rendimiento/estética) → piloto automático → funciones del 28 → RLS
  activado → tercera tanda de funciones → trofeos ocultos y horas por periodo.
- **Seguridad**: RLS activado en las 40+ tablas de `public` y sin permisos
  para `anon`/`authenticated` (comprobado el 28 sept). Cualquier tabla nueva
  debe crearse con su script en `scripts/` activando RLS igual que los
  existentes. Limitador de peticiones activo (`lib/rateLimit.ts`).
- **Calidad**: `npm test` (Vitest, 69 tests), lint sin errores (solo avisos
  de `<img>` por hosts dinámicos) y workflow `.github/workflows/comprobaciones.yml`.
- **Vercel Hobby**: cuidado con el Functions Storage (se llenó al 90% por
  249 despliegues conservados; se borraron el 28 sept). Agrupar los cambios
  en pocos pushes: cada push es un despliegue.
- **Pendiente de decisión del usuario**: el handle `maricon439` (ya se
  puede cambiar desde `/admin?tab=moderation`); y las reglas del Pase de
  Temporada (decididas por Claude, ver `lib/temporada.ts`), revisables.
- La última tanda (moderación, logros, niveles, Comunidad, 29-30 sept) está
  al final de este archivo.

---

## Historial anterior

Las sesiones del 3 al 23 de septiembre de 2026 (y los incidentes de esos
días) están en [`docs/historial/sesiones-3-23-sept-2026.md`](docs/historial/sesiones-3-23-sept-2026.md),
tal cual se escribieron. Se separaron el 30 sept porque este archivo pasaba
de 340 KB y ya no se podía leer entero de una vez. Buscar ahí (grep) antes
de dar algo por nuevo: casi todo tiene historia.

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

**Aviso para quien esté trabajando en paralelo (Antigravity u otro agente),
3 de septiembre de 2026:** para depurar un 500 en producción tuve que levantar
un par de servidores locales de prueba, y al pararlos usé
`taskkill /F /IM node.exe /T` — eso mata **todos** los procesos Node de la
máquina, no solo los míos. Si tenías un `npm run dev` u otra cosa en Node
corriendo en este equipo en ese momento, se cayó sin avisar. No debería
volver a pasar (ver más abajo por qué hacía falta pararlos), pero si algo
tuyo se cortó de golpe por esas fechas, es por esto.

**Los dos agentes commiteamos y empujamos directo a `master`, sin ramas ni
PR.** Funciona porque tocamos archivos distintos casi siempre, pero si algún
día chocáis de verdad en el mismo bloque de código, tocará resolverlo a
mano. Antes de una sesión larga, `git pull` primero.

---

## Decisiones de arquitectura que conviene no romper

| Decisión | Por qué |
|---|---|
| `games.id` = `<plataforma>-<id nativo>` | El mismo juego en PSN y Steam son **dos filas**: sus sets de logros no coinciden y mezclarlos daría porcentajes sin sentido. |
| Catálogo compartido (`games`) + progreso por usuario (`user_game`) | Dos personas con el mismo juego comparten la ficha y no los datos. |
| `platform: "manual"` | Cajón para lo que no tiene API (Switch, retro). No participa en `platform_account`. Su `nativeId` es `<igdbId>:<dispositivo>`. |
| El acento del tema se declara en canal RGB (`--accent-rgb`) | Permite derivar los tintes translúcidos. Antes iban a pelo (`rgba(74,158,255,.14)`) por toda la app y por eso cambiar de color "no cambiaba nada". |
| El cron va por tandas y con reloj | Una cuenta con PSN+Steam tarda ~25 s. Vercel corta a 60. Se sincronizan los perfiles más rancios y el resto entra a la hora siguiente. |
| La conexión a Postgres se cachea en `globalThis` en **todos** los entornos, dev incluido | Antes solo se cacheaba fuera de producción. En serverless un cold start solo evalúa el módulo una vez; sin cachear, cada acceso al proxy `db` abría un cliente nuevo (hasta 10 sockets) y no cerraba los anteriores → "max client connections reached" en Supabase. Ver `src/db/index.ts`. |
| Un 100% de Steam cuenta como platino | Steam no tiene trofeo de platino que contar; su "terminar el juego" es el 100% de logros. `esPlatinoEquivalente()` en `lib/stats.ts` es la fuente única de verdad — úsala en cualquier sitio nuevo que cuente platinos (recuento de biblioteca, insignias, XP de nivel), no repitas `earned.platinum > 0` a pelo. |
| La foto de perfil se resuelve siempre igual: PSN → cualquier cuenta con avatar → imagen genérica | En TypeScript (con un `ProfileRow` ya cargado) es `resolveAvatarUrl()` en `profiles.ts`; en SQL (listas de gente que no es "el perfil actual" — reseñas, ligas, feed, comparador) es `avatarUrlSql()` en `lib/avatarSql.ts`. Si añades una pantalla nueva que enseñe la cara de alguien, usa una de las dos — no leas `users.image` a pelo. |
| Horas de PSN: nunca colapsar por nombre sin más | El endpoint de horas jugadas da una fila POR VERSIÓN REALMENTE JUGADA (PS4 y PS5 de un mismo juego son dos filas con horas propias, no la misma cifra repetida — ver la trampa de más abajo). `repartirHoras()` en `psn/client.ts` decide si sumar (una sola ficha de trofeos para el nombre) o repartir por dispositivo (varias fichas). Para "tu juego más jugado" A TRAVÉS de plataformas distintas (Steam + PSN del mismo título), es `gruposPorTitulo()` en `lib/stats.ts` quien suma. |
| Tablas nuevas: SQL explícito, no `db:push` | Todas las tablas de esta sesión (`game_difficulty_vote`, `game_guide`, `game_guide_reply`) se crearon con scripts `CREATE TABLE IF NOT EXISTS` en `scripts/`, mismo motivo que `notification`: `db:push` compara el esquema entero y es más arriesgado sobre producción. |
| El hover global va por CSS sin `@layer`, no por componente | `globals.css`: reglas con `[class*="rounded"]`/`[class*="cursor-pointer"]` sobre `button`/`a`. Al no estar en ningún `@layer`, le gana a las utilidades de Tailwind (que sí van en `@layer utilities`) pase lo que pase con la especificidad — así un botón nuevo sale con hover sin que nadie tenga que acordarse de ponérselo. |
| `overflow-hidden` recorta el propio `filter` del elemento que lo lleva | El resplandor de hover es `filter: drop-shadow`. Si el mismo elemento tiene `overflow-hidden` (para recortar una carátula a sus esquinas redondeadas), se recorta a sí mismo el resplandor. El recorte va siempre en un hijo interior, nunca en el elemento que declara el hover — ver `GameCard.tsx`/`DiscoverCard.tsx`. |
| "Estilo" es un eje aparte de "modo" y "acento" | El modo (claro/oscuro/OLED/contraste) cambia colores base; el acento, el color de marca; el estilo (`lib/apariencia.ts`) cambia la FORMA de toda la página — radio, sombra, tipografía, fondo. Los tres son independientes: se puede querer OLED + acento verde + estilo Vidrio. |
| Horas por juego: unificadas en el perfil, separadas por plataforma | En Estadísticas del perfil (`horasPorJuego`, `lib/profileStats.ts`) el mismo juego en dos plataformas suma sus horas en una fila — es "cuánto le he echado en total". En `/descubrir/[plataforma]` (`mostPlayedOnPlatform`, `lib/platformHub.ts`) se filtra `games.platform` ANTES de agrupar, así que cada plataforma solo cuenta sus propias horas. Las dos reglas son a propósito y no hay que igualarlas. |
| `avatarPersonalizado` decide si la foto subida a mano gana a PSN | `users.image` guarda a la vez la imagen de login (Google/Discord) y la subida a mano desde /ajustes — sin ese booleano no hay forma de distinguirlas. Solo `/api/upload` (subida real de avatar) lo pone a `true`. Cualquier sitio nuevo que resuelva un avatar tiene que pasar por `resolveAvatarUrl`/`avatarUrlSql`, nunca leer `users.image` a pelo. |
| Los logros de un juego: `defined` es solo-PSN, `definedTotal` es universal | `games.defined` (desglose por metal: bronce/plata/oro/platino) SOLO lo rellena PSN — Steam no tiene esa jerarquía. El total que vale para cualquier plataforma vive en `games.definedTotal`. Cualquier cosa que cuente "cuántos logros tiene este juego" sin mirar `definedTotal` como último recurso se deja Steam a cero, en silencio (pasó de verdad en `getGameTrophyBreakdown`). |
| Un `1fr` de CSS Grid no se encoge solo — hace falta `min-w-0` | A diferencia de un flex item, un `1fr` de grid tiene `min-width: auto` por defecto: si el contenido de dentro es más ancho que el hueco (una tira de scroll horizontal, por ejemplo), el TRACK entero crece para caber en vez de recortarse — eso empuja la página entera a scroll horizontal. Pasó en la ficha de juego (columna principal junto a la barra lateral de 300px). Cualquier columna de grid que pueda llevar dentro algo con `overflow-x-auto` necesita `min-w-0`. |
| Paragon Score es una cifra APARTE del nivel Paragon, nunca la misma | El nivel de la navbar/tarjeta de perfil (`lib/level.ts`, `paragonProgress`) solo cuenta metales de PSN (`game.earned`) y ya tiene un historial real de bugs de desincronización entre sitios. `lib/paragonScore.ts`/`lib/trophyScore.ts` es la puntuación unificada entre plataformas (PSN por metal, Xbox por Gamerscore real, Steam estimado por rareza) — vive aparte a propósito, no sustituye ni alimenta el nivel de siempre. |
| La fórmula pura de puntuación vive sin `server-only`, la consulta a la base sí lo lleva | `lib/trophyScore.ts` (la función `trophyScore`) no puede tener `server-only` porque la usa tanto el servidor como `TrophyList.tsx` (componente de cliente, para enseñar el XP de un trofeo suelto). `lib/paragonScore.ts` sí lo lleva, porque consulta Postgres — importa la fórmula de trophyScore.ts en vez de repetirla. |

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
- **`getLibrary` reintentaba el PEGI en IGDB en cada carga de biblioteca**
  para los ~40 juegos que IGDB no tiene: solo marcaba `pegi` cuando
  encontraba algo, nunca cuando no. Esto era el grueso de "la app va lenta".
- **Las horas de PSN se colapsaban por nombre de juego**, perdiendo datos
  reales: un jugador con 1620 h en PS4 y 95 h en PS5 del mismo título
  aparecía con 95 h en las dos fichas (o menos). El primer intento de
  arreglarlo asumió que PSN da una sola cifra por nombre — **no es así**: da
  una fila por versión realmente jugada, con su propia cifra. El arreglo de
  verdad fue sumar/repartir, no elegir una y tirar el resto. Moraleja: probar
  contra la API real con una cuenta que tenga el caso raro, no razonar sobre
  lo que "debería" devolver.
- **`NULL + count(*) filter (...)` es `NULL` en Postgres.** Al sumar
  "100% de Steam cuenta como platino" a un `sum(CAST(...))` que puede salir
  NULL (nadie con platinos de PSN), la insignia de platinos se quedaba a
  cero para cualquiera sin ningún platino real, aunque tuviera Steam al
  100%. Hace falta `coalesce(sum(...), 0) + count(...)`, no `sum(...) + count(...)`.
- **Los deseados contaban como juegos de la biblioteca** en `summarise()` y
  en las consultas SQL de insignias/estadísticas globales — nadie los
  excluía explícitamente.
- **Cada click en las estrellas insertaba una fila nueva en `activities`**
  en vez de actualizar la existente: cambiar de opinión de 2 a 5 estrellas
  dejaba 4 entradas idénticas en el feed.
- **`overflow-hidden` se come el propio `filter` del hover.** Cualquier
  tarjeta con `overflow-hidden` en el mismo elemento que declaraba el
  resplandor de hover se quedaba sin resplandor, en silencio — el recorte
  tiene que ir en un hijo interior.
- **`AnimatePresence` + `whileInView` con filtros que cambian rápido**
  dejaba tarjetas "fantasma" en pantalla (visibles, con su tamaño real, no
  solo en el DOM) cuando el filtro las quitaba antes de que su animación de
  entrada hubiera llegado a activarse. El contador de resultados decía una
  cosa y la pantalla enseñaba otra — mismo timing en cada prueba, no un
  caso raro.
- **Un `<link rel="manifest" href="/manifest.ts">` a mano daba 404.** El
  archivo especial `app/manifest.ts` de Next se sirve en
  `/manifest.webmanifest`, y hay que pedírselo a Next por
  `metadata.manifest`, no enlazarlo a pelo. Sin manifest legible, ningún
  navegador ofrece "Instalar"/"Añadir a pantalla de inicio" — estuvo así
  desde que se añadió, probablemente sin probarlo nunca en un móvil real.
- **Safari en iOS ignora el atributo `download` de un `<a>`.** No es un
  fallo de la app: es así desde siempre en WebKit. Cualquier "descargar
  esto" pensado para móvil necesita la Web Share API (`navigator.share`
  con `files`), no un enlace con `download`.
- **`{ ...g, genres: [] }` no rellena un campo con nombre distinto.** Los
  objetos de IGDB usan `coverUrl`; las tarjetas (`PosterCard`, `DiscoverCard`)
  leen `iconUrl`. Hacer spread directo del objeto de IGDB dentro de `game={...}`
  compila perfecto (ningún campo es obligatorio) y no carga ninguna
  carátula, en silencio — pasó en "Juegos similares". Cuando se pase un
  objeto de una función a un componente que espera otra forma, mapear los
  campos a mano, no confiar en que el spread "ya cuadra".
- **Un `1fr` de CSS Grid no se recorta solo.** Ver la fila de la tabla de
  arriba — sin `min-w-0`, una tira de scroll horizontal dentro de una
  columna de grid empuja la página entera a scroll horizontal, y no salta
  ningún error: se ve una barra de scroll abajo del todo y ya.
- **La API de ITAD rechaza el ISO estándar de JS para `since`.**
  `Date.toISOString()` da milisegundos + `Z` (`2024-09-04T11:18:47.655Z`);
  `/games/history/v2` responde 200... no, responde **400** "Invalid 'since'
  format" con eso — quiere segundos enteros y un offset explícito
  (`+00:00`, no `Z`). Sin probarlo contra la API real (no basta con leer su
  documentación, que solo dice `<date-time>`) el histórico de precios
  volvía `[]` siempre, en silencio, y la sección entera no aparecía. Ver
  `lib/itad.ts`.
- **Un `<img>` suelto (sin `flex`/`block`) deja un hueco bajo la foto dentro
  de un marco circular.** `AvatarFrame` clipa a círculo con
  `overflow-hidden`, pero eso no arregla el hueco de línea de base que deja
  un `<img>` inline por defecto — la vista previa de `/ajustes` usaba un
  `<img>` a pelo en vez del componente `Avatar` (que sí centra con flex) y
  la foto no llegaba a rellenar el marco del todo. Arreglado usando
  `Avatar` ahí también.

**Regla:** cuando conectes un dato nuevo, compruébalo **en la base y en
pantalla**, no solo que compile. Y si un agente edita con scripts de
sustitución de texto, que verifiquen que el patrón casó — un `print("ok")`
incondicional me costó una hora depurando un cambio que nunca se escribió.
Y si el dato viene de una API externa con una forma "obvia", compruébalo
contra la API de verdad antes de escribir el arreglo — la forma obvia fue la
que causó el bug de las horas de PSN la primera vez.

---

## Pendiente

**Actualizado el 29 de septiembre de 2026.** De la lista de abajo ya están
hechos: i18n de `relativeDate()` y de los retos semanales, filtro de
lenguaje en alemán y francés, Pase de Temporada, Vitrinas temáticas y las
notificaciones push (Web Push + FCM, hace tiempo). Sigue pendiente de
verdad:
- **Rediseño visual de la landing**: sigue la decisión de no tocar la
  estética global.
- **Dominio propio**: no comprado; la app sigue en `platinos-nine.vercel.app`.
- **Epic no da horas jugadas** por su API: nunca aparecerán en rankings de
  horas (no es un fallo arreglable desde aquí). **Xbox sí** desde el 30
  sept 2026: `MinutesPlayed` por `POST /player/stats` de OpenXBL
  (`minutosJugados` en xbl/client.ts), solo para juegos de Xbox/PC — los
  de Xbox Live en PlayStation/Android se excluyen para no duplicar horas.
- **Horas por periodo**: solo hay registro diario desde el 29 sept 2026
  (`lib/horasPeriodo.ts`); los periodos anteriores a esa fecha no se pueden
  reconstruir.
- **Sin probar con sesión iniciada** (el navegador de las sesiones de Claude
  no tiene login): alertas de precio, objetivos, sesiones online, platinar
  juntos, vitrinas, guerra de clanes, "ignorar horas", cerrar otras sesiones
  y el onboarding de Android. Los avisos automáticos del cron tampoco se han
  visto llegar todavía (el primer resumen semanal: domingo 4 oct, 18:00; el
  primer cierre de temporada: 1 oct).

**De la sesión del 21 de septiembre (continuación 21), sin cerrar:**
- **i18n: solo texto de interfaz traducido, no contenido**. Las 42
  páginas + 135 componentes están traducidos a ES/EN/DE/FR, pero cosas
  como `relativeDate()` (lib/design.ts, "hoy"/"ayer"/"hace X días") o
  los textos de `lib/missions.ts` (retos semanales) siguen devolviendo
  literales fijos en español sin importar el idioma activo — señalado
  por los propios agentes que tradujeron Descubrir/Biblioteca, no
  arreglado todavía.
- **Filtro de contenido ofensivo solo en ES/EN** — alemán y francés
  quedan sin cubrir en `lib/contentFilter.ts` (ver el apartado de la
  sesión más arriba).
- **Pase de Temporada y Vitrinas Temáticas de Coleccionista** — siguientes
  de la lista de gamificación priorizada con el usuario tras Rachas, no
  empezadas.
- **Rediseño visual de la landing (tipografía, glassmorphism, degradados)**
  — propuesto por el usuario vía otra IA, decisión explícita de NO
  tocar la estética por ahora. Si se retoma, ojo: `globals.css` es
  global a toda la app, no solo a la landing — habría que decidir
  alcance antes de tocar nada.
- **Dominio propio (`paragontrofeos.com` estaba libre a fecha de la
  sesión)** — comprobado disponible, no comprado. La app sigue en
  `platinos-nine.vercel.app`.

**Funciones acordadas y no hechas:**
1. ~~`igdbId` en `games` + emparejado.~~ → **Confirmado el 9 de septiembre**:
   413 de 470 juegos (88%) tienen `igdbId` poblado en producción — los
   scripts de Antigravity sí se ejecutaron de verdad. Este documento llevaba
   días sin confirmarlo.
2. ~~Compartir el Wrap como imagen~~ → hecho el 3 de septiembre de 2026, con
   `ImageResponse` de `next/og` (ya viene con Next, no hizo falta el paquete
   `@vercel/og` suelto). Ruta [`/api/wrap/[handle]`](src/app/api/wrap/%5Bhandle%5D/route.tsx),
   1200×630, mismas tres tarjetas que `ParagonWrap` con los mismos números
   (`juegoDestacado`/`generoTop` se exportaron desde ahí para no duplicar la
   cuenta). Botón "Compartir imagen" en la cabecera del Wrap del perfil.
3. **Instalable en el móvil (PWA)** — Antigravity dejó el Service
   Worker/manifest montados, pero el `<link>` al manifest daba 404 (ver
   trampa nueva arriba); ya arreglado el 4 de septiembre. El resto del
   Service Worker (`public/sw.js`, caché offline) **no se ha auditado**.
4. **Auditoría "full responsive" completa.** Se arregló el desbordamiento
   concreto de la cabecera en móvil (menú nuevo lo destapó) y se repasó la
   biblioteca entera (búsqueda, filtros, "Más filtros") en 375px el 4 de
   septiembre, pero el resto del sitio sigue sin auditar pantalla a
   pantalla — es su propia tarea, con alcance propio.
5. Dos scripts sueltos sin trackear en la raíz del repo, de una sesión
   anterior: `test-yt.js` y `award-badges.ts`. Ni se han tocado ni se han
   borrado — decidir qué hacer con ellos.
6. **La tarjeta de platino compartible pidió mejora** (4 de septiembre): se
   construyó una primera versión (`/api/trophy-card/[handle]/[gameId]`,
   carátula + horas + rareza + trofeos) y se mandó de ejemplo, pero el
   usuario no había dado el visto bueno al diseño todavía a fecha de este
   documento — revisar si hubo feedback antes de darla por cerrada.
7. **Notificaciones push de verdad.** Ya hay Service Worker y manifest de
   PWA (de Antigravity); falta VAPID + tabla de suscripciones + el
   manejador `push` + el punto donde disparar el envío. Identificado como
   "el siguiente paso natural" el 4 de septiembre, no empezado.

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
- ~~El nivel Paragon no cuadraba entre la navbar y la tarjeta del perfil~~ →
  [`lib/level.ts`](src/lib/level.ts) calculaba `platinos` (XP de los
  platinos) y no lo sumaba al `total`, así que cualquiera con algún platino
  veía un nivel más bajo bajo el Wrap que en la navbar (`lib/paragonLevel.ts`,
  que sí lo suma). De paso arregla el propio donut de la tarjeta, que reparte
  sus 360° entre trofeos/platinos/completados sobre ese mismo `total`.
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

**Xbox — construido y probado de punta a punta (4 de septiembre de 2026,
madrugada).** Ya no es un stub (`legible: false`): sincroniza de verdad,
mismo patrón que PSN/Steam. Vía **OpenXBL** (xbl.io) — riesgo asumido a
propósito, sigue sin ser oficial de Microsoft, ver el aviso completo en la
cabecera de `lib/xbl/client.ts`.
- **`lib/xbl/client.ts`** (nuevo): `resolveProfile`, `canReadAchievements`,
  `fetchLibrary`, `fetchAchievements` — mismas formas que `steam/client.ts`.
  Sin metales (bronce/plata/oro/platino): Xbox da Gamerscore por logro, como
  Steam.
- **Enganchado en `sync.ts`** (`syncLibrary`/`syncGameTrophies`) y
  **`profiles.ts`** (`resolveXbox` de verdad, ya no el stub). La UI de
  vinculación (`LinkXboxForm`, `linkXboxAction`) ya existía de antes sin
  tocar — solo hacía falta que `resolveXbox` dejara de devolver
  `legible: false` siempre.
- **Bugs reales encontrados probando contra la API de verdad** (no contra su
  documentación, que en algunos puntos ni la tiene):
  - Sin la cabecera `Accept-Language` explícita, los endpoints de logros
    dan 400 ("invalid locale value: `*`").
  - `GET /player/gamertag/{gamertag}` da 404 "no route matches" con un
    gamertag que no existe, en vez de un "no encontrado" limpio — se usa
    `GET /search/{gamertag}` en su lugar, que sí devuelve una lista vacía.
  - **Bug propio, no de la API**: la primera versión de `fetchLibrary` leía
    `data.titles` en vez de `data.content.titles` (la respuesta real viene
    envuelta en `content`) — devolvía `[]` siempre, en silencio. Se pilló
    al probar de extremo a extremo con `scripts/probar-sync.mts xbox
    <XUID>` (ampliado para aceptar `xbox`, antes solo `psn|steam`), no
    solo compilando.
  - `achievement.totalAchievements` en la lista de biblioteca ha salido a 0
    en juegos con logros conseguidos de verdad — campo que no es de fiar.
    Igual que Steam, el progreso real se calcula en la sincronización de
    detalle, nunca en la llamada de biblioteca.
- **Probado de extremo a extremo** con una cuenta real
  (`TalkyLicense530`): 6 juegos importados, detalle de Minecraft
  sincronizado (133 logros, 7 conseguidos, el más raro al 0.04%) — datos
  reales en las mismas tablas que PSN/Steam (`games`, `user_game`,
  `game_trophy`, `user_trophy`), leídos de vuelta con `getLibrary`/
  `getGameDetail` sin cambios.
- **Presupuesto del nivel gratis (150 peticiones/hora, compartido entre
  TODOS los usuarios con Xbox vinculado, no por cuenta)**: `XBL_DETAIL_LIMIT`
  = 15 juegos por vinculación (`sync.ts`), y `XBL_DETALLES_POR_PASADA` = 10
  por pasada de cron (`api/cron/sync/route.ts`) — sin este segundo tope, una
  pasada con muchas fichas de Xbox sin detalle podría agotar el cupo de la
  hora para todo el mundo, no solo para quien la disparó.
- **Sin probar todavía**: qué devuelve la API con un perfil que tiene el
  historial de juegos oculto por privacidad de Xbox — solo se ha probado
  contra una cuenta propia y pública. `canReadAchievements` lo trata como
  legible mientras la petición no falle de verdad (ver el comentario en el
  propio archivo).

**Sin probar de punta a punta:**
- Aviso de "un amigo te adelanta" — el SQL se validó a mano, el camino
  completo no.
- Aviso de lanzamiento — los deseados actuales aún no han salido.

(Ya hay 5 usuarios reales en la base, con cuentas PSN/Steam de verdad —
la comparación en grupo, los rankings y el resto de esta sesión se probaron
contra ellos, no con datos inventados.)

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
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Web Push (navegador/PWA) — `lib/webPush.ts`. Ya puestas desde la sesión del 6 de sept., faltaba anotarlas aquí. |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | **Nueva, de esta sesión.** JSON entero de la cuenta de servicio de Firebase (una sola línea), para `lib/fcm.ts` — el equivalente de las VAPID pero para la app nativa de Android. Ya puesta en Vercel por el usuario. |

**Para que el cron funcione en producción hacen falta tres cosas:** subir
`vercel.json` y la ruta, poner `CRON_SECRET` en las variables de Vercel, y
redesplegar. El plan Hobby limita los crons a **una ejecución diaria**; el
`vercel.json` pide una por hora, así que si estás en Hobby hay que bajarlo a
`0 3 * * *` y subir los lotes por pasada.

**Migraciones:** la tabla `notification` se creó con SQL explícito
(`CREATE TABLE IF NOT EXISTS`), no con `db:push`, para no darle a una
herramienta la ocasión de proponer cambios sobre una base de producción.
Recomendado seguir así con lo aditivo. Mismo patrón para las tablas de
`game_difficulty_vote`, `game_guide`/`game_guide_reply` y, de esta sesión,
`trophy_guide` (`scripts/crear-tabla-guias-trofeo.mts`): scripts en
`scripts/crear-*.mts`, ya ejecutados contra producción. Igual para columnas
sueltas: `users.profileSectionOrder`
(`scripts/anadir-orden-secciones-perfil.mts`), `user_game.createdAt`
(`scripts/anadir-createdat-user-game.mts`, para "Tendencias" en Descubrir) y,
de esta sesión, `users.avatarPersonalizado`
(`scripts/anadir-avatar-personalizado.mts`, decide si el avatar subido a
mano gana a PSN), y de la sesión del 5 de septiembre,
`game_trophy.xp` (`scripts/anadir-xp-game-trophy.mts`, Gamerscore real de
Xbox para Paragon Score) — **todas ya ejecutadas contra producción**. Los 5
índices de rendimiento (`scripts/anadir-indices-rendimiento.mts`:
`user_game`/`user_trophy` por `gameId`, `activity` por `userId`/`gameId`,
`activity_comment` por `activityId`) también, mismo día. Sin confirmar si
`scripts/anadir-igdbid-juegos.mts` y `scripts/unificar-catalogo.mts` (de
Antigravity) llegaron a correrse — ver el punto 1 de "Pendiente". De esta
sesión, `fcm_token` (`scripts/crear-tabla-fcm-token.mts`) — **ya ejecutada
contra producción**. Ojo con este caso concreto: se intentó primero con
`db:push` y drizzle-kit preguntó si truncar `push_subscription` (2 filas
reales, gente con Web Push activado) para poder ponerle una restricción
UNIQUE que no tenía nada que ver con la tabla nueva — se abortó ese camino
sin tocar nada y se hizo con el script de siempre en su lugar. Esa
restricción pendiente en `push_subscription` sigue sin resolverse (ver
"Pendiente" más abajo si se añade una entrada).

**CheapShark** (comparador de precios) no necesita clave, pero desde hace
poco exige un `User-Agent` descriptivo o devuelve un error genérico —
ya está puesto en `lib/prices.ts`, no hace falta variable de entorno nueva.

---

---

## Auditoría de seguridad y plataforma (25 sept 2026)

Pedida por el usuario ("auditoría de la app y de la plataforma"), y luego
"todo lo que puedas cambiar, cámbialo".

**PENDIENTE DE EJECUTAR — lo más grave de la auditoría:** en Supabase, 32
de las 35 tablas de `public` tenían RLS desactivado y los roles `anon`/
`authenticated` conservaban TODOS los permisos por defecto (SELECT,
INSERT, UPDATE, DELETE, TRUNCATE) — con la clave `anon`, cualquiera
habría podido leer `session`/`account` (tokens) o vaciar tablas. La
clave no aparece en el repo ni en la app Android, así que no era
explotable hoy, pero Supabase la trata como pública.
`scripts/activar-rls.mts` lo cierra (RLS sin políticas + REVOKE + default
privileges). La app no se entera: se conecta como `postgres` (dueño de
todas las tablas, BYPASSRLS — comprobado). El clasificador de permisos
bloqueó ejecutarlo contra producción desde la sesión: lo tiene que lanzar
el usuario (`npx tsx scripts/activar-rls.mts`).

**Arreglado en código:**
- `/api/profile/update`: el handle se guardaba sin validar (vacío, "/",
  mayúsculas...) — ahora mismas reglas que `chooseHandleAction`, también
  pasa por el filtro de lenguaje, y un campo vacío ya no lo borra. Imagen/
  banner solo http(s) o `preset:`, color `#rrggbb`, zona horaria válida,
  marco inexistente descartado. Mensajes de error nuevos en `/ajustes`.
- Guía de vídeo: `searchTrophyGuideAction` (sin sesión, a propósito)
  aceptaba título/nombre del cliente y cacheaba el resultado para todos —
  ahora con ids el texto sale de la base (`lib/videoGuides.ts`).
- Subidas (`lib/uploads.ts`, compartido web + móvil): MIME por extensión
  (antes el del cliente), firma de bytes, máx. 4 MB, borra la subida
  anterior del mismo usuario. El formulario ya enseña el motivo del fallo.
- Cabeceras en `next.config.ts`: X-Frame-Options/frame-ancestors (antes
  clickjacking posible), nosniff, Referrer-Policy, Permissions-Policy. Sin
  CSP completa a propósito (ver el comentario allí).
- `/api/cron/sync` dio un 504 real (60s) a las 10:00 UTC: el presupuesto
  de 22s solo se miraba ENTRE cuentas. Ahora `conTope()` limita cada
  cuenta/ficha, y los 24 `fetch()` de `src/lib` llevan
  `AbortSignal.timeout(10_000)` (antes solo `coverAura` tenía timeout).
- `/api/arcade/score` daba 500 en producción (ranking del juego de
  `/offline` roto): alias `u` de `user` incompatible con `avatarUrlSql`.
- `Planificador`: bucle infinito de `syncHltbAction` mientras la página
  estaba abierta (array nuevo por render + `revalidatePath`).
- Discord: firma malformada daba 500 en vez de 401.
- Lint: 46 errores → 0 (`any` tipados; `react-hooks` revisados uno a uno,
  eran patrones correctos — excepción puntual con el motivo al lado).
- `npm audit fix` (sin `--force`). Queda `uuid` bajo `gaxios`: no afecta
  (gaxios solo usa v4, el fallo es de v3/v5/v6).

**No hecho, con motivo:** rate limiting (no hay Redis/Upstash; en memoria
no sirve en serverless), y `/movil/enlazar-extension` sigue creando una
sesión de 30 días por visita sin forma de revocarlas. En el lado del
usuario: restringir la clave de `android/app/google-services.json` en
Google Cloud, y considerar despliegues de preview (hoy todo push va
directo a producción). Nada de esto se ha podido probar con sesión
iniciada (el navegador de la sesión no tenía login).

### Functions Storage de Vercel al 90% (9,06 GB / 10 GB, mismo día)

Aviso del usuario con captura del panel de uso. Functions Storage = tamaño
de los bundles de funciones × CADA despliegue que Vercel conserva — no se
limpia solo. Medido: **249 despliegues conservados** (desde el 4 de
septiembre; cada push a `master` es uno) a ~36 MB cada uno.

- Por despliegue: `sharp` (libvips) iba dentro de todas las funciones por
  ser dependencia opcional de Next, aunque solo lo usaba `coverAura.ts`.
  Ahora `coverAura` decodifica con `jpeg-js`/`pngjs` (comparado contra
  sharp con carátulas reales: ±6/255 antes del ajuste HSL), `sharp` fuera
  de `package.json` y `outputFileTracingExcludes` en `next.config.ts`.
  Traza por función en local: ~19 MB → ~10 MB.
- Por número: lo que de verdad libera los 9 GB es borrar despliegues
  viejos (o una política de retención). Pendiente de confirmación del
  usuario. Y agrupar los pushes: cada push suma ~36 MB (ahora menos).

---

## Segunda auditoría: rendimiento, estética y mejoras (28 sept 2026)

Hecho y subido en un solo push (para no gastar Functions Storage):

- **Región de funciones `fra1`** (`vercel.json`). Las funciones corrían en
  `iad1` (Washington) y Supabase está en `eu-central-1` (Fráncfort): cada
  consulta cruzaba el Atlántico dos veces. Los perfiles tardaban 2-2,5 s
  siempre, aunque la primera respuesta llegaba en 0,25 s. Hobby permite una
  sola región. Lo que irá un poco más lento es el cron cuando habla con APIs
  de EE. UU. (PSN, Steam, IGDB) — lo menos importante. `vercel.json` no
  admite comentarios, por eso la explicación va aquí.
- **Mensajes de traducción al cliente recortados** (`src/i18n/clientMessages.ts`):
  antes iban todos (~110 KB) en el HTML de cada página. La lista cubre
  todo `useTranslations(...)` del código; `npx tsx
  scripts/comprobar-namespaces-cliente.mts` avisa si falta uno.
- `loading="lazy"` en 52 imágenes (Descubrir cargaba 84 de golpe). Las de
  arriba del todo (cabecera, logo del juego, primera del carrusel, banner
  anclado) siguen normales a propósito.
- `recharts` eliminado: el radar de /comparar es SVG propio.
- Móvil: titular de la portada fluido (se salía por la derecha y hacía
  scroll horizontal), cifras en 2×2 (`StatTile` más compacto en móvil),
  pestañas del perfil en una fila con scroll, aviso de cookies corto.
- Ficha de juego: el artwork se ve (degradado en vez de velo del 75%;
  primera captura si no hay artwork) y aviso de que la descripción de IGDB
  es en inglés.
- Perfil de ejemplo con banner y marco.
- Portada pública: solo nombre de pila (+ @handle) en Muro de la fama,
  ticker y trofeos raros — `name` es el nombre completo de Google/Discord.
- `aria-label` en controles de vídeo/carrusel e iconos del pie.
- i18n: `relativeDate` y el "hace X" de la portada con
  `Intl.RelativeTimeFormat` (español idéntico a antes); retos semanales
  traducidos por id (la API móvil sigue devolviendo el español); filtro de
  lenguaje ofensivo con alemán y francés.

**Sin hacer, con motivo:** onboarding nativo de Android (no se puede
compilar ni probar aquí) y Pase de Temporada / Vitrinas (piden decisiones
de producto). Sin probar con sesión iniciada: `/comparar` (radar) se
comprobó renderizando el componente aparte.

---

## Tercera pasada, piloto automático (28 sept 2026)

**Pendiente de ejecutar por el usuario** (el clasificador bloquea escribir en
la base de producción desde la sesión):
- `npx tsx scripts/activar-rls.mts` — lo más grave, sigue abierto.
- `npx tsx scripts/crear-tabla-rate-limit.mts` — hasta entonces el
  limitador deja pasar todo (falla abierto, avisa una vez en los logs).

**Hecho:**
- `fcm.ts`: import dinámico de `firebase-admin` comiteado (era trabajo del
  usuario sin comitear). Medido: ~85 ms de carga en local que dejan de
  pagarse en el arranque en frío de casi todas las funciones.
- **Limitador de peticiones** (`lib/rateLimit.ts`, tabla `rate_limit`):
  búsqueda de juegos, guías de vídeo, subidas, comentarios, guías escritas,
  arcade, extensión PSN y guardado de perfil. No el WAF de Vercel: en Hobby
  es una sola regla y se configura a mano en el panel.
- **Sesiones**: "Cerrar sesión en los demás dispositivos" + recuento en
  Ajustes → Seguridad; el cron borra las sesiones caducadas (las de la app
  y la extensión se quedaban para siempre).
- **Tests**: Vitest 3 (el 5 choca con `@types/node` 20), `npm test`, 40
  tests; workflow `.github/workflows/comprobaciones.yml` (tsc + lint +
  tests en cada push, no bloquea el despliegue).
- **Fallos encontrados y arreglados**:
  - Quitar la nota de un juego guardaba un 0 que contaba como voto de cero
    estrellas en la media de la comunidad; y se aceptaba cualquier número.
    Ahora `null` (y se borra del feed) y solo enteros 1-5.
  - Comentarios del feed sin filtro de lenguaje (web y móvil).
  - Guías, respuestas, reseñas, notas de juego y clanes sin tope de
    longitud; etiqueta de clan con cualquier carácter (va en la URL).
  - Reseña con fecha inválida reventaba la consulta.
  - Perfil/juego inexistente: hueco vacío entre cabecera y pie (no había
    `not-found.tsx`). 404 propio traducido.
- `HANDLE_RE` y el resto de reglas del perfil en `lib/validacionPerfil.ts`
  (estaban copiadas en tres sitios).
- Lint: solo quedan los 33 avisos de `<img>` (hosts dinámicos de PSN/Xbox).
- Nuevo: botón "Compartir" en el perfil (menú nativo o copiar enlace, con
  plan B si el navegador bloquea el portapapeles). Hover en los botones de
  la cabecera del perfil, que no tenían.
- Nota sobre el lockfile: npm 10.9 lo reescribe con otro orden; comprobado
  que no cambia ninguna versión (solo añade las 91 de Vitest, todas dev).

---

## Funciones nuevas (28 sept 2026, piloto automático)

Las seis propuestas de la auditoría, en un solo push. **Tablas creadas en
producción** con `scripts/crear-tablas-funciones-nuevas.mts` (esta vez el
clasificador sí dejó ejecutar un script solo aditivo) y también
`crear-tabla-rate-limit.mts` → el limitador de peticiones ya está activo.
`activar-rls.mts` sigue PENDIENTE (lo lanza el usuario).

1. **Alertas de precio** (`lib/priceAlerts.ts`, `lib/steamPrecio.ts`,
   `AlertaPrecio.tsx` en la ficha de juego): precio actual de Steam España
   en euros y "avísame cuando baje de X €". El cron revisa unas pocas por
   pasada; `debeAvisar` (con tests) evita repetir el aviso durante la misma
   rebaja. Avisos por `lib/avisos.ts` (Web Push + FCM + DM de Discord).
   - **Fallo encontrado de paso**: las ofertas de CheapShark se pintaban en
     "€", pero CheapShark solo da precios de tiendas de EE. UU. en dólares
     (comprobado contra Steam `cc=us`). Ahora "US$". El histórico de ITAD sí
     es España/euros.
2. **Objetivos con fecha** en el Planificador (`lib/goals.ts`,
   `lib/objetivos.ts` con tests, `ObjetivoFecha.tsx`): trofeos/día que hacen
   falta frente a tu ritmo real de 90 días.
3. **Resumen semanal por Discord** (`lib/resumenSemanal.ts`, `lib/semana.ts`
   con tests de horario de verano/invierno): domingos desde las 18:00 hora
   de Madrid, solo con DM activado; `notification_log` evita repetirlo.
4. **Guerra de clanes** (`lib/clanWars.ts`, `GuerraDeClanes.tsx`): el líder
   reta, el otro líder acepta, 14 días con la puntuación de las ligas; el
   cron las cierra y avisa. Retos sin contestar caducan a los 7 días. Una
   guerra abierta por clan como mucho. Hoy solo existe un clan ([FNTR]).
5. **"Tu progreso"** en la ficha global de juego (`getMiProgreso`).
6. **Onboarding Android**: el paso del handle YA existía (18-19 sept; la
   nota "sin construir" de más arriba estaba desactualizada). Añadido el
   segundo paso: sin juegos, antes del panel se enseña Cuentas vinculadas
   con "Ya lo he vinculado" / "Saltar por ahora" (recordado en el móvil).
   Compilado con `./gradlew :app:compileDebugKotlin` (JAVA_HOME = el JBR de
   Android Studio); no probado en emulador (exige login).

Otros: título de pestaña en la página de clan; importes en euros con el
formato del idioma.

**Actualización (28 sept 2026):** el usuario ejecutó `scripts/activar-rls.mts`.
Comprobado después: 40 tablas en `public`, 0 sin RLS, 0 permisos de
`anon`/`authenticated`; producción responde 200 en portada, perfiles, ficha
de juego, clanes, Descubrir y API. La API REST de Supabase queda cerrada.
Al crear tablas nuevas, sus scripts ya activan RLS y retiran permisos (y los
default privileges también quedaron retirados).

---

## Tercera tanda de funciones (29 sept 2026)

Tablas nuevas creadas en producción con
`scripts/crear-tablas-funciones-nuevas-2.mts` (league_position,
boost_session, boost_participant, coop_challenge, showcase_shelf,
season_result), todas con RLS.

1. **Aviso de perdibles al empezar un juego** (`lib/avisosAutomaticos.ts`):
   solo juegos que entran en la biblioteca desde el 29 sept (los de antes
   tienen todos la fecha de la migración).
2. **Lanzamiento de deseados** (hoy/mañana), con fechas de IGDB en lote
   (`fechasLanzamiento`), solo fechas exactas.
3. **"Te han adelantado en la liga"**: compara con `league_position`, como
   mucho un aviso al día por persona.
4. **Firma** `/api/firma/<handle>.png` (600×150, caché 1 h) y 5. **overlay
   para OBS** `/api/overlay/<handle>` (HTML propio fuera del layout, fondo
   transparente, `?tema=claro`). Ambos en Ajustes → "Tu firma".
6. **Sesiones de trofeos online** `/sesiones` (`lib/sesiones.ts`): crear,
   apuntarse, cancelar, recordatorio 1 h antes por el cron. En el menú "Más".
7. **Platinar juntos** en el Planificador (`lib/coop.ts`): juegos a medias
   en común con amigos (por igdbId), reto con fecha, el cron lo cierra.
8. **Vitrinas temáticas** (`lib/vitrinas.ts`): manual / platinos de un
   estudio / trofeos <5%; sección "vitrinas" del perfil, editor en Ajustes.
9. **Pase de Temporada** `/temporada` (`lib/temporada.ts` reglas con tests,
   `lib/temporadas.ts` datos): trimestres, puntos de liga, nivel cada 250,
   medallas bronce/plata/oro/platino en 5/15/30/50. Decisiones tomadas por
   Claude a falta de criterio del usuario — revisables. El cron cierra la
   anterior; la primera cerrada será la T3 (1 oct 2026), que cuenta desde
   julio.

**Fallos encontrados de paso:**
- `missableTrophies` de Black Myth: Wukong guardado con el JSON codificado
  dos veces → ningún perdible marcado. `lib/perdibles.ts` lo normaliza y la
  lectura lo repara en la base.
- Filtro de lenguaje con `\b`: "maricon439", "puta_gg" pasaban. Ahora la
  frontera es "no letra". **Hay un usuario real con handle `maricon439`** —
  sin tocar, decisión del usuario.

---

## Trofeos ocultos y horas por periodo (29 sept 2026)

**Mostrar ocultos**: interruptor en la lista de trofeos
(`TrophyList.tsx`), recordado en `localStorage`. Se aplica una vez al
recibir los trofeos (marcándolos `hidden: false`), así lo respetan lista,
cuadrícula, árbol, cronología y la ficha del trofeo.

**Horas: la queja real y su causa.** El usuario vio en
`/u/[handle]/wrap/horas?rango=anio` ("este año") 2.109 h de Fortnite y
1.715 h de GTA V, que no ha jugado este año.
- Las cifras SON las que da Sony para esa cuenta (comprobado contra
  `getUserPlayedGames`: Fortnite PS4 1.828 h / 1.334 sesiones 2017-2022 +
  PS5 280 h). Son de toda la vida, no de este año.
- El fallo era de Paragon: con un periodo, `rankingHoras` filtraba los
  juegos TOCADOS en el periodo (`lastPlayedAt`, aquí la copia de Xbox de
  Fortnite abierta el 1 ene 2026) pero enseñaba sus horas de SIEMPRE.
- Arreglo: `playtime_snapshot` (script `crear-tabla-registro-horas.mts`,
  ya ejecutado, foto inicial de 888 juegos el 29 sept) + `lib/horasPeriodo.ts`.
  El cron apunta el total de cada juego el día que cambia; las horas de un
  periodo = total de hoy − total al inicio del periodo. Para periodos que
  empiezan antes del 29 sept, se cuenta desde el primer registro y la
  pantalla lo dice (`notaHorasDesdeRegistro`). "Este año" saldrá vacío
  hasta que se juegue algo: es lo honesto, antes no hay dato.
- Epic no da horas por API: lo jugado en Epic no puede aparecer.
- Además, **"ignorar horas"** en la ficha de un juego propio
  (`playtime_ignored`, `lib/horasIgnoradas.ts`) para horas que la
  plataforma atribuye a la cuenta pero jugó otra persona. Excluidas en
  biblioteca, estadísticas (`horasPorJuego`, `horasTotales`), Descubrir y
  "Tu progreso". El dato de la plataforma no se toca.

---

## Moderación, logros, personalización por nivel y Comunidad (29-30 sept 2026)

Tanda pedida por el usuario tras una "auditoría de logros/personalización/
cosas fuera de sitio". Script `scripts/crear-tablas-auditoria-3.mts`, **ya
ejecutado en producción** (solo añade): tabla `mission_completion` (RLS),
columnas `user.tituloDesbloqueado` y `user.apariencia`, y 2 platinos
recientes rellenados como `activity` tipo "platinum".

**Moderación (admin).** Pestaña `/admin?tab=moderation`
(`getAdminModeracion`, lib/admin.ts): usuarios cuyo handle/nombre/título/
estado marca hoy el filtro, clanes y ligas con nombre ofensivo, y las
reseñas del feed (movidas desde "Sistema"). Acciones `adminSetHandleAction`
(forzar handle; también desde `/admin/usuarios/<id>`, con aviso rojo si el
handle es ofensivo) y `adminVaciarCampoAction`. Crear uno nuevo ya estaba
bloqueado. **`@maricon439` sigue sin tocar**: el usuario lo cambiará él
desde la pestaña.

**Fallos arreglados.**
- La XP de las misiones semanales ("+100 XP") no contaba para nada. Ahora
  se guarda lo cumplido (`mission_completion`, desde el panel y desde
  `checkAndGrantBadges` en cada sync) y suma al nivel: `xpMisiones` en
  `getLibrary` → `paragonProgress(games, xpMisiones)` en todos los sitios, y
  en `getParagonLevels`. Tramo nuevo en el donut de `ParagonLevelCard`.
- `getParagonLevels` (cabecera, amigos) no sumaba la XP de Epic y
  `paragonProgress` (perfil) sí: el nivel salía distinto. Igualado.
- La tarjeta de logros del perfil enseñaba 6 de las 10 insignias otorgadas.
- `/rankings` marcado en el menú sin existir la ruta.

**Logros.** Catálogo único `lib/logros.ts` (25 insignias, 2 ocultas:
noctámbulo y maratón) + `lib/medirLogros.ts` (UNA consulta, ~0,8 s para el
usuario con más datos). Lo mismo otorga (`checkAndGrantBadges`) y pinta
(`ParagonAchievements`, `Badges`); textos en `Perfil.Badges.items`
(el antiguo `ParagonAchievements.items` se quitó). Tests en
`tests/logros.test.ts`. Las nuevas se otorgan solas en la próxima sync de
cada uno.

**Personalización por nivel.**
- Títulos especiales `lib/titulos.ts` (por nivel o insignia), elegibles en
  Ajustes → General, validados en `/api/profile/update`, pintados con
  `TituloEspecial` en perfil y Comunidad.
- Estilos PS5/Xbox (nivel 10) y Steam/Switch (20): `ESTILO_REQUISITOS`.
  Banners Retro (15) y Paragon (30): `BANNER_REQUISITOS`. Ambos en
  lib/level.ts, comprobados en cliente y servidor.
- Medallas de temporadas cerradas en la cabecera del perfil
  (`MedallasTemporada`).
- Apariencia guardada en la cuenta (`guardarAparienciaAction`,
  `SincronizarApariencia` en el layout): un dispositivo nuevo sale con el
  acento/estilo de siempre.

**Cosas cambiadas de sitio.** Temporada → pestaña de Ligas; Sesiones y
Clanes → pestañas de Comunidad (`SeccionTabs`; fuera de "Más" y de
`NAV_OCULTABLE`). "Platinar juntos" → `/amigos` (avisos y revalidaciones
apuntan ahí). "Ritmo" → pestaña del propio perfil. Vitrinas y firma →
`/ajustes/escaparate`. `/comparar` ya estaba bien en Amigos.

**Comunidad** (`/feed`): pestaña "Todos" (perfiles públicos), platinos en
el feed (los apunta `sync.ts`, id `plat-<user>-<juego>`, con "Felicitar"),
hitos intercalados (insignias y palmarés, `lib/comunidad.ts`) y barra
lateral: platino más raro de la semana, cazadores de la semana, juegos en
tendencia y próximas sesiones.

**Entorno local.** Avast (Web/Mail Shield) intercepta HTTPS: el servidor
de desarrollo lanzado desde la app no heredaba `NODE_EXTRA_CA_CERTS` y el
login fallaba con "Configuration" (fetch failed). Añadido en
`.claude/launch.json`. Y ojo: una conexión zombi del pool (query "active"
en `ClientRead` en `pg_stat_activity`) dejó colgado el dev server minutos;
reiniciarlo lo arregla.

---

## Cuarta auditoría y mejoras (30 sept 2026)

Pedida por el usuario tras revisar lo anterior ("repasa absolutamente todo").
`scripts/crear-tablas-auditoria-3.mts` se volvió a ejecutar (idempotente)
para añadir `user.panelOculto`.

**Hecho:**
- **Peso de páginas** (HTML sin comprimir, medido con sesión):
  estadísticas 995 → 690 KB (mapa de actividad como un solo SVG +
  `TooltipDelegado`, un tooltip compartido en vez de uno por celda; el de
  horas usa lo mismo), perfil 617 → 381 KB (`FavoritePicker` recibía la
  biblioteca entera), panel 546 → 461 KB.
- **Paginación** `?pagina=N` acumulativa con `VerMas` (sin JS, enlazable):
  Comunidad (20 por página, mezclando actividad e hitos por fecha),
  ranking de Temporada (antes cortado a 20), Liga mensual (25) y tablas
  del admin (usuarios 50, trofeos 60, reseñas 30).
- **Panel personalizable**: Ajustes → Ocultar, "Secciones del panel"
  (`lib/panelPreferences.ts`). Lo oculto ni se pinta ni se consulta.
- **Móvil**: stats del panel 3 por fila; destacados de Comunidad arriba en
  tira deslizable (en escritorio, columna lateral fija); cabecera con
  hamburguesa hasta 1024 px (se cortaba entre 640 y 1024); pestañas del
  perfil con difuminado solo si quedan pestañas fuera.
- **Reacciones con emoji** en Comunidad (👏🔥🏆😂😮, una por persona;
  `lib/reacciones.ts`). La columna `activity_reaction.reaction` ya existía.
  La app móvil sigue aplaudiendo como antes.
- Insignias del mismo día y persona agrupadas en una tarjeta; plurales.
- Título de pestaña en la ficha de juego; en Biblioteca el contador ya no
  cuenta los deseados (salen aparte).
- **HANDOFF partido**: el historial del 3 al 23 sept está en
  `docs/historial/sesiones-3-23-sept-2026.md` (tal cual).

**Descartado a propósito:**
- Traducciones por ruta: los 82 KB de mensajes son sin comprimir (~12 KB
  con gzip) y dejar un componente cliente sin su texto tumba la página
  entera (pasó con CookieBanner). No compensa.
- Adelgazar la biblioteca del Planificador: se serializa una sola vez y el
  filtro de estado de ánimo usa casi todos los campos.
- La conexión colgada en `ClientRead` no la cubre `statement_timeout`
  (Postgres espera al cliente, no ejecuta). Si vuelve a pasar en
  producción, mirar `pg_stat_activity`.

Subido en `cc643de` (despliegue de Vercel correcto).

### Después del push (30 sept 2026)
- **Descubrir con pestañas** (Descubrir · Noticias · eSports): fuera de
  "Más" y de `NAV_OCULTABLE` Noticias y eSports.
- **Avisos por categoría** (`lib/avisosPreferencias.ts`, columna
  `user.avisosDesactivados`, formulario en Ajustes → General):
  `avisarUsuario(userId, aviso, categoria?)` no avisa si está apagada; el
  push de trofeos de `sync.ts` y el resumen semanal también lo miran. Las
  invitaciones, propuestas de reto, retos de guerra y cancelaciones no
  llevan categoría: siempre llegan.
- **Marcos por insignia** (`FRAME_INSIGNIA` y `marcoDisponible` en
  lib/level.ts): Laurel (Campeón), Aurora (Temporada de oro), Eclipse
  (Noctámbulo), anillos cónicos girando (`AnilloGiratorio`).
- **Idioma en fechas y números**: fechas relativas con el idioma de la app
  (`lib/localeFechas.ts`) en Comunidad, Clanes y DLC; números con el
  locale en nivel, perfil, panel, Comunidad, Temporada, Ligas, Amigos y el
  mapa de actividad.
- Texto desfasado corregido: "Acéptalo desde el Planificador" → Amigos.

### Tanda siguiente (30 sept 2026)
- **Estados libres en Comunidad** (`PublicarEstado`, `publicarEstadoAction`,
  `borrarEstadoAction`): `activity` tipo "status" sin juego
  (`activity.gameId` ya admite null; `getFeed` hace leftJoin). Filtro de
  lenguaje, límite `estado` (5 cada 10 min), el autor puede borrarlos. La
  API móvil los filtra: la app Android espera `game` siempre.
- **Maratón/Noctámbulo** contaban trofeos y una importación con 230 logros
  en el mismo segundo los daba: ahora cuentan instantes distintos. Maratón
  retirada a ethann19 y anhalian (no lo cumplían con la regla buena).
- **Efecto del nombre** (`lib/efectosNombre.ts`, `user.efectoNombre`,
  clase `.nombre-efecto` en globals.css): degradado animado ganado por
  insignia o nivel (Dorado, Aurora, Platino, Neón), en lugar de "colores
  desbloqueables", que no tenían sentido con el color libre.
- **Idioma**: ya no quedan `"es-ES"` fijos en pantallas, salvo a propósito
  la imagen OG, la firma (etiquetas en español) y el admin.

**Pendiente:** el menú de Ajustes (`AjustesNav.tsx`) y `NAV_OCULTABLE`/
`PANEL_OCULTABLE`/`CATEGORIAS_AVISO` tienen etiquetas fijas en español;
partir `actions.ts` y `profiles.ts`. "Retos semanales entre
amigos" ya existe como clasificación semanal/mensual en /amigos; darle
ganador exige decidir contra qué grupo gana cada uno (cada cual tiene
amigos distintos).

- **Truco para scripts con `server-only`**: `npx tsx --conditions=react-server
  script.mts` carga el módulo vacío de `server-only` (como hace Next), sin
  tener que comentar el import a mano. En local con Avast, anteponer
  `NODE_EXTRA_CA_CERTS="C:\ProgramData\Avast Software\Avast\wscert.pem"`
  a cualquier script que haga peticiones HTTPS.
