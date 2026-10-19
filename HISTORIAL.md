# Paragon — historial

Lo hecho en cada sesión, de lo más nuevo a lo más viejo. El estado actual,
cómo funciona el proyecto y la operación están en [`HANDOFF.md`](HANDOFF.md).
Partido del HANDOFF el 15 oct 2026, cuando pasaba de 2000 líneas.

## Octubre de 2026

**19 oct (2) — anuncios preparados (apagados) con consentimiento
certificado**. El usuario quiere ir metiendo anuncios; se deja todo lo que
pide AdSense listo antes del dominio, sin que cambie nada hasta encenderlo.
- `lib/publicidad.ts` (con tests): valida `NEXT_PUBLIC_ADSENSE_CLIENT`
  (`ca-pub-` + dígitos) y `NEXT_PUBLIC_ADSENSE_SLOT`; sin ID válido,
  `anunciosActivos()` es falso y no se carga nada.
- `components/PublicidadScripts.tsx` (en el layout): la etiqueta del
  mensaje de consentimiento de Google "Privacidad y mensajes"
  (`fundingchoicesmessages.google.com/i/pub-…?ers=1`, IAB TCF v2.2) con la
  señal `googlefcPresent`, y después `adsbygoogle.js`. AdSense espera al
  consentimiento por su cuenta.
- `app/ads.txt/route.ts`: la línea de Google, o 404 sin ID.
- `components/HuecoAnuncio.tsx`: bloque adaptable, solo si además hay slot.
  Puesto al final de Descubrir y en la ficha de juego (tras la lista de
  deseos), lejos de botones para no provocar clics sin querer.
- `components/GestionarConsentimiento.tsx`: "Gestionar cookies" en el pie y
  en /cookies, que vuelve a abrir el mensaje de Google
  (`googlefc.showRevocationMessage`).
- Con anuncios activos, `CookieBanner` (el aviso informativo propio) se
  oculta, y /privacidad y /cookies usan otros textos (Google y sus socios,
  cookies de publicidad, enlace a cómo usa Google los datos). En es/en/de/fr.
Probado en local con un ID falso: `ads.txt` correcto y las dos etiquetas en
el HTML; sin ID, 404 y nada de Google. Guía para encenderlo en el HANDOFF.

**19 oct — datos estructurados (JSON-LD) para Google**. No había ninguno.
`lib/datosEstructurados.ts` (funciones puras con tests) y
`components/JsonLd.tsx` (escapa `<`, como recomienda la guía de Next):
- Layout raíz: `WebSite` + `Person` (el autor, con los mismos perfiles que el
  pie, `PERFILES_AUTOR` en lib/site.ts).
- Portada sin sesión: `WebApplication` gratuita (web, Android, iOS).
- `/u/[handle]`: `ProfilePage` con la misma descripción que sus metadatos.
- `/juego/[id]`: `VideoGame` con desarrolladora, editora, géneros,
  plataformas, fecha (si IGDB la sabe al día) y `aggregateRating` solo con
  3 votos o más de la comunidad (nada inventado).
Todo con `dominioPublico()`, así que pasa solo al dominio nuevo. Se
comprobó en local que sale en el HTML; validar en producción con
https://search.google.com/test/rich-results. De paso se dejó en el HANDOFF
qué implica meter anuncios (Vercel Pro, AdSense con consentimiento
certificado, ads.txt, AdMob en la app).

**17 oct (2) — vigilancia del servidor y latido del cron**. Antes, si algo
se rompía, nadie se enteraba hasta que alguien protestaba.
- `vigilarServidor` (lib/vigilancia.ts), en cada pasada del cron:
  - Si en una pasada con dos o más cuentas no se sincronizó ninguna:
    "La sincronización falla para todos", con el primer error.
  - Una vez por hora (marca en `notification_log`, tipo `vigilancia-hora`;
    el cron borra las de más de dos días): una llamada barata a Steam
    (GetPlayerSummaries), OpenXBL (`/account`) y Twitch (token de IGDB).
    Avisa si falta la clave, si la rechazan (401/403; 400 en Twitch) o si
    se acabó el cupo (429). Una caída suya (5xx) o de red no se avisa: se
    arregla sola.
  - Cada problema, una vez al día como mucho (tipo `vigilancia`).
- `lib/avisoDesarrollador.ts`: lo común (quién es el desarrollador, avisar
  una vez por clave, el latido). `credencialPsn.ts` lo reutiliza.
- Latido: cada pasada que llega al final apunta su hora; Admin → Sistema
  enseña "Cron de sincronización · última pasada hace X" (verde < 1 h,
  amarillo < 6 h, rojo si más o nunca).
- No se pudo probar contra los servicios de verdad (el proxy de la sesión
  no deja salir a Steam, OpenXBL ni Twitch). Por eso solo se avisa con
  respuestas claras: lo dudoso no avisa.
- El cron más frecuente queda en manos del usuario: un cron externo por URL
  (pasos en HANDOFF.md, "Esperando al usuario").

**17 oct — DM de Discord en el idioma de cada persona**. Faltaban los que
arma lib/discordBot.ts por su cuenta: trofeos nuevos, platino, nivel,
invitación a una liga y el de prueba. Ahora salen de `textosDm(idioma)`
(lib/textosDiscord.ts, una tabla por idioma con los datos dentro, sin
patrones) con `idiomaDeUsuario`. El resumen semanal ya iba por
`enviarDmSiActivo`: se le añadieron sus frases a lib/avisosTraduccion.ts
(trofeos/juegos/platinos, racha y puesto en la liga, con plurales). Los
anuncios en el canal de un servidor siguen en español (los lee todo el
servidor). Tests: tests/textosDiscord.test.ts y el resumen en
tests/avisosTraduccion.test.ts.

**16 oct (7) — push y avisos en el idioma de cada persona**. Antes todas
las push salían en español.
- Los avisos se siguen escribiendo en español donde nacen, y se traducen al
  salir: `traducirAviso` (lib/avisosTraduccion.ts) con textos fijos y
  patrones para todos los avisos que hay (amigos, ligas, clanes, trofeos,
  perdibles, lanzamientos, precios, temporada, guerras de clanes, retos,
  platinar juntos y sesiones, estas línea a línea). Lo que no conoce sale en
  español. Los textos de aviso que el 16 oct (5) se pusieron en
  lib/mensajesApi.ts pasan aquí.
- Dónde se traduce: `enviarPush` (navegador), `enviarPushFcm` (Android y
  iPhone), `enviarDmSiActivo` (Discord) y la bandeja al leerla.
- El idioma: `users.language` (lib/idiomaUsuario.ts). Lo guarda la app con
  el idioma del móvil (Accept-Language) al abrir el panel y al registrar el
  token de push, y la web al cambiar de idioma o, si ya tiene la cookie
  NEXT_LOCALE, al cargar con sesión. La web sin cookie no lo toca: pisaría
  el de la app. Se escribe solo si cambia.
- Siguen en español: los DM de Discord de trofeos y nivel y el resumen
  semanal, que se arman aparte en lib/discordBot.ts y lib/resumenSemanal.ts.
- Tests: tests/avisosTraduccion.test.ts con las frases reales.

**16 oct (6) — HANDOFF al día y `CRON_SECRET` comprobado**. El HANDOFF
decía que faltaba `CRON_SECRET` en Vercel; no es así. El workflow
`sync-frecuente.yml` falla si `/api/cron/sync` no devuelve 200 y lleva todas
las pasadas en verde (la de las 13:24 UTC: HTTP 200, 2 cuentas
sincronizadas, `credencialPsn: null`). Las variables de Vercel no se pueden
leer desde aquí (403), así que se comprobó por el workflow. De paso: GitHub
retrasa los cron gratuitos, y el de "cada 30 min" corre en la práctica cada
3-5 h.

**16 oct (5) — avisos dentro de la plataforma**. Antes un aviso solo existía
como push: sin push activada, o al descartarla, se perdía, y dentro de la web
no había dónde verlo.
- Bandeja (`lib/bandeja.ts`, tabla `aviso`, se crea sola como
  `steam_account_extra`): todo lo que pasa por `avisarUsuario` se guarda,
  y también los avisos que mandaban push a mano (trofeos y platinos en
  sync.ts, solicitudes de amistad, invitaciones a ligas y clanes). El cron
  borra lo de más de 60 días.
- Nuevos: "ha aceptado tu solicitud de amistad" (push + bandeja, solo si
  estaba pendiente) y "tu amigo ha sacado un platino" (solo bandeja, sin
  push; categoría nueva "Platinos de tus amigos" en Ajustes → Avisos).
- Web: campana en la cabecera (`CampanaAvisos`) con contador, la lista al
  pulsarla (todo pasa a leído) y, lo que llega con la página abierta, un
  aviso flotante arriba a la derecha. Sondeo de `/api/avisos` cada 45 s solo
  con la pestaña a la vista (en Vercel no hay sockets baratos).
- App: campana en Inicio con contador (cada minuto) que abre la pantalla
  Avisos (`AvisosScreen`, `GET/POST /api/mobile/avisos`); tocar un aviso
  lleva a su pantalla con `rutaAppDeAviso`, como la push.
- Los avisos se guardan en español (como las push); al leerlos se traducen
  los más comunes (FIJOS y PATRONES nuevos en lib/mensajesApi.ts, con
  tests). Las push siguen saliendo en español: pendiente traducirlas al
  idioma de cada persona.

**16 oct (4) — Google Play preparado**. Lo que la tienda pide y se puede
hacer desde el código:
- **Eliminar la cuenta desde la app** (Google lo exige a toda app con
  cuentas): Ajustes → abajo, "Eliminar cuenta" con confirmación
  (`DELETE /api/mobile/profile` con `{ "confirmar": true }`, igual que
  `deleteAccountAction` de la web). Y la página pública `/eliminar-cuenta`
  (sin sesión, 4 idiomas, en el sitemap), que es la URL que pide la ficha.
- `kmp/play/`: textos de la ficha en es/en/de/fr (título ≤30, corta ≤80,
  completa), icono 512, gráfico destacado 1024×500 y capturas 1080×1920 con
  rótulo (las del móvil, 923×2000, Google las rechaza por pasar de 2:1; van
  dentro de un marco). Se rehacen con `npm run graficos-play` en `video/`.
  README con la guía de Play Console y las respuestas de cada formulario
  (seguridad de los datos, clasificación, acceso para la revisión...).
- Workflow "Publicar en las tiendas": tras firmar, sube el AAB a Google
  Play (`r0adkll/upload-google-play@v1`, pista y estado elegibles, novedades
  de `kmp/play/novedades/`) si están `PLAY_SERVICE_ACCOUNT_JSON` y la clave;
  si no, se salta y el AAB queda como artefacto. La primera subida de una
  app nueva tiene que ser a mano (la API de Play no la deja).

**16 oct (3) — "¿Lo compartes?" al sacar un platino**. Cada platino
compartido en Instagram o TikTok con la dirección de Paragon a la vista es
publicidad gratis. Las tarjetas ya existían, pero solo con el botón de la
ficha del juego.
- Qué preguntar: `platinoPorCompartir` (lib/compartirPlatino.ts) busca la
  actividad `platinum` más reciente de los últimos 7 días (la crea
  `syncGameTrophies` solo con un platino nuevo de verdad) que no esté en
  `notification_log` (`compartir-platino` / gameId). Compartir, "Ahora no"
  o la X la apuntan (`marcarPlatinoPreguntado`): una vez por platino. Como
  el platino suele llegar con el cron, se pregunta al abrir la web o la
  app, no en el momento.
- Web: `CompartirPlatinoPendiente` en el layout raíz (en `<Suspense>`, un
  fallo no rompe nada) saca `AvisoCompartirPlatino`, una tarjeta flotante
  con la imagen y "Compartir imagen" (`CompartirImagen`, que ahora acepta
  `onCompartido`). Textos en `Perfil.compartirPlatino`.
- Imagen vertical para Stories: `/api/trophy-card/{handle}/{gameId}?formato=historia&lang=xx`,
  1080×1920, carátula grande, cifras y la dirección de la web abajo, en el
  idioma de quien comparte (plantilla en lib/og/historiaPlatino.tsx). La
  horizontal de siempre sigue igual.
- App: al abrir (MainScreen) pide `GET /api/mobile/platino-por-compartir` y,
  si hay uno, abre `ShareTrophyDialog` con "¡Platino en X!" (la tarjeta 9:16
  de la app, que ahora lleva también la dirección de la web). Al cerrar o
  compartir, `POST` del mismo endpoint (CONTRACT.md).

**16 oct (2) — asistente para vincular cuentas**. Era donde más gente se
perdía: no sabía qué escribir (en Steam el nombre visible no vale) o
vinculaba una cuenta privada y veía la biblioteca vacía sin saber por qué.
- "Comprobar" lee la cuenta SIN vincularla y dice qué falta
  (`diagnosticarCuenta`, lib/diagnosticoCuenta.ts; la parte pura, con tests,
  en lib/comprobarCuenta.ts): cuenta encontrada; Steam, perfil público y
  «Detalles del juego» público por separado; PSN, trofeos visibles; Xbox,
  historial visible; y si ya es de otro usuario de Paragon, bloqueada.
  Límite `comprobarCuenta` (20 / 10 min).
- Web: `AsistenteVincular` (components/AsistenteVincular.tsx). Eliges
  plataforma, una ilustración enseña dónde está tu ID, comprueba y, lo que
  sale en rojo, otra ilustración marca el ajuste a tocar con los pasos de
  siempre (`privacyGuide`). Luego "Vincular" (o "Vincular igualmente"), que
  es el mismo `linkPlatform` de los formularios. Las ilustraciones son
  maquetas en HTML, no capturas: no se quedan viejas y salen en el idioma
  de quien mira. Está en la bienvenida (paso 2, sustituye a los tres
  formularios) y en `/vincular`, enlazado desde Ajustes → Plataformas.
  Textos en `Onboarding.asistente`.
- App: en Plataformas vinculadas, al vincular sale dónde está tu ID y un
  botón "Comprobar" (`POST /api/mobile/accounts/comprobar`, CONTRACT.md)
  con la misma lista; si algo falla, los pasos de dónde tocarlo se abren
  solos y el botón pasa a "Vincular igualmente".
- Epic no entra en el asistente: va con la extensión (Ajustes → Plataformas).

**16 oct — aviso de PSN y cabecera más corta**:
- `PSN_NPSSO` (la única credencial de PlayStation del servidor) caduca cada
  ~2 meses y, al caducar, PSN dejaba de sincronizar para todos sin que nadie
  se enterara. Ahora el cron llama a `revisarCredencialPsn`
  (lib/credencialPsn.ts) en cada pasada y avisa al desarrollador
  (`avisarUsuario`: push y DM de Discord si los tiene activos, enlace a
  Admin → Sistema):
  - si falta la variable o Sony rechaza el NPSSO, una vez al día;
  - una semana antes de los 60 días, una sola vez por NPSSO.
  Sony no dice cuándo caduca, así que se cuenta desde la primera vez que el
  servidor lo vio funcionar. El estado va en `notification_log` del
  desarrollador (sin tabla nueva): `psn-npsso-visto` con una huella (hash
  corto, el NPSSO nunca se guarda) y `psn-npsso` con los avisos mandados.
  La lógica pura, con tests, en lib/caducidadNpsso.ts. Al cambiar el
  NPSSO, la cuenta vuelve a empezar sola (otra huella). El NPSSO que ya
  estaba puesto empieza a contar el 16 oct: si caduca antes, avisa el
  "ha caducado".
- Admin → Sistema: la fila "PlayStation Network (NPSSO)" ya no es un punto
  verde fijo: rojo si falta o ha fallado hoy, amarillo la última semana, y
  los días que le quedan.
- Cabecera sin sesión: Inicio · Descubrir · Ligas · Cómo funciona. Noticias
  y eSports pasan a Descubrir (ya eran sus pestañas con sesión), para que
  quien llega nuevo vea qué es Paragon y no un portal de noticias.

**15 oct (tarde) — varias cuentas de Steam** (`f3800b2`, de momento solo el
desarrollador, `esDesarrollador` en lib/profiles.ts):
- La principal sigue en `platform_account`; las demás (hasta 3) en
  `steam_account_extra`, que la app crea sola la primera vez
  (`asegurarTablaSteamExtra`, lib/steamExtraDatos.ts) o con
  `scripts/crear-tabla-steam-extra.mts`.
- `syncLibrary` de Steam sincroniza después las extra: sus juegos van a la
  misma biblioteca. Los logros de un juego se piden con TODAS las cuentas y
  se juntan (`juntarLogros`, conseguido si lo tiene cualquiera, fecha más
  antigua), así que ninguna sincronización "desconsigue" lo de otra.
  `playtimeMinutes` y `lastPlayedAt` pasan a `greatest` para que dos cuentas
  con el mismo juego no se pisen.
- Web: Ajustes → Plataformas → "Otras cuentas de Steam" (añadir / quitar;
  al quitar, lo conseguido se queda). App: lo mismo al final de Plataformas
  vinculadas (`SteamExtraSeccion` en LinkedAccountsScreen.kt), con
  `POST/DELETE /api/mobile/accounts/steam-extra` y `steamExtra` en
  `GET /api/mobile/accounts` (CONTRACT.md).
- De paso: en Ajustes → Plataformas, "Sincronizar X" y "Desvincular X" van a
  la misma altura y tamaño.
- Para abrirlo a todo el mundo: quitar la comprobación de `esDesarrollador`
  en `anadirSteamExtraAction`, `ajustes/plataformas/page.tsx`,
  `api/mobile/accounts/route.ts` y `api/mobile/accounts/steam-extra/route.ts`.

**15 oct — lo que quedaba de código** (commits `3680eba` avisos, `887c9b0`
límites y lint, `2fd53c8` Enfoque, `cde5529` Estadísticas, `fb4f474`
Atascados, `04dace6` Comparar, `e8a922f` Sesiones; todos con la CI de
Android e iOS en verde):
- **Tocar una notificación abre su pantalla** (Android e iOS): los avisos
  llevan la ruta de la web y `ui/navigation/EnlaceAviso.kt` la traduce
  (`/juego/x` → ficha, `/u/<tú>/<juego>` → tu ficha, `/u/<otro>/<juego>` →
  la suya, `/u/x` → perfil, `/sesiones/x` → sesión, amigos/ligas/clanes →
  pestaña Ligas, `/ritmo` → Ritmo; lo demás se queda en Inicio). Android lo
  saca del intent (`paragon://open?path=` o el extra `url` con la app en
  segundo plano); iOS de `AppDelegate` → `AppIOS.abrirAviso`. Con tests.
- **Límite de peticiones** en las 14 rutas de escritura de `/api/mobile` que
  no tenían: `escritura` (60/min) y `vista` (240/min, el "visto" del muro).
- **Lint de la web a cero**: los `<img>` de CDNs externos llevan una nota por
  archivo (next/image gastaría la cuota del plan Hobby) e imports sin usar
  fuera.
- **Pantallas v2** según la maqueta:
  - *Modo Enfoque*: anillo al platino con el acento, AHORA (Ver guía abre la
    ficha en ese trofeo, Saltar pasa al siguiente) y DESPUÉS.
  - *Estadísticas*: cabecera Semana / Año / Siempre con cifra, comparación y
    barras, y fichas de estilo de caza y hora favorita. Datos nuevos del
    servidor: `periodos` en `GET /api/mobile/stats` (`periodosDeCaza` en
    `lib/history.ts`, cálculo puro y con tests en `lib/periodos.ts`).
  - *Trofeos atascados*: subtítulo y botón "Sesión" que abre Organizar con
    ese juego y trofeo ya elegidos (ruta `sessions/new?juego=&trofeo=`).
  - *Comparar*: fotos con VS, filas tú | dato | el otro y dos barras por
    juego en común.
  - *Sesiones*: Abiertas / Puedo ayudar / Mías y la lista agrupada por día.
  - El resto (Amigos y QR, Ligas, Clan, Ritmo, detalle de sesión,
    Apariencia, Cuentas) ya seguía la maqueta.

**13 oct — auditoría y seguridad de dependencias:**
- **Next 16.3.4 → 16.4.0**: la 16.3.x tenía un fallo crítico de ejecución
  remota de código en `next/og` (`ImageResponse`), que usamos en 5 rutas
  públicas (opengraph de perfil/juego/portada, firma, wrap, tarjeta de
  trofeo). También `eslint-config-next` 16.4.0 y `npm audit fix` (sharp,
  @grpc/grpc-js, source-map-js). `next build`, tsc, lint y los 143 tests, OK.
- Queda 1 aviso moderado: `uuid@9` dentro de `firebase-admin` →
  `@google-cloud/storage` → `gaxios@6`. Solo afecta a uuid v3/v5/v6 con
  `buf`, que gaxios no usa; no se fuerza con `overrides`.
- **CI**: la de Android ejecuta `:shared:testAndroidHostTest` (los tests de
  `kmp/shared/src/commonTest`, más los nuevos del lector de QR) antes de la
  APK; si falla uno, no sale APK y se sube `informe-tests-app`. Comprobaciones
  de la web ejecuta también `comprobar-namespaces-cliente.mts`.
- **Web traducida del todo**: los `{ error, warning, success }` de las server
  actions (`app/actions.ts`, `app/clanes/actions.ts`) pasan por
  `tr()` (`lib/mensajesWeb.ts`), que usa la misma tabla que la API móvil
  (`lib/mensajesApi.ts`, ~60 textos y ~15 patrones nuevos: vincular cuenta,
  carpetas, guías, Discord, push...). Los códigos en minúscula ("sesion",
  "limite"...) no se tocan: el cliente los convierte. Al añadir un mensaje
  nuevo a una acción, añadirlo también a `FIJOS`/`PATRONES`. Textos a mano
  pasados a `messages/`: invitaciones, acciones y guerra de clanes
  (`Perfil.ClanPage`), desglose de la liga mensual (`Perfil.LigasPage`),
  `error.tsx` (`Shell.Error`), y detalles de CardBuilder, ProfileForm y
  LanguageSwitcher. `global-error.tsx` lleva sus textos en los 4 idiomas
  dentro del archivo (sin next-intl: su proveedor es lo que ha caído) y elige
  por el idioma del navegador. App: "platinos" de Comparar, traducido.
- **iOS al nivel de Android** (punto 4 de la auditoría):
  - *Atrás*: `ManejadorAtras` en iOS usa el `BackHandler` de Compose
    (`ui-backhandler`), así el gesto de deslizar desde el borde cierra
    también la ruleta, como el botón atrás de Android.
  - *Push*: directas a APNs, sin el SDK de Firebase en la app.
    `AppDelegate.swift` pide permiso al iniciar sesión, recibe el token y se
    lo pasa a `AppIOS.registrarTokenPush`, que lo manda al mismo
    `POST /api/mobile/push-token` con el prefijo `apns:` (misma tabla
    `fcm_token`, sin migración). `enviarPushFcm` separa esos tokens y los
    manda por `lib/apns.ts` (HTTP/2 + JWT ES256 hecho a mano, sin
    dependencias). Variables del servidor: `APNS_KEY` (el .p8), `APNS_KEY_ID`,
    `APNS_TEAM_ID`, opcionales `APNS_TOPIC` (por defecto
    `com.paragon.app.kmp`) y `APNS_SANDBOX=1` para builds de Xcode. **Solo
    funciona con la app firmada por una cuenta de desarrollador de pago**: la
    IPA de Sideloadly con cuenta gratuita no tiene `aps-environment`.
  - *Widget*: extensión `ParagonWidget` (WidgetKit, Swift puro, pequeño y
    mediano): juego anclado y progreso, como el de Android. La app escribe
    los textos ya traducidos en el App Group `group.com.paragon.app.kmp`
    (`WidgetUpdater.ios.kt`) y le pide a WidgetKit que repinte.
- **Publicar en las tiendas** (`.github/workflows/publicar-tiendas.yml`, a
  mano desde Actions): Android saca un AAB de release firmado con la clave
  de publicación y `versionCode` = número de ejecución; iOS hace el archive
  firmado (firma automática en la nube con la clave de la API de App Store
  Connect) y lo sube a TestFlight. Versión de iOS: 1.1 (como Android).
  Secretos del repo que hacen falta:
  - Android: `ANDROID_KEYSTORE_BASE64` (el .jks en base64),
    `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
    Crear la clave una vez con `keytool -genkeypair -v -keystore
    paragon-release.jks -alias paragon -keyalg RSA -keysize 2048 -validity
    10000` y GUARDARLA: sin ella no se pueden publicar actualizaciones (o
    activar "Play App Signing" y que esta sea solo la de subida). Sin
    secretos el workflow saca el AAB sin firmar (sirve para probar R8).
  - iOS: `APPLE_TEAM_ID`, y una clave de la API de App Store Connect
    (Users and Access → Integrations → App Store Connect API, rol App
    Manager o Admin): `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8`. Antes, en
    developer.apple.com, dar de alta los identificadores
    `com.paragon.app.kmp` (con Push Notifications y App Groups) y
    `com.paragon.app.kmp.widget` (App Groups), el grupo
    `group.com.paragon.app.kmp`, y crear la app en App Store Connect.
- La auditoría del 13 oct queda cerrada: lo que falta está en "Dónde
  estamos", arriba.

**9 oct — perfil completo en la app y el mes día a día contra otro:**
- **Perfil de verdad** (`ui/perfil/PerfilUsuarioScreen.kt`, ruta
  `user/{handle}`): pantalla completa que sustituye a la hoja
  `FriendProfileBottomSheet` (borrada). Se abre al tocar a alguien en
  Comunidad, Amigos/Ligas, el podio o un clan, y tu tarjeta de la pestaña
  Perfil abre el tuyo ("Ver tu perfil"). Cabecera con el color de la foto,
  nivel, plataformas y clan; amistad, comparar y rival; cifras por metal,
  horas y completado medio; racha, este año y mejor mes; últimos 12 meses;
  rivalidad con tiras; últimos trofeos y jugado recientemente.
- **Mes a mes contra ti**: en ese perfil, flechas para cualquier mes; barras
  dobles por día (suyas en el acento, tuyas en gris), o la "carrera"
  acumulada (`ControlSegmentado` Por día / Acumulado); marcador del mes,
  días ganados por cada uno, mejor día, juegos del mes; tocar un día enseña
  los trofeos de los dos ese día. En tu propio perfil solo tu serie.
- **API**: `GET /api/mobile/users/{handle}` trae además juegos, oros/platas/
  bronces, horas, completadoMedio, racha, esteAnio, mejorMes, porMes,
  clan y ultimosTrofeos; nuevo `GET /api/mobile/users/{handle}/month?mes=`
  (`ellos` y `yo`). Contrato en CONTRACT.md. Textos nuevos `perfil_*`.
- Sin compilar en local (en la nube no se llega a Google Maven): la prueba es
  la CI de Android. Pendiente probarlo en el móvil.
- **10 oct**: estos dos cambios (9 oct) vivían solo en la rama
  `claude/focused-shannon-2l5u4p`; se han juntado con master (que ya tenía
  la barra de cristal, precios, rangos de clan...). Al juntar: la hoja
  `FriendProfileBottomSheet` se queda borrada y lo que master le había
  añadido (tocar un juego reciente abre SU ficha, `LocalAbrirJuegoDe`) pasa a
  `PerfilUsuarioScreen`, también en los últimos trofeos.


**8 oct — precios en la app y "Platinos de oferta":**
- **"Platinos de oferta"** (`lib/platinosOferta.ts`): ofertas de Steam de
  CheapShark (2 páginas, 120) cruzadas con la rareza GLOBAL de los logros de
  Steam (API pública sin clave): el logro más raro da la dificultad del 100 %
  con la escala de siempre (`dificultadDesdeRareza`, hasta nivel 6). Precio
  en euros de Steam España solo de las que se enseñan; horas de HLTB y ficha
  si el juego ya está en Paragon; sin los que ya tienes en Steam. No se usan
  las horas de HLTB ni los votos para filtrar: solo 22 juegos tienen horas y
  hay 1 voto (8 oct). Primera vez ~8 s (Steam juego a juego), luego caché.
  - Web: sección en Descubrir › Steam, en su propio `<Suspense>`
    (`components/PlatinosDeOferta.tsx`).
  - App: pantalla `ui/precios/PlatinosOfertaScreen` desde Perfil, con tus
    alertas de precio arriba.
- **Precio en la ficha de la app** (`TarjetaPrecioFicha`): Steam España en €,
  la tienda más barata y el mínimo histórico (CheapShark, en US$) y botón de
  alerta. No sale en tus propios juegos de Steam ni sin versión de PC
  (`lib/preciosJuego.ts`: AppID propio o el que enlaza IGDB). Es un elemento
  fijo de la lista: el índice de "bajar al trofeo" pasa de 4 a 5.
- API móvil (CONTRACT.md): `games/{id}/precios`, `price-alerts` (GET/POST/
  DELETE, mismas reglas que la web) y `platinos-oferta`. Modo demo con datos.
- Arreglo: "Ofertas en Steam" de Descubrir pintaba "€" con precios de
  CheapShark, que son dólares.
- **Sin probar en un móvil**: el emulador no arranca desde la actualización
  de Windows (26200 → 26300): `WHPX: Failed to setup partition` (acceso
  denegado). Probablemente basta con reiniciar el PC.

**7 oct (tarde) — cristal en la ficha, fotos de eSports y menú del clan:**
- **Cristal en la ficha del juego** (apps): el botón de volver es de cristal
  sobre la portada y, al pasar el título, se estira hasta ser una cabecera
  fina con el nombre (tocarlo vuelve arriba) — `CabeceraFicha` en
  `GameDetailScreen.kt`. La ficha tiene su PROPIO `HazeState`: la lista es la
  fuente y el cristal va encima, como hermano, con `HazeSourceSelection.All`.
  **Nunca un cristal dentro de su propia fuente** (probado con el estado de
  MainScreen: se pinta a sí mismo sin fin y la app se cierra).
- `ui/common/Cristal.kt`: `Modifier.cristal(...)` común (lo usan la ficha y
  la barra de abajo). Opaco con "Reducir transparencia" de iOS
  (`reducirTransparenciaSistema()`, expect/actual) y en modo **contraste
  alto** de la app. Ojo al probar: el emulador estaba en contraste alto y el
  cristal salía opaco a propósito; para verlo, modo oscuro.
- "Modo Enfoque" de la ficha iba tapado por la barra flotante: ahora se
  coloca con `huecoBarra()`.
- **Revisión de propuestas de cristal**: hecho lo de la ficha; **descartada
  por ahora la barra nativa de iOS 26** (SwiftUI `TabView`): toda la app es
  un único `ComposeUIViewController`, habría que partirla en cinco raíces de
  Compose, el encogimiento al hacer scroll no llega (las listas de Compose no
  son UIScrollView) y serían dos barras que mantener.
- **eSports — fotos y Avast**: Avast tiene `cdn-api.pandascore.co` (y desde
  este PC también `api.pandascore.co`) en su lista negra y avisaba por cada
  escudo. Las imágenes pasan ahora por `/api/esports/img?u=` (solo ese host,
  solo imágenes, caché larga en la CDN: `X-Vercel-Cache: HIT`); en
  desarrollo la ruta las pide a la de producción. `imagenEsports()` en
  `components/esports/util.ts`, la usa `Escudo`. Las iniciales que quedan son
  jugadores/equipos sin imagen en PandaScore. Si en local la página se queda
  sin partidos: excepción de `pandascore.co` en Avast.
- **Clanes (web)**: el menú "…" de gestión de un miembro salía cortado (la
  lista de contribución tenía `overflow-hidden`); ahora redondea cada fila y
  el menú se cierra al pulsar fuera o con Escape (`GestionMiembro.tsx`).
- **IPA sin Mac**: compilar iOS en este PC no es posible; el IPA sale de la
  CI al subir `kmp/` a master (~15-50 min) o con "Run workflow". La
  herramienta `ios-builder-test/` no está instalada y su `ios-build.yml` no
  está en master.
- **Pendiente de decidir — más plataformas**: Switch no tiene logros (solo
  registro manual, sin puntuar); EA y Ubisoft solo por la extensión, como
  Epic (declarado, no puntúa); **RetroAchievements** tiene API pública y
  podría puntuar (necesita una clave gratuita en `.env.local`); GOG por
  confirmar.

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
  - ~~Cristal en la ficha~~ (hecho el 7 oct por la tarde). Siguientes
    candidatas, con el mismo patrón: cabecera fina en Biblioteca y Perfil.
    No en las tarjetas (rendimiento; sobre fondo liso no se nota).
  - Solo iPhone con la cuenta gratuita: ~~barra de pestañas nativa de iOS 26~~
    (descartada, ver arriba), notificaciones locales de racha
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

---

## Historial anterior

Las sesiones del 3 al 23 de septiembre de 2026 (y los incidentes de esos
días) están en [`docs/historial/sesiones-3-23-sept-2026.md`](docs/historial/sesiones-3-23-sept-2026.md),
tal cual se escribieron. Se separaron el 30 sept porque este archivo pasaba
de 340 KB y ya no se podía leer entero de una vez. Buscar ahí (grep) antes
de dar algo por nuevo: casi todo tiene historia.

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
