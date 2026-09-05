# Paragon — traspaso

Estado del proyecto y de la sesión de trabajo, para retomarlo sin tener que
releer todo el historial. Última actualización: **5 de septiembre de 2026**
(continuación directa de la sesión larguísima del día 4, con Antigravity
trabajando en paralelo todo el rato — más abajo hay un aviso de qué tocó él).

---

## Sesión del 5 de septiembre de 2026 (continuación 3) — PS Plus real, Steam por rareza, dificultad a 10

- **PS Plus mostraba juegos que ya no eran los reales**: `lib/psPlus.ts`
  tenía un HARDCODE (de una sesión anterior, comentario "el feed está
  devolviendo el mes viejo, forzamos estos mientras tanto") con 3 nombres
  fijos de "septiembre" que se había quedado así, indistinguible en pantalla
  de un dato real. Restaurada la lectura de verdad del feed
  (`blog.playstation.com/tag/ps-plus/feed/`, dinámica, la que ya funcionaba
  en una sesión previa). Aviso real de paso: el feed en sí lleva parado
  desde marzo de 2026 (comprobado a mano) — Sony no ha publicado el anuncio
  mensual desde entonces. Como no hay forma de saber el catálogo vigente sin
  ese post, se enseña el último real (marzo) con su fecha, y un aviso en
  pantalla si tiene más de ~40 días — nunca se vuelve a inventar un mes.
- **Nivel Paragon: Steam ahora pesa por rareza, no plano**. La sesión
  anterior había puesto los logros de Steam al peso fijo de bronce (10 XP
  cada uno) para que dieran algo de XP — el usuario pidió que fuera "en base
  al % de gente que lo tiene", como ya hace Paragon Score
  (`trophyScore.ts`/`xpSteamPorRareza`, ahora exportada). Se añadió
  `Game.steamTrophyXp` (calculado en `getLibrary`, lib/profiles.ts, con una
  sola consulta agrupada por juego — no una por fila) y se cambiaron **los
  dos sitios que calculan el nivel por separado**
  (`lib/level.ts`/`paragonProgress` y `lib/paragonLevel.ts`/`getParagonLevel`,
  la navbar) para sumar esto en vez del peso plano.
- **Dificultad estimada, de 1-6 a 1-10**: se probó sacarla de una API o por
  scraping antes de tocar nada (PSNProfiles es la referencia real de
  "dificultad sobre 10" entre cazadores de trofeos) — bloqueado por un reto
  de Cloudflare en la primera petición (comprobado a mano, `curl` devuelve
  la página "Just a moment..."), mismo bloqueo exacto que ya tumbó el
  scraping de Epic/DuckDuckGo/Bing en sesiones anteriores. Sin API pública
  tampoco (ni IGDB, ni RAWG, ni IsThereAnyDeal tienen dificultad). En vez de
  eso, `lib/difficulty.ts` reparte la MISMA rareza real (dato nuestro) en 10
  tramos en lugar de 6, para poder enseñarla como "X/10" igual que esas
  webs, sin depender de terceros. Cambiado también el filtro de dificultad
  de la biblioteca (`LibraryGrid.tsx`) para incluir el número en la
  etiqueta — con 10 tramos, dos niveles seguidos pueden compartir nombre
  ("Muy difícil" es el 7 y el 8), y antes de este aviso el desplegable no
  los distinguía.

**Hallazgo aparte, sin tocar**: la consola del navegador muestra un error de
hidratación de React en TODAS las páginas probadas, incluidas las que no se
tocaron hoy (`/noticias`) — no es un bug de esta sesión, ya estaba antes.
Anotado como tarea aparte en vez de mezclarlo con esto (`task_9310785c`).

Verificado en el navegador contra un perfil real (`fende21`): la ficha de
Assassin's Creed Unity (1,1% de rareza) sale "Muy difícil" con 8/10 barras,
Black Myth: Wukong (6,0%) sale "Difícil" con 5/10 — la escala nueva
distingue casos que antes caían en el mismo cajón de 6.

---

## Sesión del 5 de septiembre de 2026 (continuación 2) — 4 correcciones pedidas directamente por el usuario

- **Bug real en "Logros de Paragon"** (`ParagonAchievements.tsx`): el contador
  de arriba (`4/6` o lo que sea) salía de `earnedIds.length` — el total de
  TODAS las insignias que tiene el usuario en la base (incluidas otras que
  ni se enseñan aquí, como "crítico"/"sociable"), no de cuántas de las 6 que
  se pintan están conseguidas de verdad. Con el número exacto de insignias
  ajenas coincidiendo por casualidad, salía "6/6" con solo 4 tarjetas en
  verde. Arreglado calculando el total a partir del mismo booleano `earned`
  que ya pinta cada tarjeta. De paso, "Experto"/"Leyenda"/"Cazador"/"Primera
  joya" contaban solo platino real de PSN (`g.earned?.platinum`) — no el
  100% de Steam, que `checkAndGrantBadges` (lib/profiles.ts) sí cuenta desde
  hace tiempo vía `esPlatinoEquivalente`. Ahora las tarjetas usan la misma
  función, así que el progreso que enseñan coincide con lo que de verdad
  hace falta para la insignia.
- **Añadir/quitar de una carpeta desde la ficha de juego** (`/juego/[id]`):
  antes `CollectionPicker` solo vivía en `/u/[handle]/[gameId]` (tu propia
  fila de biblioteca). Añadido también en la ficha global, cuando el juego
  ya está en tu biblioteca (usa `ownsGame()`, que ya existía, para resolver
  el `games.id` concreto) — mismo componente y misma acción
  (`toggleGameCollectionAction`) que ya vale para las dos cosas, añadir y
  quitar son el mismo botón.
- **Nivel Paragon ahora cuenta trofeos de Steam** (antes solo contaba
  metales de PSN + el bonus de "platino" al 100% de Steam; un logro suelto
  de Steam sin llegar al 100% no daba XP). Se cuentan al peso de bronce (10
  XP), el escalón más bajo de PSN — sin dato de rareza como sí tiene
  `paragonScore.ts` (que sigue siendo una cifra aparte, sin tocar). Cambiado
  en **los dos sitios que calculan esto por separado**
  (`lib/level.ts`/`paragonProgress` y `lib/paragonLevel.ts`/`getParagonLevel`,
  que usa la navbar) — el mismo historial de desincronización que ya avisaba
  este documento, así que se tocaron los dos a la vez, con la misma regla.
- **Planificador con más sustancia**: antes adivinaba qué carpeta era "el
  plan" por su nombre (regex contra "plan"/"objetivo"/"platino" — una
  carpeta con otro nombre no se enteraba de nada). Ahora se elige a mano con
  un desplegable (cualquier carpeta vale). Añadido resumen real (juegos en
  el plan, logros pendientes, progreso medio), un "Siguiente objetivo"
  destacado (mismo lenguaje que "A un paso del platino" del panel, pero
  sobre esta lista) y quitar del plan sin salir de la página
  (`toggleGameCollectionAction`, reutilizada). `CarpetasManager` (gestión
  completa de carpetas, ya construida en una sesión anterior) sigue debajo
  tal cual.

Sin verificar en el navegador logueado (sin credenciales en este entorno,
mismo motivo de siempre) para el planificador y la carpeta en la ficha de
juego — sí verificado el bug de logros y el nivel de Steam contra un perfil
real (`fende21`) sin sesión propia.

---

## Sesión del 5 de septiembre de 2026 (continuación) — bug real en la importación de Antigravity, pestañas en panel/perfil, Wrap en Stories

### Bug real en `ImportLibraryModal`/`actions/import.ts` (de Antigravity)

Al revisar lo que Antigravity construyó en paralelo (importar biblioteca
desde CSV de Playnite/GOG, ya comiteado): Steam/PSN/Xbox/Google tienen
sincronización real en Paragon (`platformAccounts` + cron), con su propio
`nativeId` (appid/trophyId real). El CSV los creaba con un `nativeId`
inventado (el `igdbId` de IGDB) — una fila que nunca recibe logros y que,
si el usuario ya tiene o más tarde vincula esa cuenta de verdad, queda
duplicada junto a la real, en silencio. Arreglado enrutando esas cuatro
plataformas a `"manual"` en el propio `importGamesAction` (igual que ya se
hace con Epic/Ubisoft, que tampoco sincronizan biblioteca). De paso,
`"manual"` ahora sigue de verdad su convención de `nativeId`
(`<igdbId>:<dispositivo>`, ver la tabla de decisiones más abajo) en vez de
un id sin sufijo de dispositivo — `manualGames.ts`/`notifications.ts` ya
asumían ese formato al hacer `nativeId.split(":")`.

### Panel y perfil: pestañas, no todo en un solo scroll

El usuario reportó feedback de un amigo: la interfaz se ve caótica,
sobre todo el panel (portada logueada, `/`) y la biblioteca (perfil,
`/u/[handle]`) — ambas apilaban entre 7 y 10 secciones en un único scroll
largo. `SectionTabs.tsx` (nuevo, cliente, recuerda la última pestaña por
`localStorage`) las agrupa sin tocar ninguna sección por dentro:
- **Panel** (`app/page.tsx`): "Resumen" (stats, historial mensual, misiones
  semanales, recomendaciones) / "Progreso y actividad" (a un paso del
  platino, juegos parados, próximos lanzamientos, jugado recientemente,
  feed de actividad).
- **Perfil** (`u/[handle]/page.tsx`): "Resumen" (wrap, stats, nivel,
  logros, vitrina, favoritos) / "Biblioteca" (colecciones, el grid de
  juegos de verdad). Se mantiene intacto el sistema de reordenar secciones
  de `/ajustes` (`profileSectionOrder`) — solo se separan las dos secciones
  pesadas (colecciones + biblioteca) del resto, no se aplana todo junto.

Pendiente si sigue viéndose recargado: la ficha de juego (`/juego/[id]`) y
Descubrir fueron las otras dos zonas candidatas que no se tocaron esta vez
(el usuario priorizó panel + biblioteca).

### Wrap ampliado en formato Stories (1ª de las 3 ideas pendientes)

`WrapStories.tsx` (nuevo): botón "Ver Wrap completo" junto al Wrap de
siempre, abre un visor a pantalla completa tipo Stories — barras de
progreso arriba que avanzan solas cada 6s, se pausan al mantener pulsado,
tocar/clicar izquierda-derecha o flechas del teclado para navegar, Esc
para cerrar (mismo lenguaje que el visor de capturas de
`ScreenshotStrip.tsx`). Ningún dato nuevo por sincronizar: reutiliza lo
que ya calculaba el resto de la app (género/juego destacado, mejor mes y
racha de `lib/history.ts`) y añade una sola pieza nueva,
`lib/wrapPercentile.ts` — "estás en el top X% mundial" de trofeos-este-año
contra el resto de usuarios reales, con un **umbral mínimo de 20 usuarios**
con algún trofeo este año antes de mostrar esa diapositiva. Ahora mismo en
producción solo hay 4 usuarios reales con trofeos este año, así que esa
diapositiva no sale para nadie todavía — es lo esperado, no un fallo (el
aviso pendiente que ya dejaba este mismo documento sobre "top X% no
significa nada con pocos usuarios"). Sin trofeos con fecha este año, una
única diapositiva honesta en vez de un carrusel de siete vacías.
Verificado en el navegador contra un usuario real (`fende21`, 253 trofeos
este año, sí navega las 6 diapositivas) y contra uno sin trofeos este año
(`mario_16`, cae en la diapositiva única).

**Pendiente de la lista de 8 ideas** (quedan 2 sin construir): Retos
semanales (falta decidir a mano vs generador automático) y el webhook de
Discord para anunciar logros (alternativa real al Rich Presence, que no es
posible sin app de escritorio).

---

## Sesión del 5 de septiembre de 2026 — Epic cerrado, rendimiento, y 3 funciones nuevas (Ruleta, banner, Paragon Score)

### Epic Games — CERRADO: vinculación real, logros descartados de verdad

Continuación de lo que dejó Antigravity en `auth.ts` (proveedor OAuth +
`linkEpicOAuthAction` + `LinkEpicForm` ya conectado al botón). Se probó de
punta a punta con una cuenta real, con estos resultados:

**Vinculación: funciona de verdad.** Se arreglaron 4 bugs reales, cada uno
encontrado probando en vivo, no leyendo documentación:
1. **Bug de sesión** — `signIn("epic", ...)` sin un callback que comprobara
   si ya había sesión abierta hacía que Auth.js **creara un usuario de
   Paragon nuevo y cambiara la sesión a él** al vincular Epic (el mismo
   mecanismo de login que Google/Discord, mal usado para "vincular una
   cuenta más"). Arreglado con un callback `signIn` en `auth.ts`: si el
   proveedor es `epic`, escribe en `platformAccounts` contra el usuario que
   YA tiene sesión y devuelve la URL de vuelta a `/ajustes/plataformas` en
   vez de `true`/`false` (`false` a secas siempre lanza "AccessDenied" en
   Auth.js, aunque el enlace haya ido bien — hay que devolver un string).
2. **El endpoint de token de Epic no cumple RFC 6749 §2.3.1** — con un
   secret que lleve `+` o `/`, la cabecera Basic estándar (percent-encode
   antes de pasar a base64) hace que Epic la rechace con
   `invalid_client_credentials`, aunque las credenciales sean correctas
   (confirmado con un hilo del foro oficial de Epic, mismo error exacto).
   El escape oficial documentado en los tipos de Auth.js (`token.request`)
   **no está implementado de verdad** en el código que corre para
   proveedores `type: "oauth"` en la versión instalada (comprobado leyendo
   el propio `node_modules/@auth/core`). El que sí funciona de verdad es
   `[customFetch]` (el mismo mecanismo que usan los proveedores oficiales
   de Apple/Microsoft Entra ID para esto) — intercepta la petición de red
   real y reescribe la cabecera Authorization en crudo, sin el
   percent-encoding que rompe a Epic. Ver el comentario largo en `auth.ts`.
3. Tres bugs mecánicos de compilación de Antigravity editando en paralelo
   (import de `signIn` que faltaba en `actions.ts`, tipos sin `as const` en
   el proveedor de Epic, `linkEpicOAuthAction` importado dos veces en
   `Forms.tsx`) — arreglados sin tocar su intención.
4. `PlatformTiles.tsx` usaba `UbisoftIcon` sin importarlo — rompía
   `npm run build` para cualquiera. Arreglado.

**Ver los logros de Epic: descartado, investigado a fondo y probado en
vivo.**
- La API oficial de Epic no da biblioteca ni logros a terceros — solo
  `basic_profile`/`friends_list`/`presence`. Confirmado con un hilo abierto
  en el foro oficial de Epic pidiendo justo esto porque no existe.
- El método real de sitios como Exophase (confirmado por su propio
  mantenedor, foro, abr. 2022) no es una API — es la página pública de
  logros de Epic (`store.epicgames.com/u/<accountId>`, con niveles de
  privacidad Public/Friends/etc., anuncio oficial "My Achievements Update"
  abr. 2022). **Se comprobó en vivo con una cuenta real**: la página existe
  y tiene los datos reales (se vieron en el navegador, sin ni siquiera
  sesión propia). Pero una petición de servidor normal (`fetch` sin
  navegador) recibe el reto anti-bot de Cloudflare, no el contenido —
  mismo bloqueo exacto que ya tumbó el scraping de DuckDuckGo/Bing para las
  guías de trofeo. Haría falta un navegador headless completo corriendo en
  el servidor en cada sincronización — se decidió no construirlo: pesado,
  frágil, puede romperse con cualquier cambio de Cloudflare sin avisar.
- **Conclusión**: Epic se queda como Google Play — vinculable de verdad,
  sin sincronizar biblioteca ni logros. Dicho así en el texto de
  `/ajustes/plataformas`, no como promesa de "en fase de desarrollo".

### Rendimiento

- **5 índices nuevos** en producción (`scripts/anadir-indices-rendimiento.mts`,
  ya ejecutado): `user_game`/`user_trophy` por `gameId` solo (la PK
  compuesta no servía para eso, y hay 10+ sitios que filtran así — stats de
  un juego, reseñas, recomendaciones, Descubrir...), y `activity` por
  `userId`/`gameId` (no tenía NINGÚN índice más allá de su propia PK — el
  feed de actividad escaneaba la tabla entera).
- **`unstable_cache` (5 min)** en `getGlobalStats`, `getTrendingGames`,
  `getHiddenGems` — antes se recalculaban enteros en cada visita de cada
  visitante, aunque no son datos personales de nadie.
- **Código muerto borrado**: `GameRow.tsx`, `ProgressBar.tsx` (cero
  referencias en todo el proyecto), `test-yt.js`, `award-badges.ts` (sueltos
  sin trackear desde sesiones anteriores). Sección de "Ofertas en Steam"
  duplicada quitada de `/descubrir` raíz (se quedó solo en
  `/descubrir/steam`, mismo criterio que ya se aplicó a PS Plus/noticias).

### Xbox: noticias reales

`lib/xboxNews.ts` + `/descubrir/xbox` — feed RSS oficial de Xbox Wire
(`news.xbox.com`, comprobado a mano, 10 entradas reales). Epic y Ubisoft
**no tienen esto**: la web de Epic bloquea con Cloudflare hasta su propio
feed RSS oficial (403, mismo reto anti-bot que arriba); Ubisoft no tiene
ningún RSS público descubierto (su web de noticias es una SPA sin feed).

### Funciones nuevas (de una lista de 8 ideas del usuario, analizadas antes
de construir — 3 resultaron ser trabajo ya hecho de sesiones anteriores:
fijar 3 trofeos favoritos y las guías/vídeos comunitarios de trofeos ya
existían tal cual se pedían)

- **Ruleta del Backlog** (`BacklogRoulette.tsx`, en la biblioteca, solo para
  el dueño): botón "¿A qué juego hoy?" que elige al azar entre lo sin
  empezar/abandonado/&lt;15%, con animación de tragaperras. Si el backlog
  está limpio, cae en recomendaciones por género favorito (reutiliza
  `getGameRecommendations`, sin pedir nada nuevo a IGDB).
- **Banner del juego favorito** — resultó que **ya existía casi entero**
  (`profileBackgroundGameId`, con fallback automático al primer juego de la
  biblioteca) — solo tenía una interfaz pésima: escribir el ID a mano en un
  campo de texto. Cambiado por un selector visual (`BackgroundGamePicker`
  en `ProfileForm.tsx`) con los favoritos marcados con ⭐ primero.
- **Paragon Score — puntuación unificada entre plataformas** (el problema
  real: PSN pesa por metal, Xbox por Gamerscore, Steam no pesaba nada — un
  logro cualquiera de Steam contaba igual que el más raro del juego).
  - `game_trophy.xp` (columna nueva, migración ya ejecutada) guarda el
    Gamerscore real de cada logro de Xbox — antes se descartaba al
    sincronizar (`lib/xbl/client.ts` ahora lo captura de
    `rewards[].type === "Gamerscore"`).
  - `lib/trophyScore.ts` (fórmula pura, sin `server-only` — la necesita
    tanto el servidor como `TrophyList.tsx` en el cliente) + `lib/paragonScore.ts`
    (consulta agregada por usuario, con `server-only`): PSN por su `grade`
    de siempre, Xbox por su Gamerscore real, Steam estimado por
    `rarityPercent` en tramos (nunca llega al peso de un platino entero — un
    logro suelto, por raro que sea, no equivale a completar el juego).
  - **A propósito, NO toca el nivel Paragon que ya existe** (navbar/tarjeta
    de perfil/Wrap) — ese tiene un historial real de bugs de
    desincronización entre sitios (ver la tabla de decisiones más abajo) y
    tocarlo a fondo para meter Xbox/Steam ahí era un riesgo innecesario.
    Esto es una cifra nueva y aparte.
  - Tarjeta **"Paragon Score"** nueva en `/u/[handle]/estadisticas`
    (desglose por plataforma, con el aviso de qué es dato real —PSN/Xbox—
    y qué es estimación —Steam—), y el XP de cada trofeo suelto visible en
    `TrophyList.tsx`.
  - **Verificado contra datos reales**, no solo compilado: un usuario real
    salió con 59.375 puntos (56.160 PSN / 2.810 Steam / 405 Xbox),
    coherente con sus totales de trofeos.

**Pendiente de la lista de 8 ideas** (analizadas, no construidas todavía):
- **Wrap más amplio** (formato de diapositivas tipo Stories) — la mayoría
  de los datos ya existen en algún sitio de la app, es sobre todo trabajo
  de interfaz. Aviso pendiente: "top X% mundial" no significa nada con
  pocos usuarios reales, necesita un umbral mínimo antes de enseñarlo.
- **Retos semanales** — viable, pero el coste real es el mantenimiento
  (alguien tiene que inventar 3 retos nuevos cada lunes). Pendiente decidir
  si a mano o con un generador automático antes de construir nada.
- **Discord Rich Presence** — la idea literal (ver "Playing Paragon" bajo
  el nombre de alguien en Discord) **no es técnicamente posible** sin una
  app de escritorio corriendo en el ordenador de esa persona (Rich
  Presence es IPC local con el cliente de Discord, ninguna web app externa
  puede escribirlo remotamente). La alternativa real y fácil es un webhook
  de Discord anunciando logros en un canal — mucho menos vistoso, pero
  factible hoy sin bot siquiera.

---

## Aviso: lo que Antigravity está construyendo en paralelo (visto de pasada)

Según el propio usuario, Antigravity está trabajando en **importar biblioteca
desde Playnite / GOG** como vía para Epic — encaja con el hueco ya
documentado más abajo ("Epic vinculable pero sin biblioteca real"). No se ha
tocado ni revisado ese código desde esta sesión; solo queda anotado aquí
para no chocar ni duplicar el trabajo. Revisar `git status`/commits recientes
de esa zona antes de tocar nada de importación de biblioteca.

---

## Sesión del 4 de septiembre de 2026 (madrugada) — histórico de precios e iconos de trofeo

- **Gráfico "Precio a lo largo del tiempo"** en `/juego/[id]` (solo Steam,
  junto a "Dónde comprarlo"): `lib/itad.ts` (nuevo, API de IsThereAnyDeal,
  necesita `ITAD_API_KEY` — ya puesta) + `PriceHistoryChart.tsx` (SVG a
  mano, sin dependencia nueva). CheapShark, la fuente que ya había, solo da
  el precio actual y un "mínimo histórico" sin fecha — no valía para un
  gráfico. Bug real de la integración nueva, ver la trampa de arriba
  (formato de `since`).
- **Iconitos de tipo de trofeo** (historia/coleccionable/completista/
  multijugador/habilidad/secreto) en `TrophyList` (lista y cuadrícula) y
  `TrophyGuideModal`. `lib/trophyType.ts` (nuevo): ninguna API da esta
  categoría, así que es una heurística por palabras clave sobre
  nombre+descripción del trofeo — **aproximada a propósito**, sin
  categoría cuando no hay coincidencia clara (mayoría de casos, comprobado
  contra 3000 trofeos reales: ~65% se queda sin etiqueta). "Secreto" es la
  única que no es heurística, sale del campo real `hidden`.
- **Bug corregido en la vista previa de marco de avatar** (`/ajustes`): ver
  la trampa de arriba (`<img>` suelto sin flex).
- Sin verificar en el navegador logueado (sin credenciales en este
  entorno, mismo motivo de siempre) — sí verificado el gráfico de precios
  contra un perfil real sin sesión (`/juego/3278`, Garry's Mod) y la
  heurística de tipo de trofeo contra 3000 filas reales de la base.

---

## Sesión del 4 de septiembre de 2026 (noche) — Descubrir por plataforma, ficha de juego, Estadísticas y guías de trofeo

Sesión muy larga, a base de peticiones cortas encadenadas sin parar (varias
veces se me pidió algo nuevo mientras estaba terminando lo anterior). Va
agrupado por tema, no en orden cronológico.

**Importante — estado de git**: parte de esto está commiteado (dos commits,
`fa7b4fe` y `29aa96c`), pero **todo lo de después del segundo commit sigue
sin subir** (botón volver, prioridad del avatar, logros por plataforma,
Estadísticas de perfil, guías de trofeo, noticias por plataforma, página de
Recomendaciones, gestor de carpetas). Revisa `git status` antes de asumir
que algo de esta lista ya está en `master`.

### Descubrir, reorganizado por plataforma
- **`/descubrir/[plataforma]`** (PlayStation y Steam, nuevo): populares,
  tendencia, más jugados (de Paragon, no un dato global — se dice en
  pantalla), próximos/últimos lanzamientos a la vez con el mismo límite
  (antes descuadraban, 8 vs 12), ofertas y "casi sin jugadores ahora mismo"
  en Steam (contador público de Valve, en vivo, solo de lo ya catalogado
  aquí — no hay equivalente para PSN, Sony no publica eso). Xbox/Nintendo/
  Epic se quedan sin página propia a propósito: no tienen biblioteca
  sincronizable, no hay datos reales que enseñar ahí.
- **`HeroCarousel`**: un lanzamiento reciente y con hype de verdad
  (`destacadosRecientes()` en `lib/igdb/client.ts` — solo lo ya salido, con
  más exigencia de hype que el resto porque ahí solo cabe una pieza).
  Rectangular y de alto fijo (antes cambiaba de tamaño entre juegos), fondo
  con la misma carátula ampliada pero poco desenfoque + mucho oscurecido
  (con más blur se veía como un resplandor de neón), carátula sin recortar.
- **`novedades()`**: recientes O próximos por hype, no solo futuros — un
  juego que salió hace dos semanas y todo el mundo comenta también es
  "novedad" (caso real: *The Blood of Dawnwalker*).
- **Variedad de layout**: se dejó de usar scroll horizontal para todo.
  `GameGrid` (rejilla), `RankedList` (ranking numerado con barra, para más
  jugados / casi sin jugadores), `ReleaseGrid` (lista con fecha), `CardCarousel`
  + `PosterCard` (carrusel con flechas, no cinta automática) — cada tipo de
  dato con el formato que le pega, en vez de la misma fila repetida.
- **Página de Recomendaciones** (`/descubrir/recomendaciones`, nuevo, con su
  propio icono en la fila de plataformas): "Porque te gusta X" y "Para ti"
  vivían al final de `/descubrir` mezcladas con todo lo demás — ahora tienen
  su propio sitio.
- **Noticias por plataforma**: `lib/steamNews.ts` (nuevo, feed RSS oficial de
  Valve, formato RDF/RSS1.0) junto al `lib/psNews.ts` que ya existía —
  cada una en su propia página de plataforma, no mezcladas con las
  generales de `/noticias`.

### Ficha de juego (`/juego/[id]`)
- **Bug de página entera rota**: faltaba un `</div>` de cierre (edición a
  medias de Antigravity al envolver la barra lateral en un div nuevo) — Turbopack
  daba parse error y la página entera devolvía 500. Arreglado.
- **Scroll horizontal de toda la página**: el `1fr` de la rejilla (contenido +
  barra lateral de 300px) no se encogía por debajo del ancho de su contenido
  más ancho (la tira de capturas) — a diferencia de flex, un `1fr` de CSS
  Grid tiene `min-width: auto` por defecto. Con `min-w-0` en la columna
  principal se arregla: la tira scrollea por dentro, no empuja la página.
- **Capturas de pantalla**: ahora abren un visor a pantalla completa en la
  misma pestaña (antes `target="_blank"`), con Esc para cerrar, flechas del
  teclado y en pantalla, X, contador "N/M". Mismas flechas que ya tenía
  `GameVideos` para paginar la tira. `loading="lazy"` en una tira de 15-20
  capturas dejaba huecos negros al entrar — las primeras 6 cargan sin esperar.
- **"Juegos similares"**: pasó de una rejilla de 6 columnas (se apretaba
  muchísimo junto a la barra lateral) a `CardCarousel`. De paso, un bug real:
  el objeto que llega de IGDB usa `coverUrl`, no `iconUrl` (que es lo que lee
  `PosterCard`) — ninguna carátula cargaba, spread directo sin mapear el campo.
- **"Logros por plataforma"** (antes sin etiquetas, solo iconos con números
  sueltos — nadie entendía qué eran): ahora dice "Logros" y, solo en PSN,
  "puntos de nivel PSN" (la fórmula real de Sony: bronce 15, plata 30, oro
  90, platino 300 — por eso solo aparece en PSN, Steam no puntúa sus logros).
  Bug real de paso: `getGameTrophyBreakdown` solo miraba `games.defined` (el
  desglose por metal, que es SOLO de PSN) — Steam salía siempre a 0 logros
  en silencio. El total universal vive en `games.definedTotal`.
- Botón "Volver" arriba (ver más abajo).

### Botón "Volver" en casi toda la app
`BackButton.tsx` (nuevo) usa `router.back()` de verdad — vuelve a la pantalla
concreta de donde se vino (mismo scroll, mismos filtros), con una red de
seguridad (`fallbackHref`) para cuando no hay historial (llegada directa).
Puesto en ~24 páginas: admin, las 4 de ajustes (vía su layout compartido),
amigos, avisos, comparar (los dos), descubrir (raíz y por plataforma),
ejemplo, feed, ligas, noticias, planificador, privacidad, rankings, ritmo,
perfil público, CV, ficha de juego, guías (las dos), biblioteca de un juego,
Estadísticas, ranking del Wrap. Fuera a propósito: `/`, `/entrar`,
`/bienvenida`, `/offline` (puntos de entrada/salida sin "atrás" real) y el
modo Enfoque (ya tiene su propio botón de salida dedicado a pantalla completa).

### Avatar: una foto subida a mano gana a PSN
Antes `resolveAvatarUrl`/`avatarUrlSql` no distinguían "subiste una foto tú
mismo" de "esta es la que puso Google/Discord al entrar la primera vez" —
las dos viven en la misma columna `users.image`. Columna nueva
`users.avatarPersonalizado` (migración ejecutada:
`scripts/anadir-avatar-personalizado.mts`), que `/api/upload` marca a
`true` solo al subir un avatar a mano. `resolveAvatarUrl` (profiles.ts) y
`avatarUrlSql` (avatarSql.ts, firma cambiada — ahora pide también esa
columna, revisar cualquier llamada nueva) le dan prioridad sobre PSN solo
cuando el flag está activo; si nunca subiste nada, sigue como siempre (PSN
primero).

### Estadísticas de perfil (`/u/[handle]/estadisticas`, nuevo)
- **Mapa de actividad estilo GitHub** (`ActivityHeatmap.tsx`) y **trofeos
  por mes** — reales, de `earnedAt` (mismo dato que ya usa `/ritmo`, no
  inventado). Tooltip propio al pasar el ratón (el `title` nativo tardaba
  en salir y era minúsculo).
- **"Horas jugadas, en perspectiva"** (`PlaytimeComparison.tsx`): el total
  de horas de TODAS las plataformas vinculadas, sumadas y convertidas a
  días como si se jugaran seguidas sin dormir (experimento mental, se dice
  así en pantalla), con una comparación graciosa según la magnitud —
  escala de hitos desde "un finde largo" hasta "una carrera universitaria y
  un máster" o "toda tu infancia y adolescencia".
- **`horasPorJuego()`**: ahora agrupa por `igdbId`, no por `games.id` — el
  mismo juego en dos plataformas suma sus horas en una fila, no aparece
  duplicado. Importante: esto es a propósito solo aquí (vista unificada del
  perfil) — en `/descubrir/[plataforma]` (`mostPlayedOnPlatform`) las horas
  siguen separadas por plataforma, porque ahí es lo que tiene sentido.
- **"Jugado recientemente"**: no existe un registro de sesiones real en
  PSN/Steam (solo `lastPlayedAt`, un único timestamp por juego) — esto es
  el proxy más honesto que hay, no una lista de sesiones inventada.
- **"Tú y tus amigos"** (`FriendsLeaderboard.tsx` + `estadisticasAmigos()`):
  ranking por horas, reutilizando `summarise()` (misma fuente de verdad de
  platinos/trofeos que ya usa cada perfil) en vez de reimplementar el
  conteo en SQL aparte. Solo visible en tu propio perfil — es información
  privada de quién ve el perfil (quiénes son sus amigos), nunca del perfil
  de otra persona.

### Guías de trofeo escritas en la plataforma
Antes `TrophyGuideModal` en su pestaña "Guía escrita" solo mandaba a buscar
en Google/Vandal/Meristation/3DJuegos. Tabla nueva `trophy_guide`
(migración ejecutada: `scripts/crear-tabla-guias-trofeo.mts`; una fila por
usuario+juego+trofeo, `upsert` al reescribir, no duplica) — `lib/trophyGuides.ts`,
acciones en `actions.ts`. La pestaña ahora enseña las guías reales de la
comunidad para ese trofeo y deja escribir/editar la tuya; los enlaces de
búsqueda externa se quedan como alternativa al final, no como única opción.
El idioma se guarda a partir de `users.language` (de momento siempre "es",
no hay más interfaz que esa) — el campo ya existe para cuando haga falta.

### Gestión de carpetas completa (`/planificador`)
`CarpetasManager.tsx` (nuevo): crear carpeta y añadir juegos en el mismo
paso, renombrar, eliminar, quitar un juego de una carpeta, y moverlo a otra
con opción de crear una carpeta nueva en el momento de mover. Funciones
nuevas en `lib/collections.ts` (`addGamesToCollection`,
`removeGameFromCollection`, `moveGameToCollection`) y acciones a juego en
`actions.ts`. No se pudo probar en el navegador (sin credenciales en este
entorno) — revisar con una cuenta real antes de darlo por bueno del todo,
aunque sigue el mismo patrón que `CollectionPicker`/`NewCollectionForm`, ya
probados.

### Lo que Antigravity tocó en paralelo, en medio de esta sesión
- Bastante trabajo en `/juego/[id]`: `GameHeaderLogo` (logo oficial de Steam
  en vez de carátula genérica), fondo con `artworkUrl`, `GameVideos`,
  `GameLanguages`, `GameDlcs`, `GameTrophyBreakdown`, franquicias en el
  panel de Detalles. Su edición dejó el `</div>` sin cerrar que rompió la
  página entera (ver arriba) — no se ha revisado el resto a fondo.
- **`lib/platformIcons.tsx` reescrito con `react-icons`** (`FaPlaystation`,
  `FaSteam`, `FaXbox`, `BsNintendoSwitch`, `SiEpicgames`, `SiUbisoft`) — los
  iconos de marca reales que se habían pedido antes en esta misma sesión,
  mejor resueltos que el intento a mano. Dependencia nueva en package.json:
  `react-icons`.

---

## Sesión del 4 de septiembre de 2026 (tarde) — estilos globales, Descubrir y compartir

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
Antigravity) llegaron a correrse — ver el punto 1 de "Pendiente".

**CheapShark** (comparador de precios) no necesita clave, pero desde hace
poco exige un `User-Agent` descriptivo o devuelve un error genérico —
ya está puesto en `lib/prices.ts`, no hace falta variable de entorno nueva.
