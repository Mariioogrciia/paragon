# Paragon — traspaso

Estado del proyecto y de la sesión de trabajo, para retomarlo sin tener que
releer todo el historial. Última actualización: **7 de octubre de 2026**.

**7 oct — barra de cristal, rangos de clan, comparar meses y muchos arreglos:**
- **Barra de abajo** (`BarraInferior` en `MainScreen`): cápsula flotante de
  **cristal líquido** como la de Instagram (`haze-glass` 2.0.1:
  `hazeSource` en el contenido, `hazeGlass` en la barra, desenfoque 10 dp,
  tinte 40 %). Una píldora se desliza con muelle a la pestaña activa, sin
  ripple. El contenido pasa POR DETRÁS: cada lista suma
  `ui/common/huecoBarra()` a su relleno inferior (`LocalHuecoBarra`, lo da
  MainScreen). Pantalla nueva con scroll → sumarle `huecoBarra()`.
  En Android < 13 queda un cristal simple, sin refracción.
- **Trofeo → ficha**: `Screen.GameDetail.routeFor(gameId, trofeo, de)`. La
  ficha baja hasta el trofeo y lo resalta. `de=<handle>` abre la ficha de
  OTRA persona en solo lectura (`/api/mobile/games/[id]?de=`), sin caché
  local; los juegos recientes del perfil de alguien la usan
  (`LocalAbrirJuegoDe`).
- **Platinado con DLC pendientes**: el servidor manda `platinado` en
  highlights, `GameProgress.platinado`; ya no sale "siguiente platino".
  Steam/Xbox no distinguen DLC (Steam sigue siendo el 100 %).
- **Clanes**: escudo personalizable (forma + símbolo + 2 colores,
  `lib/clanEmblema.ts` ↔ `ui/social/EscudoClan.kt`, guardado en
  `clans.logoUrl`). **Rangos** líder / colíder / veterano / miembro
  (`lib/clanRangos.ts` ↔ `data/ClanRangos.kt`, con tests; en
  `clan_members.role`, "admin" = colíder). Si el líder se va, hereda el
  colíder más antiguo (`sucesorDelLider`). Las acciones de la web devuelven
  `{ error }` (`ClanError`): lanzar daba "Minified React error #441".
- **Carpetas**: añadir/quitar juegos desde la carpeta y **foto propia**
  (`collection.portada`, `POST/DELETE /api/mobile/collections/[id]/portada`).
- **Apariencia** rediseñada (miniaturas de temas y estilos, modos con icono,
  acentos con nombre). Cada **estilo** trae fondo y tiñe tarjetas; las
  **paletas completas** oscurecen su fondo también en OLED. Interlineado
  relativo a la letra en todo el tema (`interlineadoRelativo` en Theme.kt).
- **Amigos**: selector Amigos / Solicitudes (N) / Añadir. **Racha**
  rediseñada (anillo hacia el récord, semana, mapa de 5 semanas).
  **Mes a mes**: comparar con un amigo (web `/ritmo?con=`, app; API
  `stats/month?de=`, solo amigos). **Web**: filtros de la ficha como la app
  (Todos / Me faltan / Conseguidos + DLC) y fondo con el artwork de IGDB.
- **Imágenes**: `ui/common/UrlImagenes.kt` corrige TODAS las URLs (http →
  https, sin esquema, relativas) en los dos ImageLoader: carátulas y fotos
  de PSN que no cargaban en iOS.
- **Varios**: hojas opacas (`SurfaceSolida`), "Ocultar funciones sociales"
  quita Comunidad, botones de Cuentas vinculadas, enlaces de Ajustes a la web
  real (`BASE_URL`), APK firmada siempre con `kmp/androidApp/debug.keystore`
  (antes "conflicto de paquete" en cada APK del CI).
- **Base de datos (aplicado con `db:push`)**: `collection.portada` nueva; se
  quitó la clave foránea `game_guide.gameId → game.id` (las guías usan el id
  global de IGDB: publicar fallaba siempre). Ojo: el primer `db:push` del día
  añadió además claves foráneas que faltaban en ~20 tablas (sin errores).
- **Vercel** (CPU 3 h 33 min de 4 h del plan): el cron solo resincroniza a
  quien lleve > 2 h (`HORAS_ENTRE_RESYNC`) y `sync-frecuente.yml` va cada
  30 min. Si vuelve a apretar: avisos, alertas y resúmenes corren en cada
  llamada.
- **Compilar en este PC**: el antivirus (Avast) rompe el SSL de Gradle.
  `JAVA_TOOL_OPTIONS="-Djavax.net.ssl.trustStore=<repo>/scratch/cacerts-avast.jks
  -Djavax.net.ssl.trustStorePassword=changeit"` y `./gradlew --stop` antes.
  Así compila también iOS (`:shared:compileKotlinIosSimulatorArm64`).
- **Marca**: el nombre sigue siendo Paragon "de momento". Logo elegido (copa
  con gema) en `scratch/marca/simbolo.svg`, **sin aplicar** (icono de app,
  notificación Android, favicon, `ParagonMark`).
- **Siguiente (propuesto, sin confirmar)**:
  - Cristal en más sitios: botones sobre la portada de la ficha y cabecera
    fina al hacer scroll (no en todas las tarjetas: rendimiento).
  - Solo iPhone con la cuenta gratuita: barra de pestañas nativa de iOS 26
    (SwiftUI `TabView`, cristal del sistema), notificaciones locales de racha
    y sesiones, accesos rápidos del icono, Spotlight, Background App Refresh.
    Con cuenta de pago: widgets, Live Activities / Dynamic Island, push.
  - Ya hay en iOS: 120 Hz (`CADisableMinimumFrameDurationOnPhone`), Core
    Haptics, Atajos (en diagnóstico), iconos alternativos.

**6 oct — pruebas en el móvil: barra tipo Instagram, DLC, amistad y fallos:**
- **Barra de abajo** (desde el 7 oct es de cristal y flotante, ver arriba) (`BarraInferior` en `MainScreen`, sustituye a la cápsula
  `BarraFlotante`): fija y siempre visible, de lado a lado, solo iconos
  (relleno = activa, contorno = resto, `BottomNavItem.iconoInactivo`) y la
  foto del usuario en Perfil. Ya no se esconde al hacer scroll: eso hacía
  que el Scaffold se volviera a medir y daba un tirón al llegar arriba/abajo.
- **Ficha: trofeos por DLC**: la API ya mandaba `groupId/groupName` y la app
  los tiraba (`TrophyDto`/`TrophyItem` ahora los llevan). Lista agrupada por
  juego base y cada DLC (`CabeceraGrupoTrofeos` con progreso), filtro de
  estado con `ControlSegmentado` (Todos / Me faltan / Conseguidos) y de DLC
  con el `Selector` común (el usuario pidió coherencia: **mismos selectores
  en toda la app**, nada de pastillas sueltas para esto).
- **Ficha, fallos visuales**: la carátula con parallax se veía detrás de las
  cifras (`clipToBounds`), las pastillas de acciones se cortaban (el
  `horizontalScroll` va antes del padding), volver fijo arriba y Modo
  Enfoque sin halo.
- **Amistad desde el perfil**: `GET /api/mobile/users/{handle}` devuelve
  `amistad` (ninguna / solicitudEnviada / solicitudRecibida / amigos / yo) y
  `FriendProfileBottomSheet` tiene `BotonAmistad`. Web: `FriendRequestButton`
  traducido (`Perfil.PerfilPage.amistad`) y con "Amigos ✓".
- **Ojo con los namespaces de la web**: los textos van por carpeta
  (`useTranslations("Perfil.PerfilPage...")`, no `"PerfilPage..."`). Si no,
  la web enseña la clave. `scripts/comprobar-namespaces-cliente.mts` ya
  comprueba que cada namespace exista en `messages/`.
- **Jugado recientemente** (perfil de otros): la biblioteca ordenaba por
  `desc(lastPlayedAt)` y Postgres pone los NULL primero; ahora
  `desc nulls last` en `lib/profiles.ts` (afecta también a la web).
- CI: Android verde en `bf126eb`; iOS verde en `0d190d4` (el de `bf126eb`
  estaba en curso). Pendiente que el usuario lo pruebe en el móvil.
- **Siguiente (preguntado, sin confirmar)**: "Últimos trofeos" en la app (en
  la web está en el perfil, `components/RecentTrophies.tsx` +
  `lib/history.ts → ultimosTrofeos`): en tu Perfil y en el de otros.

**Noche del 5 oct (4) — diseño v2 de la app ("que se sienta una app de verdad"):**
- Maqueta v2 de las 20 pantallas: https://claude.ai/artifact/D6EAtf8pUbhCVXjGYkDyVy
  (aprobada: "adelante con todo"). Siempre push a master.
- **Navegación nativa**: sin la barra "PARAGON" en ninguna pantalla; cada una
  lleva `ui/common/CabeceraNativa` (‹ De dónde vienes + título grande).
  Transiciones de empujar/volver en `MainScreen` (`esPestana()`: entre
  pestañas, fundido). `ControlSegmentado` sustituye a las TabRow de Material.
  `ConfirmDialog` es ahora una hoja inferior. `GrupoNativo`/`FilaNativa`
  (`ui/common/ListaAgrupada.kt`) para listas tipo Ajustes del iPhone.
- **Personalización**: el acento tiñe fondo, superficies y bordes en oscuro,
  claro y OLED (`tenido()` en `ui/theme/Color.kt`); contraste alto, neutro.
- **Icono de la app** a elegir (Ajustes → Apariencia): `kmp/iconos/generar.py`
  saca las variantes (Paragon, Oro, Claro, Neón, Esmeralda). Android: un
  `activity-alias` por icono (`IconSwitcher.kt`, ahora en `:shared`); iOS:
  `ASSETCATALOG_COMPILER_ALTERNATE_APPICON_NAMES` en `project.yml`.
- **QR** (`app/util/EscanerQr.kt`): el QR lleva el enlace web (`/u/<handle>`,
  `/sesiones/<id>`), así vale con la cámara normal. Lector: Google Code
  Scanner en Android, AVFoundation en iOS (`NSCameraUsageDescription`).
  Dibujo con `io.github.alexzhirkevich:qrose`. Tu código en Perfil y Amigos;
  lector en Comunidad y Amigos; compartir sesión desde su detalle.
- **Plataformas** como la web: `POST /api/mobile/accounts/{platform}/sync`
  (nuevo) y `avatarUrl/isPublic/syncedAt` en el GET; Sincronizar, Cambiar
  cuenta y Desvincular (con confirmación).
- Inicio v2 (cifras → Sigue jugando → Para hoy), Carpetas en cuadrícula con
  hoja de opciones, pantalla de entrar nueva, Ajustes en listas agrupadas.
- Android compila en la CI; iOS iba con mucha cola: revisar el último run.

**Noche del 5 oct (3) — rediseño de la app (maqueta aprobada):**
- Maqueta en https://claude.ai/artifact/6LesnTCahE8PorvE5nYhjV (5 pantallas de
  iPhone). Skill de diseño en `.claude/skills/mobile-app-ui-design`.
- **Solo colores y radios del tema** (Accent, Surface, Border, radio()...): la
  personalización de Apariencia tiene que seguir mandando en todo.
- Barra de abajo con Inicio, Biblioteca, Comunidad, Ligas y **Perfil**
  (`ui/perfil/PerfilScreen`, sustituye a "Más" y al menú del avatar). Desde
  el 6 oct es `BarraInferior` (fija, tipo Instagram), ya no la cápsula.
- Inicio (`ui/panel/InicioCards.kt`), Biblioteca (`ui/library/BibliotecaPiezas.kt`),
  ficha del juego (cabecera nueva + "Modo Enfoque" abajo) y Comunidad
  (`ui/feed/ComunidadScreen.kt`: Muro / Sesiones). Esas cuatro pantallas y
  Perfil ya no tienen la barra de arriba (llevan su cabecera); el resto sí.
- Sin probar en un teléfono: solo la CI de iOS.

**Noche del 5 oct (3b) — eSports rehecho y puntuación del clan:**
- **eSports** (rediseño con impeccable, estructura «Por competición»; brief en
  `.impeccable/surfaces/src-app-esports-page-tsx.md`, sistema en DESIGN.md):
  - `/esports`: filtros por juego + Todos / Mis equipos, franja «Tus equipos»,
    directos y un bloque por competición con su tabla (`components/EsportsHub.tsx`).
  - Ficha nueva `/esports/partido/[id]`: ruta del torneo, marcador, clasificación,
    mapa a mapa, plantillas, todos los streams (directo incrustado si se juega),
    otros partidos de la fase, cuenta atrás y `.ics` (`lib/pandascore.ts`
    → `getPandaScoreMatchDetail`).
  - **Favoritos**: tabla `esports_favorito` (creada en producción con
    `scripts/crear-tabla-esports-favoritos.mts`). Noticias de tus equipos por
    Google News RSS (`lib/esportsNews.ts`). Sin probar aún con sesión iniciada.
  - PandaScore: 1000 peticiones/hora y 429 por ráfaga; tablas de 2 en 2 y caché.
  - Pendiente: volver a la página tras entrar desde la estrella (`/entrar`
    siempre manda a `/bienvenida`).
- **Puntuación del clan** = Paragon Score de los trofeos ganados **desde que cada
  miembro entró** (`getClanLeaderboard`: `contribucion`, `trofeosEnClan`,
  `joinedAt`). Apartado «Contribución» en la web y en la hoja del clan de la app,
  que sustituye al ranking de toda la vida. Contrato en CONTRACT.md.
- Fuera `components/NativeAppSetup.tsx` (importaba Capacitor, que ya no es
  dependencia: la web no compilaba). LinkedIn en el pie; logo de Steam monocromo.

**Noche del 5 oct (2) — web y apps:**
- **Web (ya en master)**: un único selector `components/ui/Selector.tsx` (nada
  de `<select>` nativos, regla en DESIGN.md); las mismas vistas de trofeos
  (`components/VistasTrofeos.tsx`) en la ficha del juego y en `/ritmo`; diario
  del platino arreglado (comillas, fecha del platino, sin DLC posteriores).
- **Apps (`kmp/`)**:
  - Menú "Más" sin botones muertos (Descubrir/Planificador no existen en la
    app), sin "Amigos" duplicado, traducido; añade Sesiones y Mes a mes.
  - Fuera `GlassBackground` (desenfoque de iOS siempre oscuro, API de
    interop obsoleta y sin efecto: el contenido no pasa bajo las barras).
  - `ui/common/Selector.kt`: el desplegable de la app, gemelo del de la web.
  - **Sesiones** (`ui/sesiones/`, API `api/mobile/sessions*`, CONTRACT.md):
    lista, ficha con plazas y unirse/salir/cancelar, hoja para organizar con
    el trofeo de los que te faltan y día/hora con los pickers de Material.
  - Ficha del juego: diario del platino (`diario` en la API) y vistas
    Lista/Cuadrícula/Cronología comunes (`ui/trofeos/VistasTrofeos.kt`); el
    árbol de la web no está en las apps.
  - **Mes a mes** (`ui/trofeos/RitmoScreen.kt`, `api/mobile/stats/month`).
  - Sin probar en un teléfono: solo compilado en la CI de iOS. Los push siguen
    abriendo el Panel (el `url` del aviso no se enruta todavía).

**Noche del 5 oct — sesiones y revisión de Antigravity:**
- **Sesiones rehechas** (sin migración): lista compacta que enlaza a la ficha
  nueva `/sesiones/[id]` (quién está dentro, plazas libres en huecos, detalles
  y el botón de unirse, que ya solo vive ahí). Formulario plegado; juegos por
  plataforma con su consola (`deviceLabel`) y % para distinguir "GTA V" de
  PS3/PS4/PS5; el trofeo se elige de un desplegable con los que te FALTAN
  (`trofeosPendientes`; "Otro" para escribirlo a mano) y se guarda con su
  nombre original para enseñar icono, metal y traducción. **Plazas = total
  contándote** (4 → tú + 3 libres, "1/4"); en la base `boost_session.plazas`
  sigue siendo "sin contar al anfitrión": total = plazas + 1. Los avisos
  (push y DM de Discord) dicen quién se une o se sale, consola, "2/4
  ocupadas" y la lista de quién hay dentro, también a los que ya estaban.
- **El commit de Antigravity `eab7abb` rompió el deploy de Vercel** (ERROR):
  quitó `@capacitor/*` del package.json pero `NativeAppSetup.tsx` los
  importaba, y un tipo mal en `getClanLeaderboard`. Arreglado: el shell de
  Capacitor de `ios/` se lee de `window.Capacitor` (sin paquetes npm).
  También borró `android/` entera (fase 5) antes de validar iOS.
- **Pendiente de decidir (clanes, de Antigravity)**: la cifra del clan pasó de
  XP a "contribución" (nº de trofeos desde que entraste), el texto
  "CONTRIBUCIÓN" está en español a fuego (sin i18n) y la ficha del clan ahora
  tiene 3 columnas en escritorio.

**Estado actual (5 oct 2026, tarde) — léelo antes que nada:**
- **Subido a `origin/master`** hasta `40301de` (Vercel despliega solo). Fuera
  del repo: `.env.local`, `scratch/` (ojo: NO está en `.gitignore`, no hacer
  `git add -A` en la raíz), `.impeccable/`, `ios-builder-test/` y el cambio
  local de `.claude/launch.json` (certificado de Avast).
- **La app móvil es ahora UNA sola app Compose Multiplatform en `kmp/`**
  (Android + iOS nativo). Plan, versiones, piezas por plataforma y trampas:
  **`kmp/MIGRACION.md`**. Fases 1-3 hechas; falta la 4 (probar iOS en un iPhone
  real) y la 5 (retirar `android/` y el Capacitor de `ios/`).
  - `kmp/shared`: red (Ktor), sesión, Room, 24 repositorios y **todas las
    pantallas** en `commonMain` (mismos paquetes `com.paragon.app.*`).
  - `kmp/androidApp`: solo lo propio de Android (actividad, FCM, widget
    Glance, WorkManager, iconos, caché HTTP y modo demo en `ApiAndroid`).
  - `kmp/iosApp`: host Swift (Siri/Atajos, Core Haptics, `onOpenURL` del login);
    el `.xcodeproj` lo genera XcodeGen en la CI.
  - **`android/` está CONGELADA** (alguien la sigue tocando: los cambios de
    `android/` no llegan a la app; trasladarlos a `kmp/androidApp` o a `shared`).
- **iOS**: `.github/workflows/build-ios-kmp.yml` compila un IPA sin firmar
  (artefacto `paragon-kmp-ipa`, se instala con Sideloadly; cuenta de Apple
  gratuita: caduca a los 7 días y sin push). Primer IPA de la app completa:
  run 37315038576. Si falla, los errores de compilación salen como
  **anotaciones** (se leen por la API sin sesión de GitHub:
  `/repos/Mariioogrciia/paragon/check-runs/<job>/annotations`).
  - Probado en el iPhone del usuario (iOS 26.6): la prueba (red, carátulas,
    insets) y las vibraciones por metal. **Siri aún no registra las frases**
    (faltaban icono y nombre en el Info.plist; corregido, sin confirmar).
  - **La app completa en iOS no se ha probado todavía en un iPhone**: login por
    Safari + vuelta por `paragon://auth`, fotos, clanes, ligas, ajustes.
- **Hecho hoy en servidor/web** (desplegado):
  - Fotos de perfil: 6 de 11 usuarios tenían la de PSN en `http://` (las apps
    la bloquean); `avatarUrlSql`/`resolveAvatarUrl` la devuelven en `https`.
  - **Ligas privadas que terminan de verdad**: `cerrarLigasPrivadasVencidas`
    (lib/trophyCase.ts, en el cron) marca `awarded`, premia a los empatados en
    lo alto y avisa a cada miembro de su puesto (las vencidas hace >3 días se
    cierran sin avisar); `lib/ligasCierre.ts` (reglas, con tests); una liga
    terminada no admite cambiar el reto, invitar ni aceptar (409 "Esta liga ya
    ha terminado."); la web enseña "Terminó el X · Ganó Y". **Sin ver aún una
    pasada real del cron.**
  - **Guerra de clanes en la API móvil**: la ficha del clan trae `guerra` y
    `retables`; `POST clans/[tag]/war` y `clans/wars/[id]`. Contrato en
    `src/app/api/mobile/CONTRACT.md`.
- **Verificación**: web `npx tsc --noEmit`, `npx eslint src`, `npm test` (135),
  `npx tsx scripts/comprobar-namespaces-cliente.mts`. Móvil, desde `kmp/`:
  `./gradlew :shared:compileCommonMainKotlinMetadata :androidApp:assembleDebug :shared:testAndroidHostTest`
  (con `JAVA_HOME="C:/Program Files/Android/Android Studio/jbr"` y el
  `JAVA_TOOL_OPTIONS` de Avast: `-Djavax.net.ssl.trustStore=<repo>/scratch/cacerts-avast.jks -Djavax.net.ssl.trustStorePassword=changeit`).
  La metadata común NO garantiza que iOS compile (pasó un `Modifier.androidx…`
  que solo rompe en Kotlin/Native): la prueba de verdad es la CI de iOS.
- **Trampas nuevas de hoy**:
  - **Dos agentes compilando a la vez en `kmp/`** (Claude + Antigravity) se
    rompen las builds: daemon parado a mitad, un APK sin las clases de
    `:shared` (la app se cerraba al arrancar). Solo uno cada vez. Si pasa:
    `./gradlew --stop`, borrar `shared/build` y `androidApp/build`, recompilar.
  - Los archivos que escribe Antigravity vienen con CRLF: las sustituciones con
    `$`/`\n` no casan; normalizar a LF antes.
  - Textos de la app: **`kmp/i18n/textos.json`** + `node kmp/i18n/generar.mjs`
    (`stringResource(T.clave)` / `Textos.t(T.clave)`); los de `android/i18n` ya
    no valen.
  - Ktor necesita `Content-Type: application/json` en la respuesta (el modo
    demo no lo mandaba).
  - Recursos comunes (logo, iconos) en `shared/src/commonMain/composeResources`;
    sin `androidResources { enable = true }` no entran en el APK.
- **Pendiente**:
  - Que el usuario pruebe el IPA de la app completa; arreglar lo que falle.
  - Siri (tras el arreglo del Info.plist).
  - Antigravity tiene a medias transiciones compartidas Panel→Ficha
    (`MainScreen.kt`, `PanelScreen.kt` sin commitear). Su auditoría de UX
    propone blur (librería Haze), vibraciones y `animateItem`: acordado
    dejarlo para después de que iOS funcione, y que no trabaje a la vez.
  - Fase 5: retirar `android/` y el Capacitor de `ios/` cuando la app de
    `kmp/` esté validada en los dos sistemas.
  - APK firmada (falta clave propia); push en iOS (cuenta de pago).

**Mañana del 5 oct (antes de la migración; las instrucciones de `android/` de
este bloque ya NO valen):**
- **Todo subido a `origin/master`** (último commit `fa47f50`; Vercel despliega
  solo). Fuera del repo siguen `.env.local`, `scratch/`, `.impeccable/` (rondas
  de diseño y respuestas, nunca subidas) y el cambio local de
  `.claude/launch.json` (ruta del certificado de Avast).
- **⚠ Hace falta APK nueva**: el login de la app ahora entrega el token
  cifrado (`?c=`) y el servidor ya no lo da en claro, así que la APK anterior
  no puede volver a iniciar sesión (las sesiones abiertas siguen valiendo
  hasta caducar). Compilar con `./gradlew assembleRelease` desde `android/`
  (sale **sin firmar**: hace falta una clave propia para repartirla;
  `versionCode 2 / 1.1`, R8 activo).
- **Rediseño de toda la plataforma: terminado**, `DESIGN.md` al día. Ver
  "REDISEÑO DE TODA LA PLATAFORMA".
- **Epic Games**: solo por la extensión del navegador (Cloudflare bloquea al
  servidor), progreso **declarado** (no puntúa). Ver "Epic Games: extensión
  del navegador y progreso declarado"; usar `noDeclaradoPorId`/`esDeclarada`
  en todo lo que puntúe o clasifique.
- **Trofeos en tu idioma + guías en vídeo por idioma** (3 oct): ver su
  sección. Tablas ya creadas en producción.
- **App Android — tres tandas (4-5 oct)**, detalle en "Auditoría de la app
  Android" al final: seguridad del login, app en es/en/de/fr con selector en
  Ajustes → Idioma, icono P, apariencia igual que la web y sincronizada con
  la cuenta (`/api/mobile/appearance`), Panel reordenado, R8, errores del
  servidor traducidos, y las cuatro quejas del 5 oct (hito "faltan N",
  logros de Steam por lotes, volver en clanes, guía del bot de Discord).
- **Web**: selector de idioma visible en la cabecera también en móvil;
  `/bot-discord` (guía pública) y Ajustes → Bot de Discord; `BackButton` en
  clanes; "Reservar para el #N · faltan X".
- **Verificación**: `npx tsc --noEmit`, `npx eslint src` (0 errores),
  `npm test` (128 tests), `npx tsx scripts/comprobar-namespaces-cliente.mts`
  y, en `android/`, `./gradlew compileDebugKotlin` + `lintDebug`
  (con `JAVA_HOME="C:/Program Files/Android/Android Studio/jbr"`).
- **Pendiente / sin probar**:
  - **Logros de Steam por lotes**: solo compila y la UI en el emulador; falta
    probarlo con una cuenta de Steam real (vincular y ver el banner avanzar).
  - La app con datos reales: solo revisada con el **modo demo** (debug,
    `adb shell run-as com.paragon.app touch files/modo_demo`); falta una
    pasada con una cuenta real, el rail en tablet y una APK firmada.
  - La extensión de Epic no está instalada de verdad en Chrome ni en
    ninguna tienda (instalación manual en modo desarrollador).
  - Lista de coleccionables para trofeos de "consigue todos"; API oficial de
    YouTube (necesita clave) para filtrar mejor por idioma.
  - Si el servidor no tiene `DISCORD_APPLICATION_ID`, la guía del bot no
    enseña el botón de invitación (dice que aún no está configurado).
- **Trampas** (ya detalladas abajo): CSS sin `@layer` gana a utilidades de
  Tailwind como `hidden`; `isMissable` empareja por el nombre ORIGINAL en
  inglés; el servidor de desarrollo y la sesión del navegador del panel se
  pierden al reiniciar; **los textos de la app Android solo en
  `android/i18n/textos.json`** (se generan los `strings.xml` con
  `node android/i18n/generar.mjs`) y los errores nuevos de `/api/mobile`,
  en `lib/mensajesApi.ts`; en Windows/Git Bash, `adb` con rutas `/data/...`
  necesita `MSYS_NO_PATHCONV=1`.

**Estado anterior (30 sept 2026):**
- **Todo commiteado y subido a `origin/master`** (i18n de Ajustes,
  estados/reacciones en Android, arreglos en `/ajustes/plataformas`, orden
  de secciones del perfil y errores de `/api/profile/update` traducidos —
  ver "Sesión siguiente" más abajo). Fuera del repo solo quedan
  `.env.local`, `scratch/` y un cambio local sin subir a propósito en
  `.claude/launch.json` (ruta del certificado de Avast, que solo existe en
  el equipo del usuario; ver "Entorno local" al final).
- Las sesiones del **25 al 30 de septiembre** están **al final de este
  archivo**, en orden: auditoría de seguridad/plataforma → Functions Storage
  → segunda auditoría (rendimiento/estética) → piloto automático → funciones
  del 28 → RLS activado → tercera tanda de funciones → trofeos ocultos y
  horas por periodo → moderación, logros, niveles y Comunidad (29-30 sept) →
  cuarta auditoría y lo que vino después (30 sept).
- **Base de datos**: los cambios de esta última sesión están todos en
  `scripts/crear-tablas-auditoria-3.mts` (idempotente, ya ejecutado en
  producción): `mission_completion`, columnas nuevas en `user`
  (`tituloDesbloqueado`, `apariencia`, `panelOculto`, `avisosDesactivados`,
  `efectoNombre`) y `activity.gameId` admitiendo null.
- **Seguridad**: RLS activado en las 40+ tablas de `public` y sin permisos
  para `anon`/`authenticated` (comprobado el 28 sept). Cualquier tabla nueva
  debe crearse con su script en `scripts/` activando RLS igual que los
  existentes. Limitador de peticiones activo (`lib/rateLimit.ts`).
- **Calidad**: `npm test` (Vitest, 75 tests), lint sin errores (solo avisos
  de `<img>` por hosts dinámicos), `npx tsx scripts/comprobar-namespaces-cliente.mts`
  y workflow `.github/workflows/comprobaciones.yml`.
- **Vercel Hobby**: cuidado con el Functions Storage (se llenó al 90% por
  249 despliegues conservados; se borraron el 28 sept). Agrupar los cambios
  en pocos pushes: cada push es un despliegue. Para saber si un despliegue
  acabó sin acceso al panel de Vercel: `https://api.github.com/repos/Mariioogrciia/paragon/commits/<sha>/status`
  (Vercel publica ahí "Deployment has completed").
- **Pendiente de decisión del usuario**: solo las reglas del Pase de
  Temporada (decididas por Claude, `lib/temporada.ts`), revisables. El
  handle `maricon439` ya es `@mojaso` (decisión del usuario, 30 sept) y los
  retos entre amigos ya existen (ver "Tercera tanda del 30 sept" al final).
- **Diseño**: `PRODUCT.md` (verdad de producto) y `DESIGN.md` (sistema
  visual, escrito desde lo construido) en la raíz. Leerlos antes de tocar
  la interfaz. Acento por defecto: **platino** desde el 30 sept.

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
- **Últimos lanzamientos populares** en Noticias (`popularesRecientes` en
  igdb/client.ts, `UpcomingGames modo="recientes"`, `/api/games/upcoming?modo=recientes`):
  lo más seguido (`hypes`) ya salido en los últimos 60 días, del catálogo
  mundial, no solo de Paragon. "Lanzamientos destacados" (próximos) también
  es dinámico: IGDB con caché de 6 h.
- **Brillo del hover cortado**: la regla global de `globals.css` pone un
  `drop-shadow` de 12px al pasar el ratón por botones y enlaces redondeados,
  y cualquier fila con `overflow-x-auto` lo recorta (también en vertical).
  Arreglado dando ~16px de relleno con margen negativo en pestañas
  (`SeccionTabs`, `ProfileTabsNav`), filtros de eSports y carruseles
  (`CardCarousel`, `GameVideos`, `GameDlcs`, `ScreenshotStrip`,
  `HistoricalTimeline`, `FiltroEstadoAnimo`). **Cualquier fila deslizable
  nueva necesita lo mismo** (`-m-4 p-4` o equivalente).
- **Horas de Xbox**: `MinutesPlayed` con `POST /player/stats` de OpenXBL
  (`minutosJugados` en xbl/client.ts), una llamada por tandas de 100 juegos
  al sincronizar la biblioteca. Solo juegos con dispositivo Xbox/PC: los de
  Xbox Live en PlayStation o Android ("Minecraft for PlayStation®") se
  excluyen porque sus horas ya las da su plataforma. La respuesta viene
  envuelta en `content`. Epic sigue sin dar horas por API.

Commits de esta parte: `1d7f97d`, `13d3942`, `6618a3f`, `6117bdc`.

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

Commits: `3743b37` (estados + fix de insignias), `4f7295f` (efecto del
nombre + idioma).

### Pendiente (al cerrar el 30 sept 2026)
- ~~Etiquetas fijas en español aunque se cambie el idioma: el menú de
  Ajustes (`AjustesNav.tsx`) y las listas `NAV_OCULTABLE`, `PANEL_OCULTABLE`
  y `CATEGORIAS_AVISO`~~ → hecho, ver la sesión siguiente.
- ~~La app Android no pinta los estados libres de Comunidad ni las
  reacciones con emoji~~ → hecho, ver la sesión siguiente.
- **Retos semanales entre amigos**: ya existe la clasificación semanal y
  mensual en /amigos; darle ganador exige decidir contra qué grupo gana cada
  uno (cada cual tiene amigos distintos). Pendiente de que el usuario diga
  cómo lo quiere.
- Partir `actions.ts` y `profiles.ts` (~1.700 líneas cada uno): no cambia
  nada para el usuario; hacerlo cuando haya que tocarlos a fondo. Se dejó
  fuera otra vez en la sesión siguiente a propósito — refactor grande y
  arriesgado sin beneficio visible, mejor cuando haya que tocarlos por otro
  motivo.
- ~~Orden de secciones del perfil (`ProfileSectionOrderEditor.tsx`) y
  `ERRORES_PERFIL` de `ajustes/page.tsx`~~ → hechos, ver "Sesión siguiente"
  más abajo.

---

## Sesión siguiente (30 sept 2026, continuación — pendientes + cuentas de juego)

Lo pedido: seguir con la lista de "Pendiente" de arriba y luego una tanda
sobre `/ajustes/plataformas` (captura adjunta del usuario) — dominio propio,
"regional settings", las 4 plataformas en una fila y un aviso roto en
pantalla. Hecho sin commitear todavía (revisar antes de subir, ver abajo).

**i18n de Ajustes (punto 1 de la lista):** `AjustesNav.tsx` y las listas
`NAV_OCULTABLE`/`PANEL_OCULTABLE`/`CATEGORIAS_AVISO`
(navPreferences.ts/panelPreferences.ts/avisosPreferencias.ts) llevaban el
`label` en español a pelo, y los componentes que los pintan
(`HiddenNavForm`, `PreferenciasAvisos`) lo usaban tal cual sin pasar por
`useTranslations`. Las claves (`key`/`clave`) siguen siendo la fuente de la
verdad en esos archivos — solo se les quitó el peso de decidir el texto
visible: ahora `/ajustes/ocultar/page.tsx` y `/ajustes/page.tsx` traducen
cada clave (`navOcultable.*`, `panelOcultable.*`, `categoriaAviso.*`,
`ajustesNav.*`, namespace `Onboarding`, 4 idiomas) antes de pasarlas a los
componentes de cliente. Probado a mano cambiando el idioma en el navegador
(inglés y alemán) en `/ajustes` y `/ajustes/ocultar`.

**Android: estados libres y reacciones con emoji (punto 2 de la lista).**
`GET /api/mobile/feed` ya no filtra `type === "status"` ni exige `game`
(era `game: null` en la fila desde siempre, `getFeed` ya hacía `leftJoin`);
ahora manda también `miReaccion` (con qué emoji reaccionó esta cuenta).
`POST .../react` acepta `{ "reaction": "fuego" }` en el body — opcional,
sin ella cae en `"aplauso"` igual que antes, así que una app vieja sigue
funcionando igual. En Android: `FeedItemDto.game` pasa a nullable,
`FeedItem.gameTitle` también, `mensajeFeed()` tiene una rama `"status"` que
no usa el juego (el texto de la publicación es `item.review`, no una cita
sobre un juego). Reacciones: `REACCIONES` (mismos 5 emoji que
`lib/reacciones.ts`) vive ahora también en Kotlin
(`FeedRepository.kt`); `ReactionBadge` nuevo en `FeedScreen.kt` pinta el
emoji elegido en vez de un corazón genérico, y un toque sin reaccionar
todavía abre una fila de 5 emoji para elegir (toggleReaction ahora acepta
la clave). El doble toque de toda la vida sigue reaccionando con "aplauso"
directo, sin abrir el selector. Documentado en `android/API-CONTRACT.md`.
Compilado con `JAVA_HOME="C:\Program Files\Android Studio\jbr"
./gradlew :app:compileDebugKotlin` (BUILD SUCCESSFUL) — **no probado en
emulador**, mismo motivo de siempre (exige login).

**Descartado a propósito:** partir `actions.ts`/`profiles.ts` — sigue sin
tocarse, ver el punto de la lista de arriba.

**`/ajustes/plataformas` (captura del usuario):**
- **Las 4 plataformas vinculables en una sola fila** en vez de 3+2:
  `grid-cols-3` → `grid-cols-4` en pantallas grandes
  ([page.tsx](src/app/ajustes/plataformas/page.tsx)). Nintendo Switch (el
  cajón "aún no soportado") se queda solo en su propia fila debajo.
- **El aviso roto de la captura** ("Onboarding.avisoPublico.psn" en vez de
  texto): `PublicAccountNotice.tsx` pedía la clave `avisoPublico.<plataforma>`
  al namespace `Onboarding`, pero esa clave **no existía en ningún idioma**
  — next-intl, sin traducción, devuelve la clave tal cual en vez de fallar
  fuerte. Pasaba siempre, en las 4 plataformas, cada vez que alguien abría
  el formulario de vincular/cambiar cuenta — no es un caso raro, es el
  aviso "tu perfil tiene que estar en público" que se ve nada más entrar.
  Añadida la traducción en los 4 idiomas.
- **"Regional settings" (Ajustes → General):** llevaba un desplegable de
  idioma (`t("profileForm.regional.languageLabel")`) que era un duplicado
  roto del selector de idioma de verdad (`LanguageSwitcher.tsx` en la
  cabecera, que sí actualiza la cookie `NEXT_LOCALE` y `users.language`).
  Este otro: solo ofrecía "Español"/"English" (ni alemán ni francés, de los
  4 que hay de verdad) y, más grave, **`/api/profile/update` reescribía
  `users.language` a `"es-ES"` en CADA guardado del perfil grande** (nombre,
  avatar, tema, lo que sea) si el campo no llegaba con el formato exacto que
  esperaba — así que guardar cualquier cosa en el perfil grande podía
  deshacer en silencio un cambio de idioma a alemán/francés hecho segundos
  antes desde la cabecera. Quitado el campo entero (`ProfileForm.tsx`,
  `/api/profile/update/route.ts`): "Regional settings" ahora solo tiene
  zona horaria, que es lo único que no duplicaba nada. El idioma se sigue
  cambiando solo desde `LanguageSwitcher`.
- **Dominio propio**: el usuario comentó "habría que ir pensando en
  lanzarla con dominio" — sigue sin comprar, la app sigue en
  `platinos-nine.vercel.app` (ver "Pendiente" más arriba, viene de antes).
  No se ha hecho nada al respecto esta sesión, es una decisión/compra del
  usuario, no código.

**Comprobado con el ratón en el navegador (pendiente suelto de la sesión
anterior):** el brillo de hover en carruseles y pestañas. Se pudo probar de
verdad esta vez (`/descubrir`, fila "New Releases" de `CardCarousel`, y
`ProfileTabsNav` en `/u/<handle>`) conectando el navegador de la sesión al
`next dev` que el usuario ya tenía corriendo en `localhost:3000` (dos
sesiones de Claude no pueden compartir el mismo `next dev`, pero sí pueden
apuntar al mismo puerto desde el navegador). Confirmado: el resplandor sale
completo en los dos casos, sin recortarse arriba/abajo. No se repasó cada
carrusel uno por uno (`GameVideos`, `GameDlcs`, `ScreenshotStrip`,
`HistoricalTimeline`, `FiltroEstadoAnimo`, filtros de eSports) — llevan el
mismo arreglo (`-m-4 p-4`) que los dos probados, así que es la misma regla
aplicada igual, pero no se vieron uno a uno con el ratón encima.

**Calidad:** `npx tsc --noEmit` limpio, `npm test` 75/75, lint limpio en
todo lo tocado (los ~700 "errores" que saca `npm run lint` en esta sesión
son de `.claude/worktrees/<otro-worktree>/.next/build/...` — build de OTRA
sesión que quedó dentro del repo y que ESLint recorre igualmente; no son de
este trabajo, no se tocó esa carpeta), `comprobar-namespaces-cliente.mts`
OK, `compileDebugKotlin` OK.

**Los dos huecos de i18n que se habían dejado fuera, arreglados a
continuación (mismo pedido, "adelante con las pendientes"):**
- **Orden de secciones del perfil** (Ajustes → General): los 9 nombres
  arrastrables ("Resumen del año (Wrap)", "Estadísticas rápidas"…) vivían en
  `SECTION_LABELS` (`lib/profileSections.ts`) fijos en español.
  `ProfileSectionOrderEditor.tsx` ya tenía `useTranslations("Perfil")` para
  su texto de ayuda — ahora también para las etiquetas
  (`ProfileSectionOrderEditor.labels.*`, 4 idiomas). `SECTION_LABELS` se
  quitó del todo (nada más lo usaba).
- **`ERRORES_PERFIL`** (los `?error=` de `/api/profile/update`: handle
  inválido, contenido ofensivo, demasiados intentos…) en
  `ajustes/page.tsx`: el diccionario en español se sustituyó por una lista
  de claves válidas y el texto sale de `ajustesErrores.*` (namespace
  `Onboarding`, 4 idiomas).

Probado a mano cambiando a francés: orden de secciones y el aviso de error
(`?error=handle_invalido`) salen ya en francés.

## Tercera tanda del 30 sept 2026 ("haz todo lo que puedas")

Decisiones del usuario en esta tanda: retos entre amigos = **ganador por
reto** (grupo cerrado de invitados); `@maricon439` → **`@mojaso`** (hecho
desde `/admin/usuarios/<id>`); **rediseñar la landing**; la tarjeta de
platino compartible se da por buena; paleta **platino para toda la app**.

- **Retos entre amigos** (`lib/retosAmigos.ts`, reglas puras en
  `lib/retosAmigosReglas.ts` con tests, `RetosAmigos.tsx` en /amigos):
  quien crea invita a 1-8 amigos para 7/14/30 días; gana quien más trofeos
  consiga (por `earnedAt`) entre los que aceptan; empate compartido; a cero
  no gana nadie; máx. 3 abiertos por persona. El cron los cierra 12 h
  después del fin (margen para la sincronización diaria) y avisa. Tablas
  `friend_challenge` y `friend_challenge_participant`
  (`scripts/crear-tablas-retos-amigos.mts`, **ya ejecutado**, con RLS).
  Errores devueltos como código y traducidos en `Perfil.RetosAmigos.errores`.
  **Sin probar con sesión** (la del navegador se perdió): solo se validaron
  las consultas de lectura contra la base.
- **Service Worker** (`public/sw.js`): guardaba solo el HTML de `/offline`
  (sin CSS/JS → sin estilos y sin minijuego offline). Ahora guarda también
  sus chunks y fuentes, se registra como `/sw.js?v=<commit>` (se reinstala
  en cada despliegue, `NEXT_PUBLIC_BUILD_ID` en next.config.ts), borra
  cachés viejas y no guarda la cabecera con sesión. **Trampa encontrada**:
  con "caché primero" para `/_next/static`, en `next dev` (nombres sin hash)
  servía el CSS de hace una hora — ahora es red primero y en desarrollo no
  se registra (y desregistra el que hubiera). Si en local los estilos "no
  se actualizan", mirar Application → Service Workers.
- **Landing rediseñada** (flujo de la skill impeccable, revisión
  independiente con veredicto *ship*): cuatro bibliotecas de ejemplo
  (PSN/Steam/Xbox/Epic) que se funden en un perfil con anillo de nivel
  (`components/landing/Convergencia.tsx`, animación SVG + contador, estático
  con movimiento reducido), vitrina de trofeos raros reales como cartelas
  (≤15 % de rareza, uno por juego, dos por cazador — `getRarestTrophiesThisWeek`),
  la caza en 4 pasos con trofeos reales de God of War Ragnarök, cinta de
  platinos solo de los últimos 30 días y solo con 4+. Textos en
  `Shell.Home.landing` (4 idiomas). CSS con prefijo `landing-` al final de
  globals.css. Se quitaron las cifras de relleno inventadas ("87", "4.312"…)
  que salían si la base daba 0. Brief y contrato en
  `.impeccable/surfaces/src-app-page-tsx.md`.
- **Paleta platino** (globals.css): `--accent-rgb: 124 196 228` por defecto
  (claro: 22 110 150); el azul de antes queda como `.accent-blue` en
  Apariencia. Fila "tú" de Amigos/Comparar pasada al acento.
- **Fotos de logros de Steam rotas**: la API devuelve iconos en
  `steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/…`, que da 404
  para juegos recientes. `iconoLogroSteam()` (steam/client.ts) los pasa a
  `shared.akamai.steamstatic.com/community_assets/images/apps/…`, y
  `scripts/migrar-iconos-steam.mts --aplicar` migró las 10.065 URLs
  guardadas (**ya ejecutado**). `TrophyPhoto` cae al icono del metal si una
  foto falla.
- Pie de página: los enlaces desbordaban a 375 px en toda la web (sin
  `flex-wrap`).
- Capturas de revisión fiables a 375 px: `node scripts/captura.mjs <url>
  375 812 <salida.png> 1 1` (emulación CDP; Chrome sin interfaz no baja de
  ~500 px de ventana y recorta).

## Cuarta tanda del 30 sept 2026: paletas, Ligas/Clanes "carreras" y aviso de trofeo

Ronda de dirección visual de la plataforma (skill impeccable). El usuario
eligió: poder elegir **todas las paletas**, estilo **"liga de carreras" solo
en Ligas y Clanes**, y seguir la recomendación de Claude para el resto
(pulir el mundo actual "pantalla de trofeos de consola").

- **Paletas completas** en Apariencia (mismo eje que el acento): Hoja de
  servicio (latón), Liga de carreras (naranja + amarillo ácido), Panel de
  salidas (ámbar), Datos (blanco y negro), Fósforo (verde) e Inmersión
  (cian). En modo oscuro cambian también fondo y superficies
  (`.dark.accent-*`); en claro/OLED/contraste solo el acento. Platino sigue
  por defecto y Azul como opción.
- **Ligas y Clanes = torre de tiempos** (`lib/librea.ts`,
  `components/carreras/Dorsal.tsx`, clases `.carreras-*`): librea fija por
  usuario/clan, puesto como dorsal "P1" en placa inclinada, diferencia con
  el líder, barrido al pasar el ratón, banda de librea bajo la cabecera del
  clan. Las páginas de clanes estaban en español fijo y con una clase de
  color rota (`bg-[var(--accent-rgb)]/10`): traducidas y arregladas.
- **Aviso "trofeo desbloqueado"** (`components/TrofeoDesbloqueado.tsx`):
  al sincronizar desde la web, si llegan trofeos nuevos, suben hasta 3
  tarjetas con la foto real y "+N". `syncNowAction`/`syncPlatformAction`
  devuelven `trofeos` y `nuevos`. **Sin probar con una sincronización real**
  (sin sesión en el navegador); se probó el componente montado aparte.
- **Pulido**: los velos sobre carátulas eran `#0a0d13` fijo con título
  blanco — en modo claro salía texto blanco sobre blanco o velo negro; ahora
  van con `background`/`foreground` del tema (portada con sesión y
  Planificador). Fuera las etiquetas en mayúsculas encima de títulos en el
  panel (pasan a subtítulo) y el texto con degradado del 404.
- "Crea tu primera tarjeta" (landing): marco del acento y recorte en el hijo
  interior (antes dejaba dos rayas sueltas del brillo).

## REDISEÑO DE TODA LA PLATAFORMA — TERMINADO (1 oct 2026) · LEER PRIMERO

El usuario pidió un rediseño visual de toda la plataforma **sin quitar ni
cambiar ninguna funcionalidad** ("las funcionalidades las mismas, solo
nuevos diseños"). Se eligió sección a sección con la skill `impeccable`
(página de decisión, rondas en `.impeccable/rondas/*.json`, respuestas en
`.impeccable/rondas/respuestas.txt`). Elecciones del usuario:

| Sección | Diseño elegido | Estado |
|---|---|---|
| Perfil | Carta holográfica | **Hecho** (`CartaHolo.tsx`, cabecera de `u/[handle]/page.tsx`) |
| Ficha de juego | Guía de estrategia | **Hecho** (vista lista de `TrophyList.tsx`: capítulos, casillas, margen, perdibles) |
| Biblioteca | Lomos de caja | **Hecho** (vista "lomos" por defecto en `LibraryGrid.tsx`) |
| Estadísticas | Calendario de calor protagonista | **Hecho** (`ActivityHeatmap` con `grande`, escala de metales) |
| Descubrir | Matriz dificultad × horas | **Hecho** (`MatrizDificultad.tsx`, `getMatrizDescubrir` en lib/discover.ts; datos reales: rareza del platino × horas medias de usuarios) |
| Comunidad | Muro de logros | **Hecho, sin verificar del todo**: dos columnas (`muro` en `ActivityFeed`), platinos con banner de portada — el banner no se vio con datos (no había platinos en la muestra) |
| Panel | Cabina de widgets | **Hecho** (`src/app/page.tsx` con sesión, clases `.cabina-*`): sin pestañas; rejilla de 12 columnas con bisel de esquinas en cada módulo, "siguiente platino" grande + platinos + lecturas, parejas de media anchura que pasan a ancho completo si falta una, pie "Editar panel" → /ajustes/ocultar. Sin arrastrar a propósito |
| Amigos | Marcador de estadio | **Hecho** (`amigos/page.tsx`, clases `.marcador-*`): isla oscura que redefine los tokens (también en modo claro), cifras LED con máscara de puntos solo en números, tu fila encendida, RetosAmigos/PlatinarJuntos dentro del mismo marco |
| Ajustes | Panel de control refinado | **Hecho** (`AjustesNav` con iconos y grupos, `.ajustes-*`): grupos con línea en vez de tarjetas, tira con scroll en móvil; vista previa fija desde 1280 px en Apariencia (mini app) y General ("Así te ven", lee el estado del formulario) |
| Noticias | Panel de salidas | **Hecho** (rondas 11, 1 oct tarde): `UpcomingGames variante="panel"` (fechas en letras de paleta, estado = cuenta atrás, ámbar si sale en <30 días; `compacto` para "recién llegados" en la columna lateral) y `TeletipoNoticias` para las últimas noticias. Isla oscura `.salidas` como el marcador. El módulo de lanzamientos del Panel sigue con las tarjetas de siempre |
| Descubrir (resto) | Lista de éxitos | **Hecho** (ronda 12): `components/descubrir/Exitos.tsx` — Top de la comunidad con numerales de contorno (podio en oro/plata/bronce = rango), Nuevas entradas numeradas, Joyas con la nota en grande; destacados con el puesto gigante (`HeroCarousel numerado`). Sin flechas de subida/bajada: no se guarda el puesto anterior |
| Plataformas de Descubrir | Banda de marca + lista de éxitos | **Hecho** (1 oct, noche): accesos solo de lo que sincroniza (PlayStation, Xbox, Steam, Epic; fuera Nintendo y Ubisoft), cada uno sobre su color de marca con el logo en blanco. `CabeceraPlataforma` en PS/Steam/Epic/Xbox, tendencia como `TopComunidad`, `RankedList` con numerales, `NewsFeed` como teletipo. **Página nueva `/descubrir/epic`** con los juegos gratis de la Epic Store (`lib/epicGratis.ts`, endpoint público `freeGamesPromotions`, gratis = `discountPercentage: 0`, comprobado contra la API real) |
| Páginas de plataforma | Cada una en su casa | **Hecho** (ronda 13, 1 oct noche): la página entera toma la paleta de su plataforma (`.casa-ps/-xbox/-steam/-epic` redefinen los tokens, así que rankings, carátulas y noticias se repintan solos; fondo a sangre con box-shadow + clip-path, sin 100vw). `DestacadoCasa` con arte grande de IGDB (`artesPorIgdb`, una sola consulta, probada contra la API): PS baldosas sobre arte a sangre, Xbox mosaico 1+4, Steam cápsula con miniaturas, Epic banner + lista (sus gratis). Cuerpo en dos columnas (lo propio | rankings); una sola si no hay rankings. Sustituye a la banda `CabeceraPlataforma` de la tanda anterior (borrada) |
| Revisión de las casas (1 oct, noche) | — | Lanzamientos sacados de la columna a una sección a lo ancho (`.casa-lanzamientos`, títulos alineados y sin cortar). Steam: "casi sin jugadores" a la columna izquierda para equilibrar alturas. Epic: noticias vía RSS público de Google News (`lib/epicNews.ts`; su web da reto de Cloudflare 403 y la API del blog devuelve `{}`, no se intenta saltar) y lanzamientos de PC con aviso de que IGDB no distingue tiendas |
| Ajustes al rediseño (1 oct, noche) | — | Marcador de Amigos y tablero de Noticias ya no son islas de color fijo: toman el suelo y el acento del tema (el ámbar queda solo en las letras de paleta). El Top de la comunidad y la "tendencia" de cada plataforma cuentan quién lo ha JUGADO en 30 días (`lastPlayedAt`), no quién lo añadió. Las filas de lista dentro de tarjetas llevan `.fila-lista` para no sacar el resplandor de hover fuera de la tarjeta |
| Paletas | Paleta de tu juego favorito | **Hecho** ("Desde tu juego" en Apariencia): `lib/paletaJuego.ts` (con tests) saca acento claro/oscuro y suelo del `auraColor` de la carátula y fuerza contraste ≥5:1; clase `.accent-juego` + variables `--juego-*` en el `<html>`, guardado en `apariencia.acentoJuego` y reaplicado por el script anti-parpadeo. Probado por el usuario con una carátula real |

Ya hecho antes (30 sept): paleta platino por defecto + 6 paletas completas,
Ligas y Clanes como torre de tiempos ("carreras"), aviso "trofeo
desbloqueado", landing nueva. DESIGN.md documenta el sistema hasta antes de
este rediseño por secciones: **pendiente relanzar el documentador**
(`impeccable-documenter`) para que recoja carta, guía, lomos, calendario,
matriz, muro, cabina, marcador, ajustes y paleta de juego.

Verificado el 1 oct (tarde): panel con datos reales de fende21 (1440 px),
Amigos y Ajustes con la sesión del usuario en el navegador del panel, en
1440/1280 y 375 px (sin scroll horizontal). Trampa vista de nuevo: una regla
de `globals.css` sin `@layer` (p. ej. `.marcador-fila { display: grid }`)
le gana a `hidden` de Tailwind — para ocultar en móvil, hacerlo en el propio
CSS, no con utilidades.

Verificación: sin sesión en el navegador de Claude; las páginas públicas
(perfil, ficha, biblioteca, estadísticas, Descubrir) se comprobaron con
`node scripts/captura.mjs <url> 1440 900 <png> 1 1` (y 375 812). Comunidad,
Panel, Amigos y Ajustes exigen sesión: pedir al usuario que inicie sesión en
el panel del navegador para verificarlas, o montar una página temporal con
datos reales (como se hizo con el muro) y borrarla después.

**Trampa nueva de esta tanda**: un componente de cliente con
`useTranslations("X.Y.z")` necesita "X.Y.z" en `src/i18n/clientMessages.ts`
o sale la clave en crudo; `npx tsx scripts/comprobar-namespaces-cliente.mts`
lo detecta. Y los porcentajes calculados en `style` de un componente de
cliente hay que redondearlos (`toFixed`) o hay desajuste de hidratación.

## Epic Games: extensión del navegador y progreso declarado (1 oct 2026)

**Qué pasó.** Al vincular Epic con un enlace válido salía "no encuentra ningún
perfil". Causa real: Epic (Cloudflare) devuelve 403 `cf-mitigated: challenge`
a las consultas del servidor (las dos que hacen falta), y cualquier fallo se
convertía en "perfil no encontrado". Un navegador de verdad sí pasa (probado
con la cuenta del usuario). Decisión: NO se intenta esquivar la protección
antibots (ni imitar huellas TLS ni nada parecido); la lectura la hace el
navegador del propio usuario.

**Qué se hizo.**
- `extension/epic.js` (content script en store.epicgames.com) hace las mismas
  consultas GraphQL que la página de "Mis logros" y `background.js`/`popup.js`
  lo envían a `POST /api/extension/epic-sync` (Bearer de la extensión, límite
  `epicExtension` 5 por 10 min, tope 4 MB). Probado con datos reales
  (Rocket League 53/88, Hogwarts Legacy 7/45, ~100 KB). Extensión v1.1.0.
- `src/lib/epic/extensionData.ts` valida/normaliza todo lo que llega (topes,
  formas, imágenes solo de dominios de Epic); `client.ts` expone los
  mapeadores puros (`bibliotecaDesdeResumenes`, `logrosDesdeDatos`);
  `sync.ts` acepta `epicDatos` y `linkEpicWithExtension` (profiles.ts) lo
  guarda con el flujo de siempre.
- Al vincular por enlace (formulario), un bloqueo de Epic da
  `EpicUnavailableError` (mensaje honesto) en vez de "no encuentro tu perfil".
- El servidor ya no resincroniza Epic: `resyncLibraries` lo salta y la cola
  de detalle del cron excluye `epic` (no puede leerlo y marcaría "sincronizado"
  en falso). Solo se actualiza al pulsar "Sincronizar Epic ahora" en la
  extensión. Si Epic algún día quita el bloqueo, quitar esas dos exclusiones.

**Progreso declarado (decisión del usuario).** El servidor no puede comprobar
esos datos, así que lo de Epic NO puntúa en ningún sitio. Lista única en
`src/lib/declarado.ts` (`PLATAFORMAS_DECLARADAS`) + helper SQL
`src/lib/declaradoSql.ts` (`noDeclaradoPorId`, por el prefijo `epic-` del id de
juego). Excluido en: nivel Paragon (`level.ts`, `paragonLevel.ts`), 100 % como
platino (`esPlatinoEquivalente`), Paragon Score, clasificación de amigos y
rankings semanal/mensual (`rankings.ts`), comparativa de amigos
(`profileStats`), ligas y retos de liga (`leagues.ts`), clanes, temporadas,
retos semanales (`missions.ts`), retos entre amigos, "platinar juntos"
(`coop.ts`), insignias (`medirLogros.ts`), cifras públicas de la portada
(`getGlobalStats`, `getTopHunters`, trofeos raros, platinos recientes). SÍ se
ve en biblioteca/ficha/estadísticas del propio usuario con la marca
`MarcaDeclarado` ("Progreso declarado localmente", icono con tooltip).
**Si se añade otro sitio que puntúe o clasifique, usar `noDeclaradoPorId` /
`esDeclarada`.** Pendiente de comprobar a mano: la app de Android (APIs
`/api/mobile/*`) usa las mismas funciones, pero no se ha probado allí.

**Límites.** La extensión no está publicada en ninguna tienda (instalación
manual en modo desarrollador, ver `extension/README.md`); el cron no puede
refrescar Epic; los datos los manda el cliente y no se pueden verificar
(de ahí lo de declarado). Tests: `tests/epicExtension.test.ts` (13).

## Trofeos en tu idioma y guías en vídeo por idioma (3 oct 2026)

**Idioma de los nombres.** `game_trophy.name/detail` guarda UN idioma por
juego (idioma base, comprobado en la base: **PSN y Xbox en inglés, Steam y
Epic en español**, ver `lib/idiomasTrofeo.ts`). Ahora, al abrir la ficha de un
juego, `lib/trofeosIdioma.ts` pide a la propia plataforma los nombres en el
idioma de la interfaz (es/en/de/fr) y los guarda en `game_trophy_i18n`
(+ `game_trophy_i18n_estado` para no repetir la petición; se reintenta cada
semana si la plataforma no localizó todo). **Sin traducción automática**: si la
plataforma no tiene el juego localizado (aprox. la mitad de Steam/Xbox), se
queda en el idioma base. Verificado contra las APIs reales: PSN
(`Accept-Language`, 100 %), Steam (`l=`), Xbox/OpenXBL (`Accept-Language`).
Epic y manuales no se traducen (Epic solo se lee desde la extensión).
- `getGameDetail(profile, gameId, idioma?)`: con `idioma` traduce; sin él, como
  antes (la API móvil y el bot de Discord no lo pasan: siguen igual).
  `Trophy.nombreOriginal` conserva el original porque **`isMissable` empareja
  por el nombre ORIGINAL en inglés (PowerPyx)**: no sustituir `r.name` antes.
- Listas (siguiente trofeo, recientes del perfil) solo leen lo ya guardado
  (`traduccionesEnCache`), sin llamar a ninguna plataforma.
- Xbox necesita el xuid de alguien con el juego (el dueño de la ficha): gasta
  del cupo de OpenXBL (150/h) la primera vez por juego e idioma.
- Etiquetas «Ultra raro / Muy raro…» ya salen en el idioma (`rarity(p, idioma)`).

**Guías en vídeo.** `videosGuiaTrofeo` (varios, no uno) busca en YouTube con
`hl/gl` del idioma, con el nombre del trofeo en ese idioma + «guía/guide/
Anleitung», y cachea en `trophy_guide_video` por trofeo e idioma (90 días; 2 si
no hubo resultados). El modal (`TrophyGuideModal`) muestra el vídeo, miniaturas,
«Siguiente vídeo» y la caja **«¿Qué te falta?»** (`videosGuiaTextoAction`:
texto libre + juego + trofeo; pide sesión, límite `guiaVideoTexto` 8/5 min,
filtro de lenguaje, **no se guarda** — mismo motivo que la auditoría del 25
sept). Sigue sin existir forma de saber QUÉ objeto concreto falta: ninguna
plataforma lo da (solo PSN a veces da el progreso 35/36). Pendiente, si se
quiere: listas de coleccionables escritas por la comunidad, y la API oficial de
YouTube (filtra mejor por idioma pero pide clave y tiene cuota ~100 búsquedas
nuevas/día) en lugar de leer el HTML. Tablas creadas con
`scripts/crear-tablas-traducciones-trofeo.mts` (ya ejecutado, RLS activado).

### Entorno local (Windows con Avast)
- Avast (Web/Mail Shield) intercepta HTTPS con su propio certificado. El
  servidor de desarrollo lanzado desde la app de Claude no heredaba
  `NODE_EXTRA_CA_CERTS` y el login fallaba con "Configuration" (fetch
  failed al pedir el token a Discord/Google). Arreglado en
  `.claude/launch.json` (`env`), que **no se sube** porque la ruta solo
  existe en este equipo. Para scripts sueltos con peticiones HTTPS,
  anteponer `NODE_EXTRA_CA_CERTS="C:\ProgramData\Avast Software\Avast\wscert.pem"`.
- **Scripts con `server-only`**: `npx tsx --conditions=react-server
  script.mts` carga el módulo vacío de `server-only` (como hace Next), sin
  comentar el import a mano como decía la nota antigua.
- Si el dev server se queda colgado minutos en una consulta trivial, mirar
  `pg_stat_activity`: una consulta "active" en `ClientRead` es una conexión
  del pool atascada en el lado de la app. Reiniciar el servidor lo arregla.
- Los scripts desechables van en `scratch/` (fuera de git), no en el
  scratchpad del sistema: desde fuera del proyecto no resuelven los
  paquetes de `node_modules`.

---

## Auditoría de la app Android (4 oct 2026)

Auditoría con Impeccable (`audit` nativo de Android): **10/20 al empezar**
(accesibilidad 2, rendimiento 2, tema 3, conformidad 2, adaptividad 1), más
fallos de seguridad del backend móvil. Arreglado todo, en orden, en estos
commits:

1. **Seguridad** (`13dfe34`):
   - El enlace `paragon://auth` llevaba el token en claro. Ahora la app
     genera una clave de 32 bytes por login (`?k=` en
     `/movil/entrar/{provider}`) y `/movil/enlazar` devuelve el token
     cifrado con AES-256-GCM (`?c=`; `src/lib/enlaceMovil.ts` +
     `EnlaceSeguro.kt`). Ni otra app que registre `paragon://` lo lee, ni un
     enlace fabricado te mete en otra cuenta (probado en el emulador: se
     ignora). Sin `k` (APK antigua), la página pide actualizar la app.
   - El logout desasocia el token de FCM (body `fcmToken`) y lo borra en
     Firebase.
   - Límites de peticiones en las rutas de `/api/mobile` que escriben o
     llaman fuera (`vincularCuenta`, `resync`, `pushToken`, `reaccion` +
     los existentes).
   - La sesión se excluye de las copias de seguridad
     (`backup_rules`/`data_extraction_rules`).
   - Epic aparece en Cuentas (declarado, `appLinkable: false`) y en la
     ficha.
   - La ficha y "Siguiente trofeo" usan el idioma del teléfono
     (`Accept-Language` → `idiomaDeCabecera`).
   - `CONTRACT.md` unificado con su copia de `android/`.
2. **Traducción** (`bf17e18`):
   - 538 textos en `android/i18n/textos.json` → `strings.xml` es/en/de/fr
     (`node android/i18n/generar.mjs`), con `Textos.t()` fuera de Compose.
   - Fechas en el formato del teléfono e idioma por app en Android 13+.
   - Los errores de red ya no enseñan el mensaje técnico de la excepción.
3. **Adaptación** (`0de79f7`):
   - Gesto de atrás predictivo, con `BackHandler` en la ruleta y en el
     Wrap.
   - Rail lateral y contenido de 840 dp a partir de 600 dp de ancho.
   - `imePadding`.
   - Botones de 24-40 dp pasados a 48.
   - Etiquetas de TalkBack en reacciones, comentarios y vistas; el pulso
     de la racha respeta "quitar animaciones".
4. **Rendimiento** (`cea450a`):
   - Esqueletos de carga.
   - ETag + `private, no-cache` en 13 GET grandes (`src/lib/etag.ts`) y
     caché HTTP de 10 MB en OkHttp (vaciada al cerrar sesión).
   - `PanelSyncWorker` cada 3 h y sin batería baja (antes cada 15 min).
5. **Colores** (`a6176ce`): marcas en el tema, tarjeta de platinos con el
   tema activo, widget día/noche. Siguen fijos a propósito: Wrap, Modo
   Enfoque y la paleta de ligas.
6. **Pulido** (`dbc25db`): lint sin errores ni fallos de traducción o
   formato.

**Verificado:**
- `compileDebugKotlin`, `assembleDebug` y `lintDebug` (0 errores).
- tsc, eslint y `npm test` (124 tests; nuevos: `enlaceMovil`, `etag`).
- En el emulador (Pixel 7a, API 35): login en es/en/de y enlaces falsos
  ignorados.

**Segunda tanda (5 oct 2026)**: icono, apariencia, minificado, errores traducidos.
- **Icono**: la P de la web, adaptativo con capa monocroma (iconos
  temáticos de Android 13); los accesos de PlayStation/Xbox/Steam enseñan
  la misma P. La marca de dentro de la app es la P (`ParagonMark`), ya no
  la gema con flecha.
- **Apariencia como la web y sincronizada** (`/api/mobile/appearance`,
  `lib/aparienciaCuenta.ts` compartido con la acción web): modos
  (sistema/oscuro/claro/OLED/contraste), 12 acentos y paletas, color libre,
  paleta de juego (la elige la web; la app la aplica), 8 estilos con su
  nivel mínimo y tamaño de texto. Pantalla propia (Ajustes → Apariencia)
  con muestra en vivo. Los temas de plataforma y la tipografía propios de
  la app desaparecen; el color propio antiguo pasa a color libre.
- **Panel reordenado**: primero el objetivo, luego un resumen único
  (`ResumenCard`), siguiente trofeo y al final lo secundario.
- **Errores del servidor traducidos** (`lib/mensajesApi.ts`).
- **R8**: release 26 → 6 MB, `versionCode 2 / 1.1`. Comprobado que la
  APK minificada parsea los JSON (con el modo demo) y arranca.
- **Modo demo** (solo debug) para revisar pantallas con sesión.
- Arreglado un cierre al arrancar sin Play Services o sin red (la tarea de
  FCM lanzaba la excepción).
- **Sin probar**: nada con datos reales (solo con el modo demo); el rail
  en tablet; una APK **firmada** de producción (solo probada con la clave
  de depuración). Para repartirla hará falta una clave propia.
**Tercera tanda (5 oct 2026)** — cuatro quejas del usuario:
- **"Reservar para el #25" siempre**: es por diseño el próximo hito redondo
  (#25, #50…), pero sin decir cuánto falta parecía fijo. Web y app dicen
  ahora "Reservar para el #25 · faltan 11". En la app, además, el número solo
  llegaba si ya había OTRO juego reservado; `/api/mobile/milestone` devuelve
  ahora `proximo` siempre.
- **Steam no se vinculaba del todo al momento**: al vincular solo se traían
  los logros de los 40 juegos más recientes y el resto "al abrir cada
  ficha". `completarDetalleSteam` (lib/sync.ts) trae el resto por lotes;
  banner con progreso `CompletarSteam` en Ajustes → Plataformas y en el alta
  (`/api/steam/completar`), y en la app al abrir Cuentas vinculadas y desde su
  sincronización de fondo (`/api/mobile/steam/completar`). Límite de uso
  `completarSteam`. **Sin probar contra Steam real** (no hay cuenta aquí):
  solo compila, tipa y la UI en el emulador.
- **Clanes sin botón volver**: `BackButton` en `/clanes` y `/clanes/[tag]`;
  en la app, cabecera con flecha en las hojas de clan y de liga
  (`CabeceraHoja`).
- **Bot de Discord con instrucciones claras**: guía de 5 pasos con el estado
  real de tu cuenta, problemas frecuentes y botón de invitación
  (`GuiaBotDiscord`): en Ajustes → Bot de Discord y pública en `/bot-discord`
  (la abre la app). Enlazada desde el interruptor de DM y "Cómo funciona".
- Idioma de la app en Ajustes → Idioma; selector de idioma de la web visible
  en la cabecera también en móvil.
**Sin probar:** todas las pantallas con sesión iniciada, porque exigen una
cuenta real. Tampoco el rail en tablet ni el teclado con un campo abierto.

**Al subir (`git push`):**
- El servidor nuevo deja de dar token a las APK viejas: hay que instalar la
  APK nueva a la vez.
- Las APK antiguas seguirán funcionando mientras no caduque su sesión
  (Bearer intacto), pero no podrán volver a iniciar sesión.

**Pendiente:**
- Los mensajes de error que vienen del servidor (`error` del JSON:
  límites, vincular cuenta...) siguen en español.
- `release` sin `minifyEnabled` (R8 necesita reglas para Moshi/Retrofit y
  probar un APK release).
- `versionCode` sigue en 1.
