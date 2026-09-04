# Paragon — traspaso

Estado del proyecto y de la sesión de trabajo, para retomarlo sin tener que
releer todo el historial. Última actualización: **4 de septiembre de 2026**
(sesión larguísima, con Antigravity trabajando en paralelo todo el rato).

---

## Sesión del 4 de septiembre de 2026 — estilos globales, Descubrir y compartir

Sesión iterativa, a base de peticiones cortas sucesivas ("las cards con
hover", "el filtro no filtra", "que se muevan como en la landing"...). Lo
agrupo por tema en vez de en orden cronológico.

### Estilo de la app, no solo color
- **Sistema de "Estilo"** (`lib/apariencia.ts`, `AppearanceSettings.tsx`,
  antes un desplegable en la navbar — ahora en **`/ajustes/apariencia`**,
  porque con 8 estilos + 5 acentos + color libre + 4 temas ya no cabía en un
  menú de 224px). Es un eje aparte del modo (claro/oscuro/OLED/contraste) y
  del acento: cambia radio de esquina, sombra, tipografía y hasta el fondo
  de **toda la página**, no solo el color de los botones. 8 pieles:
  Clásico, Terminal (monoespaciada, líneas CRT), Vidrio (cristal
  esmerilado), Brutalista (sin esquinas, sombra dura), y cuatro
  "ambientadas" en PS5/Xbox/Steam/Switch con fondo propio incluido. Técnica:
  selectores `[class*="rounded"]`/`[class*="shadow"]` con CSS sin `@layer`
  en `globals.css` — le gana a las utilidades de Tailwind (que sí van en
  `@layer utilities`) sin tocar componente a componente. "Temas" son combos
  de un clic (modo + acento + estilo).
- **Color de acento libre** (`<input type="color">`) además de los 5
  presets — se guarda como variable CSS suelta (`--accent-rgb`), no como
  clase, y el script anti-parpadeo de `layout.tsx` lo aplica antes de
  pintar para que no destelle azul en cada carga.
- **Marcos de avatar**: de 3 a 6, cada uno con movimiento propio (pulso,
  giro, barrido de luz — no solo otro gradiente). Nivel real exigido en
  servidor (`FRAME_REQUISITOS` en `lib/level.ts`, comprobado en
  `/api/profile/update`), con vista previa en vivo en `/ajustes`.
- **Banners "de plataforma"** (`BannerPresets.tsx` /
  `lib/bannerPresets.ts`): arte propio en SVG con el lenguaje visual de
  PS5/Xbox/Steam/Switch/Retro/Paragon — **no fotografía oficial**, que tiene
  derechos y no hay banco de imágenes del que tirar. Se guardan como
  `"preset:<clave>"` en el mismo `profileBannerUrl` de siempre, sin columna
  nueva.
- **Hover universal** (`globals.css`, junto al bloque de Estilo): regla
  global por etiqueta/patrón (`button`, `a[class*="rounded"]`,
  `[class*="cursor-pointer"]`) que da resplandor + levantamiento a
  cualquier botón o tarjeta de toda la app, incluidos los que no existen
  todavía — pedido varias veces y arreglado cada vez componente a
  componente, así que esta vez es una red de seguridad, no un parche más.
  Se salta a propósito lo que ya tenga su propio `hover:scale-*`/
  `hover:-translate-*` (estrellas, tarjetas con tilt 3D) para no pisarlo.

### La trampa nueva de esta sesión: `overflow-hidden` se come el propio hover
Un elemento con `overflow-hidden` **recorta su propio `filter`** (el
resplandor de hover es `filter: drop-shadow`) — así que cualquier tarjeta
que llevara `overflow-hidden` en el mismo `<Link>` que declaraba el hover
(para recortar la carátula a las esquinas redondeadas) se quedaba sin
resplandor ni levantamiento, en silencio, sin error. Pasó en
`DiscoverCard.tsx` y en las tarjetas de "Para ti" de `/descubrir`. Arreglo:
el recorte va en la carátula interior (que ya tenía su propio
`overflow-hidden`, con `rounded-t-*` a juego), el `<Link>` exterior se
queda libre. `GameCard.tsx` ya estaba bien construido así desde antes —
mirar ahí si hace falta el patrón otra vez.

### Biblioteca: filtros de verdad, no solo visuales
- **"Más filtros" colapsable**: los 6 desplegables + "Agrupar por empresa"
  vivían siempre visibles, aunque nadie los tocara — mucho ruido para poco
  uso. Ahora solo Estado y Plataforma están siempre a la vista; el resto se
  esconde detrás de un botón con contador.
- **Bug real de filtrado**: escribir en el buscador dejaba tarjetas
  "fantasma" en pantalla — el contador decía "5 resultados" y se veían 27.
  Causa: `AnimatePresence mode="popLayout"` + `whileInView` (que solo anima
  al entrar en el viewport) no se llevan bien con filtros que cambian
  rápido (cada tecla es un filtro nuevo antes de que la animación de salida
  de la anterior termine) — con una biblioteca de 200+ juegos, siempre
  reproducible. Se quitó `AnimatePresence` de esa lista: sin animación de
  salida, pero correcto siempre, que es lo que importa en un filtro.
- **"Al 100%" no filtraba nada**: por la regla ya documentada ("100% de
  Steam cuenta como platino"), casi cualquier juego al 100% cae en estado
  `platinado`, no `completado` — esa categoría estaba casi siempre vacía.
  `filterGames` (`lib/stats.ts`) ahora trata "Al 100%" como el propio
  `progressPercent === 100`, no como esa categoría derivada.

### Navbar recortada
9 enlaces + "Admin" en una sola fila se apretaban en pantallas medianas.
Los 5 más usados se quedan sueltos; Descubrir/Noticias/Planificador/Rankings
van detrás de un "Más" (`MenuMas` en `Header.tsx`, mismo patrón que "Más
filtros"). Admin ya no es un enlace de texto: es un icono de escudo junto
al propio avatar, solo para `esDesarrollador`.

### Guías de trofeo: sin scraping
`TrophyGuideModal` gana una pestaña "Guía escrita" junto a la de vídeo. Se
probó primero rasparlo (mismo mecanismo que ya usa la búsqueda de vídeo en
YouTube) contra DuckDuckGo — **bloqueado con un desafío anti-bot a la
primera petición**; Bing, degradado igual. En vez de algo frágil que se
rompería en producción, son enlaces reales a una búsqueda de Google (con
`site:` a Vandal/Meristation/3DJuegos como atajos), sin incrustar nada.

### PWA e iOS: dos bugs de "no me deja descargar"
- **El manifest estaba roto**: `layout.tsx` tenía un
  `<link rel="manifest" href="/manifest.ts">` a mano, y esa ruta **da
  404** — Next sirve el manifest de verdad en `/manifest.webmanifest` y lo
  enlaza solo si se lo pides por `metadata.manifest`, no con un `<link>`
  suelto. Sin manifest legible, "Añadir a pantalla de inicio" no aparece en
  ningún sitio. Arreglado en `metadata` (`layout.tsx`), más
  `appleWebApp`/`icons.apple` porque **iOS ignora los iconos del
  manifest** y solo mira `apple-touch-icon`.
- **Compartir el Wrap no descargaba nada en iPhone**: era un
  `<a download="...">`, y **Safari en iOS ignora el atributo `download`**
  (limitación de WebKit, no un fallo de la app) — abría la imagen sin más.
  Arreglado con la Web Share API (`CompartirImagen.tsx`, genérico —
  también lo usa la tarjeta de platino): en iOS abre la hoja de compartir
  nativa (con "Guardar imagen" de verdad); en escritorio cae a la descarga
  clásica por blob.

### Descubrir ampliado
- **Tendencias, Joyas Ocultas, Por género y buscador global** añadidos a lo
  que ya había (recomendado por biblioteca). `lib/discover.ts`, nuevo.
  "Tendencias" necesitó columna nueva **`user_game.createdAt`**
  (`scripts/anadir-createdat-user-game.mts`, **ya ejecutada** — antes solo
  existían `lastPlayedAt`/`trophiesSyncedAt`, que no dicen lo mismo). Las
  filas de antes de la migración quedaron todas con la misma fecha, así
  que Tendencias no dirá nada útil hasta que pase un tiempo de uso real —
  a propósito, mejor que inventar una fecha que no se puede saber.
  "Joyas Ocultas" (nota ≥4.5, ≤20 propietarios) sale vacía casi siempre
  ahora mismo — con 5 usuarios reales apenas hay solapamiento de votos, es
  esperable, no es un fallo.
- **Movimiento tipo landing**: las filas horizontales de Descubrir usan el
  mismo `.animate-marquee` que ya tenía la landing para el estante de
  muestra — se desplazan solas y se paran al pasar el ratón. `FilaHorizontal`
  ahora duplica el contenido internamente para el bucle sin corte.
- **Buscador global de IGDB** (`DiscoverSearch.tsx`) reutiliza
  `/api/games/search` y `addToWishlistAction`, que ya existían — nada
  nuevo del lado del servidor.

### Compartir y noticias
- **Tarjeta de platino compartible** (`/api/trophy-card/[handle]/[gameId]`,
  `ImageResponse` igual que el Wrap): carátula, horas, rareza del platino
  con su etiqueta de dificultad, trofeos. Botón en la ficha del juego
  cuando `progress.platinumEarned`. Pendiente de que el usuario dé el visto
  bueno al diseño.
- **Noticias de PlayStation** en el panel (`PsNewsFeed.tsx` +
  `lib/psNews.ts`), con `rss-parser` — estaba en `package.json` sin usarse
  en ningún sitio. Fuente: blog oficial de PlayStation. **Aviso**: la PS
  Store no publica un feed público de ofertas/precios, así que esto es
  "noticias" (lanzamientos, PS Plus), no un rastreador de precios — si se
  quiere lo segundo de verdad, no hay fuente pública para PSN (mismo motivo
  que ya vale para el comparador de Steam).

### Ofertas y PS Plus en Descubrir (más tarde el mismo día)
- **Bug de datos real en el comparador de precios**: `TIENDAS` en
  `lib/prices.ts` (los nombres de tienda de CheapShark) estaba
  desactualizado — comprobado contra `GET /stores` de la propia API, varios
  ids señalaban a la tienda equivocada (23 decía "GamesPlanet" y es
  GameBillet; 27 decía "Gamesload" y es Gamesplanet; 28 decía "IndieGala" y
  es Gamesload; 30 decía "Voidu" y es IndieGala). Peor: había un **31
  "Xbox Store" y un 33 "PlayStation Store" que nunca han existido en
  CheapShark** — esa API no rastrea tiendas de consola, solo PC. El 33 real
  es DLGamer (inactiva); el 31, Blizzard Shop. Corregido con la lista real.
  No parece haber roto nada visible (esos ids casi nunca salían en una
  comparativa de verdad), pero de haber salido el 33 habría hecho pensar
  que Paragon tiene precios de PSN, que no los tiene en ningún sitio.
- **`ofertasSteam()`** (`lib/prices.ts`): escaparate general de "lo que
  está de oferta ahora" en Steam vía CheapShark, distinto de
  `comparativaPreciosSteam` (que compara un juego concreto). Sección
  "💰 Ofertas en Steam" en Descubrir.
- **PS Plus — juegos del mes** (`lib/psPlus.ts`): el blog de PlayStation
  tiene un feed etiquetado real y vivo,
  `blog.playstation.com/tag/ps-plus/feed/`, que sí trae el anuncio mensual
  (filtrado por "Monthly Games" en el título, que es estable). No es un
  catálogo navegable, es el anuncio con enlace al post — no hay API pública
  de Sony para el catálogo en sí.
- **Se probó y descartó "ofertas en PS Store"**: los tags del blog
  `sale`/`sales`/`deals`/`discounts`/`ps-store` existen pero llevan sin
  publicar nada desde 2020-2023 — no hay fuente pública viva. No se
  construyó nada ahí a propósito, en vez de inventar un dato que no existe.
- **Verificación incompleta**: se probó todo por `curl` directo contra las
  APIs reales (CheapShark, el feed de PS Plus) antes de escribir el código,
  pero no se pudo confirmar en el navegador — el `npm run dev` que llevaba
  toda la sesión corriendo se había parado, y un servidor nuevo levantado
  para probar dio `UNABLE_TO_VERIFY_LEAF_SIGNATURE` en **todo** fetch
  saliente (CheapShark, el blog de PS, IGDB) — un problema de certificado
  TLS del entorno de ese proceso concreto, no del código. Si vuelve a pasar
  al levantar un dev server desde fuera de una terminal normal, es esto.

### Bugs ajenos, arreglados de paso (no se tocó su lógica, solo lo roto)
Todo esto es de Antigravity, encontrado porque rompía el build o la app en
runtime mientras se trabajaba en otra cosa al lado — no se ha revisado el
resto de su trabajo en profundidad:
- `ParagonWrap.tsx`: `reduce()` sobre un array vacío cuando la biblioteca
  es solo deseados (`Reduce of empty array with no initial value`).
- `/offline`: le faltaba `"use client"` con un `onClick` dentro de un
  Server Component — 500 en esa ruta.
- `lib/ratings.ts`: un comentario JSDoc sin abrir a medio guardar, rompía
  la compilación entera.
- `juego/[id]/page.tsx` y `lib/recommendations.ts`: tipos desalineados con
  la unificación por `igdbId` que Antigravity dejó a medias (`steamId` en
  `GlobalGame`, `ownsGame` devolviendo el id específico en vez de un
  booleano, `sql<string[]>` declarado sobre una columna que en realidad
  sale como `string`).
- `lib/badges.ts`: catálogo de insignias **muerto**, con ids distintos
  (`first_link`, `streak_7`, `reviewer`...) a los que sí usa
  `Badges.tsx`/`checkAndGrantBadges` — cero referencias en todo el código,
  borrado. De paso: `checkAndGrantBadges` ya otorga las 9 insignias reales
  (`critico`, `sociable`, `rolero` incluidas) — está completo, no hacía
  falta migrar nada de la lista muerta.

### Lo que Antigravity construyó en paralelo sin dejarlo aquí (visto de
pasada, sin repasarlo a fondo)
- **PWA/Service Worker** (`public/sw.js`, `ServiceWorkerRegister.tsx`,
  `app/manifest.ts`, `/offline`) — el manifest estaba roto, ver arriba; el
  resto no se ha auditado.
- **`igdbId` en `games` + scripts de unificación**
  (`scripts/anadir-igdbid-juegos.mts`, `scripts/unificar-catalogo.mts`) —
  el punto 1 de "Pendiente" de más abajo parece que ya está en marcha o
  hecho, no solo "sin tocar" como decía este documento. **Sin confirmar si
  esos scripts ya se ejecutaron contra producción** — comprobar antes de
  asumir que `games.igdbId` está poblado de verdad.
- `/descubrir` original (solo recomendaciones por género) y el panel de
  `/admin` con más métricas.

---

## Sesión del 3 de septiembre de 2026 (tarde) — personalización de perfil

Pedido: "más personalización del perfil y del estilo visual". Antes de tocar
nada se comprobó qué había ya (bastante — ver la tabla de arriba, gran parte
lo construyó Antigravity en paralelo sin dejarlo en este documento) y solo se
cerraron los huecos reales:

- **Bug corregido**: `/api/upload` escribía siempre en `users.image` sin
  mirar si la subida era de avatar o de banner — subir un banner pisaba la
  foto de perfil en silencio. Ahora manda un campo `kind` y actualiza la
  columna correcta.
- **`ThemeCustomizer`** (icono de arriba a la derecha): color de acento
  libre (`<input type="color">`, se guarda aparte de los 5 presets) y una
  sección "Temas" con combos de un clic (modo + acento juntos).
- **`users.theme`**, que existía sin usarse, ahora decide el modo (oled,
  alto contraste...) del **perfil público** de cada uno — aplicado solo al
  contenedor de `/u/[handle]`, no afecta al modo del visitante en el resto
  del sitio.
- **`profileFrame` (marco del avatar) ahora se comprueba de verdad**: el
  desplegable decía "Nivel 10+/50+/100+" pero nada lo exigía. Ahora
  `FRAME_REQUISITOS` (`lib/level.ts`) se valida en el servidor
  (`/api/profile/update`) contra el nivel real (`getParagonLevel`).
- **Banner con vídeo** (mp4/webm, detectado por extensión) y **parallax**
  simple en banners de imagen (`background-attachment: fixed`, solo
  escritorio — clase `.perfil-banner-parallax` en `globals.css`).
- **Títulos sugeridos por insignia ganada**: chips bajo el campo de título
  en `/ajustes`, rellenan el input con el nombre de una insignia que ya
  tienes (`BADGE_DEFINITIONS` de `Badges.tsx`, ahora exportado). Sigue
  siendo texto libre — no hay otorgado automático que lo fuerce.
- **Orden de secciones del perfil, arrastrable** (`Reorder` de
  framer-motion, que ya estaba instalado — sin dependencia nueva). Columna
  nueva `users.profileSectionOrder` (jsonb), migrada con
  `scripts/anadir-orden-secciones-perfil.mts` (mismo patrón que las demás:
  SQL explícito, no `db:push` — **ya ejecutado contra producción**).
  `lib/profileSections.ts` tiene las claves y el orden por defecto;
  `normalizeSectionOrder()` rellena con lo que falte si se añade una
  sección nueva más adelante.

No tocado a propósito: el sistema de auto-otorgado de insignias
(`checkAndGrantBadges` en `lib/profiles.ts`) ya existe y sí otorga de verdad
(primer platino, 10/50/100 platinos, 100+ juegos, madrugador) — pero no se
tocó su lógica, solo se reutilizó para sugerir títulos.

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

**Regla:** cuando conectes un dato nuevo, compruébalo **en la base y en
pantalla**, no solo que compile. Y si un agente edita con scripts de
sustitución de texto, que verifiquen que el patrón casó — un `print("ok")`
incondicional me costó una hora depurando un cambio que nunca se escribió.
Y si el dato viene de una API externa con una forma "obvia", compruébalo
contra la API de verdad antes de escribir el arreglo — la forma obvia fue la
que causó el bug de las horas de PSN la primera vez.

---

## Qué se hizo en esta sesión

### Bugs de datos reales (no solo visuales)
- **Horas de PSN mal atribuidas entre versiones de un mismo juego** —
  arreglado de verdad en `psn/client.ts` (`repartirHoras`), con backfill
  (`scripts/resincronizar-horas-psn.mts`) sobre las cuentas ya vinculadas.
  Ver la trampa de arriba: el primer intento de arreglo fue insuficiente.
- **Horas sumadas entre plataformas distintas** (Steam + PSN del mismo
  juego) para "tu juego más jugado" — `gruposPorTitulo()` en `lib/stats.ts`,
  usado en el Wrap y su ranking.
- **Un 100% de Steam cuenta como platino** en todos los recuentos (biblioteca,
  insignias, XP de nivel Paragon, navbar) — `esPlatinoEquivalente()`.
  Backfill de insignias con `scripts/recalcular-insignias.mts`.
- **Deseados ya no cuentan como juegos** de la biblioteca en ningún recuento.
- **Feed de actividad sin duplicados**: valorar/reseñar actualiza la
  actividad existente en vez de amontonar una nueva cada vez. Limpieza con
  `scripts/limpiar-actividad-duplicada.mts`.
- **Fuga de conexiones a Postgres** (`src/db/index.ts`) que causaba 500 en
  producción y lentitud acumulada — la conexión no se cacheaba en
  producción, así que cada acceso al proxy `db` abría un cliente nuevo.
- **Foto de perfil inconsistente**: navbar, reseñas, ligas y feed leían la
  imagen de tres formas distintas (con o sin el avatar de PSN). Unificado
  con `resolveAvatarUrl` (TS) y `avatarUrlSql` (SQL, en `lib/avatarSql.ts`).

### Funciones nuevas
- **Comparación en grupo** (`/comparar`, sin handle): elige 2+ amigos desde
  `/amigos` con checkboxes (formulario GET nativo, sin JS) y compara a todos
  a la vez. `sharedGames()` (`lib/stats.ts`) ya aceptaba N bibliotecas.
- **Filtros de búsqueda + plataforma** en ambos comparadores
  (`FiltroJuegosComunes`, `CompararFiltrable`) y **filtro de horas jugadas**
  en la biblioteca (con sus tramos: sin horas / <10h / 10-50h / 50-100h / 100h+).
- **Ranking del Wrap**: cada tarjeta (género, juego más jugado, trofeos del
  año) enlaza a `/u/[handle]/wrap/[horas|trofeos|generos]`, la lista entera
  con filtro de fecha (real para trofeos/géneros; para horas, filtra qué
  juegos entran, no recalcula — las plataformas no dan horas por fecha).
- **Nivel Paragon corregido**: el platino no sumaba al total en la tarjeta
  del perfil, y la navbar tenía su propia implementación paralela que
  contaba distinto (y sin Steam al 100%). Ahora las dos coinciden.
- **Dificultad votada por la comunidad** (1-5 estrellas, `game_difficulty_vote`),
  junto a la dificultad estimada por rareza — dos señales, no una.
- **Reseñas unificadas a 5 estrellas** (antes había dos escalas — 1-5 en la
  biblioteca, 1-10 en la reseña express — mezclándose en la misma columna).
- **Recomendaciones de trofeo mejoradas**: priorizan el juego base sobre DLC
  (el platino nunca depende de expansiones), y desde la tarjeta se puede
  anclar el trofeo, ver la guía en vídeo o ir a las guías escritas.
- **Guías escritas, como un foro** (`/juego/[id]/guias`): hilos con
  respuestas, tablas `game_guide`/`game_guide_reply`. Distinto de la reseña
  (nota + 4 líneas) y del vídeo de un trofeo suelto (automático, no lo
  escribe nadie de aquí).
- **Comparador de precios** (`/juego/[id]`, solo Steam): CheapShark, sin
  clave pero exige `User-Agent` descriptivo. No hay fuente pública
  equivalente para PSN — se dice así en la pantalla, no se oculta.
- **Panel de admin** (`/admin`), gateado a `profile.esDesarrollador` (un
  correo hardcodeado en `profiles.ts`, nunca expuesto — solo un booleano):
  métricas de toda la plataforma, sincronizaciones recientes de todos los
  usuarios, tabla de usuarios.
- **Insignia "Desarrollador"** visible en tu propio perfil, mismo mecanismo.
- **Menú de navegación en móvil**: el `<nav>` de escritorio estaba
  `hidden sm:flex` sin alternativa — no había forma de llegar a Comunidad,
  Noticias, Ligas, etc. desde un móvil. Botón de hamburguesa + panel.
- **Todos los desplegables con la misma estética**: había dos componentes
  (`Dropdown`, `CustomSelect`) con estilos distintos, y el planificador
  usaba un `<select>` nativo suelto. Unificados los tres.
- Regla de diseño del usuario, guardada en memoria: **todo botón necesita
  estado hover visible**.
- Renombrado "Rivales" → "Amigos" en toda la app.

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
1. **`igdbId` en `games` + emparejado.** ~~Sigue sin tocar~~ → Antigravity
   parece haberlo empezado por su cuenta (`scripts/anadir-igdbid-juegos.mts`,
   `scripts/unificar-catalogo.mts`, y `community.ts`/`recommendations.ts` ya
   asumen `games.igdbId` poblado). **Sin confirmar si esos scripts se
   ejecutaron contra producción** — compruébalo antes de dar por hecho que
   el campo está relleno de verdad, y antes de escribir código nuevo que
   dependa de él sin comprobarlo.
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

**Para que el cron funcione en producción hacen falta tres cosas:** subir
`vercel.json` y la ruta, poner `CRON_SECRET` en las variables de Vercel, y
redesplegar. El plan Hobby limita los crons a **una ejecución diaria**; el
`vercel.json` pide una por hora, así que si estás en Hobby hay que bajarlo a
`0 3 * * *` y subir los lotes por pasada.

**Migraciones:** la tabla `notification` se creó con SQL explícito
(`CREATE TABLE IF NOT EXISTS`), no con `db:push`, para no darle a una
herramienta la ocasión de proponer cambios sobre una base de producción.
Recomendado seguir así con lo aditivo. Mismo patrón para las tablas de
`game_difficulty_vote` y `game_guide`/`game_guide_reply`: scripts en
`scripts/crear-*.mts`, ya ejecutados contra producción. Igual para columnas
sueltas: `users.profileSectionOrder`
(`scripts/anadir-orden-secciones-perfil.mts`) y `user_game.createdAt`
(`scripts/anadir-createdat-user-game.mts`, para "Tendencias" en Descubrir),
**ambas ya ejecutadas contra producción**. Sin confirmar si
`scripts/anadir-igdbid-juegos.mts` y `scripts/unificar-catalogo.mts` (de
Antigravity) llegaron a correrse — ver el punto 1 de "Pendiente".

**CheapShark** (comparador de precios) no necesita clave, pero desde hace
poco exige un `User-Agent` descriptivo o devuelve un error genérico —
ya está puesto en `lib/prices.ts`, no hace falta variable de entorno nueva.
