# Paragon — traspaso

Estado del proyecto para retomarlo sin releer nada más. Última
actualización: **21 de octubre de 2026**.

Lo de cada día (qué se hizo, por qué y con qué commits) está en
[`docs/HISTORIAL.md`](HISTORIAL.md), de lo más nuevo a lo más viejo; lo de
antes del 23 sept, en [`docs/historial/`](historial/). Antes de dar
algo por nuevo, buscar ahí (grep): casi todo tiene historia.

## Dónde estamos (21 oct 2026) · leer primero

**Código**: la rama de trabajo `claude/focused-shannon-2l5u4p` es igual a
master (`f0aac88`, 21 oct). Regla del usuario: **siempre push a master**
(fast-forward desde la rama).

**CI**: todo en verde en `f0aac88` (el IPA de iOS a la segunda: la primera
vez GitHub canceló el job sin llegar a ejecutar ningún paso).
- *Comprobaciones* (web): tsc, eslint (sin errores ni avisos), 241 tests de
  vitest (incluida la paridad de claves e ICU de los 6 idiomas) y el
  comprobador de namespaces de `messages/`.
- *Build Android APK (KMP)*: tests de la app (`:shared:testAndroidHostTest`)
  y APK de debug.
- *Build iOS IPA (KMP)*: IPA sin firmar para Sideloadly, con el widget dentro.
  Tarda 40-50 min.
- *Publicar en las tiendas* (a mano): AAB de release de Android (R8) y, con
  los secretos, firma y subida a Google Play; IPA de TestFlight con los de
  Apple.
- *Sincronización frecuente de trofeos*: llama a `/api/cron/sync` con
  `CRON_SECRET` y falla si no recibe un 200.
- *Copia de seguridad de la base* (lunes): falla mientras no estén sus
  secretos (ver abajo).

**Las tres piezas**:
- **Web** (`src/`, Next 16.4.0 en Vercel, **`www.paragontrophies.com`**;
  `platinos-nine.vercel.app` sigue sirviendo `/api` y `/movil` para las
  apps y la extensión viejas). En **6 idiomas**: es/en/de/fr/it/pt
  (portugués de Portugal; `Admin` en it/pt es copia del inglés).
- **App Android** (`kmp/androidApp` + `kmp/shared`): versión 1.1
  (versionCode 2), 6 idiomas. APK de debug desde la CI. Push por FCM, widget
  de Glance, lector de QR, diseño v2. Lista para Google Play (falta la
  cuenta).
- **App iOS** (`kmp/iosApp` + `kmp/shared`): versión 1.1, 6 idiomas. IPA sin
  firmar (Sideloadly). Push (APNs) y widget (WidgetKit) solo con firma de
  pago.

**Vercel, plan Hobby: cuidado con el cupo** (21 oct). Se pasó de CPU activa
(5 h 24 min de 4 h) y de Fast Origin Transfer (10,29 GB de 10 GB). Hecho:
- Admin → Analítica ya no lanza 28 consultas a la vez (`lib/enSerie.ts`,
  `Suspense` por bloques, memoria de 2-5 min).
- Los enlaces solo precargan con intención (`components/Enlace.tsx`;
  **cualquier enlace nuevo debe importar `Link` de `@/components/Enlace`**,
  no de `next/link`). Antes cada `<Link>` visible renderizaba el layout raíz
  en el servidor por culpa de `app/loading.tsx`.
- **Portada, fichas de juego, perfiles, Descubrir, Noticias y eSports, sin
  sesión, salen ya hechos de la CDN** (`app/(publico)` + `src/proxy.ts`; detalle en docs/HISTORIAL.md). Reglas:
  nada dentro de `app/(publico)` ni de `components/paginas/*` con
  `conSesion={false}` puede leer cookies, cabeceras ni la sesión (o vuelve a
  renderizarse en cada visita); una página pública nueva que se quiera
  cachear necesita su copia en `(publico)` y su ruta en el `matcher` del
  proxy; las tarjetas sociales de ficha y perfil van por `/api/og/…`.
- Nivel y racha de la cabecera, 2 min de memoria por persona;
  `staleTimes.dynamic: 30`; imágenes OG y tarjetas cacheadas un día en la
  CDN; `robots.txt` echa a los rastreadores de IA y SEO.
- Firewall de Vercel (lo puso el usuario): **AI Bots en Deny** y **Bot
  Protection en Log**. No pasar Bot Protection a Challenge sin excepciones
  para `/api/mobile`, `/api/discord` y `/api/cron`: la app, Discord y el
  workflow de sincronización no son navegadores.
- El contador del ciclo no baja: el efecto se verá en el siguiente.

**Esperando al usuario** (no se puede hacer desde aquí):
0. **Epic Games**: marca aprobada, y desde entonces Epic solo acepta URL de
   redirección del dominio verificado (`client_redirect_domain_mismatch` con
   la de platinos-nine). En el portal de Epic, en el cliente de
   `AUTH_EPIC_ID`, añadir
   `https://www.paragontrophies.com/api/auth/callback/epic` a las URL de
   redireccionamiento (hecho el 22 oct). Ojo: la aplicación publicada está
   bloqueada y los cambios quedan en BORRADOR hasta otra revisión de Epic, así
   que hay que enviar el borrador a revisión y esperar. Hasta entonces Epic
   solo acepta `localhost` (probado: la de www da
   `client_redirect_domain_mismatch`; el cliente que usa la web es «Paragon
   Web»). Si en Vercel existe `AUTH_EPIC_REDIRECT_PROXY_URL`, borrarla.
   Probar: Ajustes → Plataformas → "Verificar con Epic Games".
   Si la revisión tarda: crear otro cliente en el mismo producto con la URL
   de www desde el principio y cambiar `AUTH_EPIC_ID`/`AUTH_EPIC_SECRET`
   (sin probar si el bloqueo de la aplicación le afecta).
0. **Extensión en la Chrome Web Store** (23 oct): ficha y permisos listos
   para copiar en [`docs/CHROME-WEB-STORE.md`](CHROME-WEB-STORE.md);
   paquete `public/descargas/paragon-extension.zip`. Alta de desarrollador
   (5 $), subir, enviar a revisión y, publicada, poner
   `NEXT_PUBLIC_EXTENSION_STORE_URL` en Vercel.
0. **Steam**: probar «Verificar con Steam» en Ajustes → Plataformas (no hace
   falta configurar nada; solo se puede probar con Steam de verdad).
0. **Cron externo cada 15 min** (5 minutos de trabajo, gratis). Hoy el cron
   corre cada 3-5 h (GitHub retrasa el suyo) y los avisos llegan tarde. En
   https://cron-job.org (o cualquier servicio de cron por URL):
   - URL: `https://www.paragontrophies.com/api/cron/sync`, método GET, cada
     15 minutos.
   - Cabecera: `Authorization: Bearer <el valor de CRON_SECRET en Vercel>`.
   - Activar el aviso por correo si falla.
   El workflow de GitHub se queda de respaldo. Para comprobarlo: Admin →
   Sistema → "Cron de sincronización" tiene que decir "hace pocos minutos".
   Más a menudo que cada 10 min no hace falta (cupo de CPU de Hobby).
0. **Secretos de la copia de seguridad** (2 minutos; código del 20 oct, ver
   "Copia de seguridad" en Operación). Sin ellos, el workflow del lunes
   falla y GitHub manda un correo:
   - `BACKUP_DATABASE_URL` = la `DATABASE_URL` de Vercel tal cual.
   - `BACKUP_PASSPHRASE` = una contraseña larga (20+), guardada también en
     el gestor de contraseñas: sin ella la copia no se abre.
   Luego Actions → "Copia de seguridad de la base" → Run workflow, y mirar
   que salga verde con "Restaurada: N tablas, M filas".
0. **NPSSO de PSN**: Admin → Sistema → "Comprobar ahora" (botón del 21 oct)
   tiene que decir que vale.
1. **Dominio** (`www.paragontrophies.com`, 21 oct). Comprobar que está
   hecho, a mano:
   - Google Cloud → el cliente OAuth: `https://www.paragontrophies.com` en
     "Orígenes de JavaScript" y `…/api/auth/callback/google` en "URIs de
     redireccionamiento", **sin borrar las de `platinos-nine`**. El cliente
     no está en el proyecto "Paragon" de Firebase: el número del principio
     de `AUTH_GOOGLE_ID` es el número de su proyecto.
   - Discord Developer Portal → OAuth2 → Redirects:
     `…/api/auth/callback/discord`.
   - Vercel: borrar `AUTH_URL`/`NEXTAUTH_URL` si apuntan al dominio viejo.
   - Secreto del repo `SITE_URL` = `https://www.paragontrophies.com`.
   - Google Search Console (propiedad de dominio, TXT en Cloudflare) y
     enviar `https://www.paragontrophies.com/sitemap.xml`; Bing importa
     desde Search Console.
2. **Google Play**: todo preparado en `kmp/play/` (guía en su README):
   cuenta de desarrollador (25 $), clave de firma y secretos
   `ANDROID_KEYSTORE_*`, primera subida a mano, formularios con las
   respuestas escritas. Con una cuenta personal nueva Google exige una
   prueba cerrada con **12 personas durante 14 días**. Ficha en 6 idiomas.
3. **Cuenta de desarrollador de Apple** (de pago): sin ella no hay push en
   iOS ni TestFlight. Después: identificadores, App Group, la app en App
   Store Connect, secretos `APPLE_TEAM_ID`, `ASC_KEY_ID`, `ASC_ISSUER_ID`,
   `ASC_KEY_P8` y variables `APNS_KEY`, `APNS_KEY_ID`, `APNS_TEAM_ID` en
   Vercel.
4. **Probar en un móvil de verdad** lo de octubre (lista abajo), y la app en
   italiano y portugués.
5. En unos días, Vercel → Firewall → Bot Management: ver qué apunta Bot
   Protection en Log antes de decidir nada.

**Epic de verdad** (23 oct). El login de Epic solo verifica la cuenta (Epic
no da logros por API y bloquea al servidor): los logros solo llegan con la
extensión, y no había de dónde sacarla. Hecho:
- **Extensión 1.4.0**: Ajustes enlaza a `store.epicgames.com/u/<id>?paragon=sync`
  y la página de Epic lee y envía sola, con aviso y "Volver a Paragon";
  `marca.js` le dice a Ajustes si está instalada y conectada.
- **Ajustes → Plataformas → Epic** (`components/ExtensionEpic.tsx`): el paso
  que toca (descargar/instalar, conectar o traer logros) y "vinculada, pero
  todavía sin logros" (`lib/epic/estado.ts`).
- **Descarga** `public/descargas/paragon-extension.zip`
  (`npm run extension:zip`; regenerarlo al cambiar la extensión).
- **Fallos del login de Epic** a Ajustes con motivo (cancelado, sesión
  perdida, fallo) en vez de a `/entrar` (`lib/epicVuelta.ts`). Auth.js manda
  `error=Configuration` también para `InvalidCheck`: el motivo "sesión
  perdida" se saca de si la petición traía la cookie `authjs.state`.
- En Windows: `scripts/textos-por-ruta.mts` no encontraba ninguna sección
  (`split("/")`) y `--comprobar` fallaba por CRLF; el test lanzaba `npx`
  sin shell. Arreglados los tres.

**Lo último** (20-21 oct; detalle en docs/HISTORIAL.md):
- **Italiano y portugués** en web y apps (21 oct). Test de paridad
  `tests/mensajesIdiomas.test.ts`: cada idioma con las mismas claves y
  argumentos ICU que el español. Al añadir un texto nuevo hay que ponerlo en
  los 6 (`messages/<Carpeta>/<idioma>.json` y `kmp/i18n/textos.json`).
- **Selector de idioma** con banderas redondas en SVG (21 oct).
- **Admin → Analítica completa** (21 oct): tráfico, audiencia (navegador,
  sistema, dispositivo, idioma, país, pantalla, campañas), cuándo se usa
  (mapa de calor), Web Vitals, 404, bots, embudo de altas, cohortes,
  plataformas, comunidad y calidad. Con donuts y barras
  (`components/admin/`). Sin cookies ni IP.
- **Admin → Registro y Sistema** (21 oct): registro de eventos 30 días,
  pausar la sincronización de una plataforma, lanzar el cron, aviso a todos.
- **Verificar la cuenta de Steam** con «Iniciar sesión con Steam» (OpenID
  oficial, 22 oct, `lib/steam/openid.ts` y `api/steam/verificar`). No necesita
  ninguna clave ni registro en Steam. Solo verifica, no sirve para entrar.
- **Verificar la cuenta de Epic** con el login oficial de Epic (21 oct,
  `lib/verificacion.ts`, compartido con Steam). Solo verifica, no sirve para entrar.
- **Wrap y Hoja de servicios** rediseñados (21 oct).
- **Login con Discord arreglado** (21 oct, `lib/authIss.ts`): Discord empezó
  a mandar `iss` y Auth.js lo rechazaba.
- **Dominio propio, SEO y cabeceras de seguridad** (21 oct).
- **Ajustes → Avisos** en web y app (20 oct): qué recibir y por dónde.
- **Copia de seguridad semanal** cifrada y probada (20 oct).

**Sugerencias** (opinión, 21 oct; nada de esto está pedido), por orden:
1. ~~Páginas públicas desde la CDN~~ y ~~ficha de Play en it/pt~~: hechas
   (21 oct). Siguiente candidato: `/descubrir` y sus plataformas, con la
   misma receta (copia en `(publico)` + ruta en el proxy).
2. ~~Avisar a quien deja de poder leerse~~ y ~~hora exacta en la campana~~:
   hechas (21 oct).
3. ~~Extensión y web instalable en 6 idiomas~~ y ~~huecos `{0}` en el
   generador~~: hechas (22 oct). La extensión 1.3.0 hay que recargarla (o
   publicarla) para que llegue a quien la tenga.
4. **Medir y recortar**: con la analítica nueva de Admin, en un mes se verá
   qué páginas no usa nadie (arcade, planificador…).
5. Ideas de producto: plan de platino guiado por juego (orden de trofeos,
   perdibles, sesiones), resumen semanal en push, varias cuentas de Steam
   para todos, `pt-BR` si llegan brasileños.

**Antes** (16-19 oct; detalle en docs/HISTORIAL.md, del más nuevo al más viejo):
- **Anuncios preparados y apagados** (19 oct, `lib/publicidad.ts`): AdSense
  con el mensaje de consentimiento certificado de Google, `/ads.txt`,
  huecos en Descubrir y en la ficha de juego, y textos de privacidad y
  cookies que cambian solos. Se encienden con una variable; guía abajo.
- **AdMob en la app de Android, apagado** (19 oct, `anuncios/Publicidad.kt`):
  consentimiento UMP primero, banner en el muro y en la ficha de juego,
  "Privacidad de los anuncios" en Ajustes y `/app-ads.txt` en la web. Se
  enciende con dos secretos del repo; guía en `kmp/play/README.md` (8).
- **Datos estructurados para Google** (19 oct, `lib/datosEstructurados.ts`):
  el sitio y su autor en todas las páginas, la app en la portada, cada
  perfil público (`ProfilePage`) y cada ficha de juego (`VideoGame`, con la
  nota de la comunidad si hay 3 votos o más). Usan el dominio público, así
  que cambian solos con el dominio nuevo.
- **Vigilancia del servidor** (17 oct): te avisa (push, DM y campana, una
  vez al día por problema) si la sincronización falla para todos o si
  Steam, Xbox o IGDB rechazan su clave o se quedan sin cupo
  (`lib/vigilancia.ts`). Admin → Sistema enseña cuándo pasó el cron por
  última vez.
- **DM de Discord en el idioma de cada persona** (17 oct).
0. **Push y avisos en el idioma de cada persona**: se escriben en español y
   se traducen al salir (`lib/avisosTraduccion.ts`) con `users.language`,
   que ahora guarda el idioma del móvil al abrir la app y el elegido en la
   web. Vale para push del navegador, Android, iPhone, la campana y todos
   los DM de Discord (los de trofeos, nivel, invitación y prueba, con
   `lib/textosDiscord.ts`; el resumen semanal, con la misma traducción).
1. **Avisos dentro de la plataforma**: bandeja (`lib/bandeja.ts`, tabla
   `aviso`) con todo lo que sale por push.
   - Web: campana en la cabecera con contador, lista y avisos flotantes.
   - App: campana en Inicio y pantalla Avisos.
   - Nuevos avisos: "ha aceptado tu solicitud" y "tu amigo ha sacado un
     platino" (este, solo en la campana).
2. **Google Play preparado**: "Eliminar cuenta" en la app, página pública
   `/eliminar-cuenta`, ficha y gráficos en `kmp/play/`, y subida automática
   en el workflow.
3. **"¿Lo compartes?" al sacar un platino**, en web y app, con imagen
   vertical 1080×1920 para Stories y la dirección de la web visible.
4. **Asistente para vincular cuentas**: "Comprobar" dice qué ajuste falta
   antes de vincular.
   - Web: `/vincular` y la bienvenida.
   - App: en Plataformas vinculadas.
5. **Aviso al desarrollador** cuando el `PSN_NPSSO` falla o le queda una
   semana, y su estado en Admin → Sistema.
6. **Cabecera sin sesión más corta**: Noticias y eSports pasan a Descubrir.

Antes (15 oct): varias cuentas de Steam en el mismo perfil (de momento solo
el desarrollador), avisos que abren su pantalla, límites en la API móvil,
lint a cero y las pantallas v2.

**Anuncios: el código está listo y apagado** (19 oct; detalle en docs/HISTORIAL.md).
Mientras no exista `NEXT_PUBLIC_ADSENSE_CLIENT` no se carga nada de Google,
`/ads.txt` da 404 y todo sigue como antes. Para encenderlos, en este orden:
1. **Dominio propio**: ya está (`www.paragontrophies.com`, 21 oct).
2. **Cuenta de AdSense** (https://adsense.google.com) y añadir el dominio
   como sitio. Google da el ID de editor `ca-pub-XXXXXXXXXXXXXXXX`.
3. En Vercel → Settings → Environment Variables (Production):
   `NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-…` y, si se quieren los huecos fijos
   (Descubrir y ficha de juego), `NEXT_PUBLIC_ADSENSE_SLOT=<id del bloque>`
   (AdSense → Anuncios → Por bloque de anuncios → Display). **Redesplegar**:
   las `NEXT_PUBLIC_` se meten al compilar.
4. Comprobar `https://<dominio>/ads.txt` (una línea `google.com, pub-…,
   DIRECT, f08c47fec0942fa0`) y pedir la revisión del sitio en AdSense.
5. AdSense → **Privacidad y mensajes** → "Reglamentos europeos" → crear y
   **publicar** el mensaje de consentimiento (IAB TCF v2.2, certificado).
   Idiomas: es, en, de, fr, it, pt. Opciones: "Consentir", "No consentir" y
   "Gestionar opciones". Sin publicarlo, en Europa solo salen anuncios
   limitados. La web ya carga la etiqueta de ese mensaje
   (`components/PublicidadScripts.tsx`) y el enlace "Gestionar cookies" del
   pie lo vuelve a abrir.
6. Opcional: "Anuncios automáticos" en AdSense; no hace falta tocar código.
7. **Vercel Pro** (~20 $/mes) en cuanto haya anuncios: Hobby es solo para
   uso no comercial.
**Aviso legal (LSSI) antes de los anuncios**: en España, una web personal
con anuncios es un "servicio de la sociedad de la información" y el art. 10
de la LSSI pide un aviso legal con nombre, **NIF**, **domicilio** y correo.
Hoy no hace falta (no hay actividad económica), y por eso no está: son datos
personales que el usuario tiene que decidir publicar. Al encender AdSense o
AdMob, añadir una página `/aviso-legal` con ellos (o una dirección postal
de empresa si la hay).
Con anuncios activos, el aviso de cookies propio se oculta (lo sustituye el
de Google) y `/privacidad` y `/cookies` cambian solos su texto para nombrar
a Google y sus socios. La app de Android lleva AdMob igual de preparado y
apagado (secretos `ADMOB_APP_ID` y `ADMOB_BANNER_ID`, más `ADMOB_APP_ID` en
Vercel para `/app-ads.txt`): guía en `kmp/play/README.md`, sección 8. iOS
aún sin anuncios.
Con poco tráfico los anuncios dan céntimos: los enlaces de afiliado en
"Platinos de oferta" y las alertas de precio pueden rendir antes.

**Pendiente de código** (nada pedido; lo más útil está en "Sugerencias"
arriba):
- **Anuncios en el canal de un servidor de Discord** (nivel, platino): siguen
  en español a propósito, los lee todo el servidor. Todo lo que llega a una
  persona (push, DM, campana) ya sale en su idioma.
- **Capturas de Google Play**: hay 2 (el mínimo) y con la app en español.
  Con 4-8 por idioma la ficha luce más (`npm run graficos-play` en `video/`).
- Ideas sueltas: abrir la pantalla de un clan concreto desde un aviso (la
  app no tiene ruta por clan) y que "Ver guía" de Enfoque abra el vídeo.

**Sin probar con datos reales** (aquí no hay base de datos ni salida a
Sony/Valve/Microsoft):
- El asistente de vincular con cuentas de verdad.
- La campana, el "¿Lo compartes?" y su imagen con un platino real.
- "Eliminar cuenta" desde la app.
- En un móvil: todo lo de octubre (avisos que abren su pantalla, Enfoque,
  Estadísticas, Atascados → Sesión, Comparar, Sesiones, widget de iOS,
  perfil completo, precios, DLC, QR).

**Sin probar en un móvil de verdad** (21 oct): la app en italiano y
portugués (textos largos que se corten) y la navegación web con la precarga
solo por intención.

**Dónde está cada cosa**:
- Textos de la web: `messages/<Carpeta>/<idioma>.json` (6 idiomas, con test
  de paridad); los namespaces de
  cliente en `src/i18n/clientMessages.ts`
  (`npx tsx scripts/comprobar-namespaces-cliente.mts` lo comprueba).
- Textos de la app: `kmp/i18n/textos.json` y `node kmp/i18n/generar.mjs`.
- Mensajes de error/éxito del servidor traducidos (web y app):
  `src/lib/mensajesApi.ts` (`FIJOS` y `PATRONES`); en la web pasan por
  `tr()` de `src/lib/mensajesWeb.ts`.
- Push: `src/lib/webPush.ts` (navegador), `src/lib/fcm.ts` (Android, y reparte
  los de iOS) y `src/lib/apns.ts` (iOS).
- Contrato de la API móvil: `src/app/api/mobile/CONTRACT.md`.
- Vigilancia y avisos al desarrollador: `src/lib/vigilancia.ts` (claves de
  Steam/Xbox/IGDB y sincronización caída; reglas en `vigilanciaReglas.ts`),
  `src/lib/credencialPsn.ts` (NPSSO) y `src/lib/avisoDesarrollador.ts`
  (avisar una vez, latido del cron).
- Avisos: `src/lib/avisos.ts` (`avisarUsuario`: push + Discord + bandeja),
  traducción al salir en `src/lib/avisosTraduccion.ts` (**si cambias la
  frase de un aviso, cámbiala también ahí**) con el idioma de
  `src/lib/idiomaUsuario.ts`,
  `src/lib/bandeja.ts` (la bandeja, tabla `aviso`), campana web
  `src/components/CampanaAvisos.tsx` (`/api/avisos`) y pantalla de la app
  `ui/avisos/AvisosScreen.kt` (`/api/mobile/avisos`). Un aviso nuevo se
  guarda solo si pasa por `avisarUsuario` o por `guardarAviso`.
- Compartir platinos: `src/lib/compartirPlatino.ts` (qué platino preguntar),
  `/api/trophy-card/[handle]/[gameId]` (`?formato=historia` = 1080×1920,
  plantilla en `src/lib/og/historiaPlatino.tsx`), `AvisoCompartirPlatino`
  (web) y `ShareTrophyDialog` / `TrophyShareCard` (app).
- Vincular cuentas: `linkAccount` en `src/lib/profiles.ts`; el asistente
  (comprobar sin vincular) en `src/components/AsistenteVincular.tsx`,
  `src/lib/diagnosticoCuenta.ts` y `src/lib/comprobarCuenta.ts`.
- Workflows: `.github/workflows/` (`comprobaciones.yml`,
  `build-android-kmp.yml`, `build-ios-kmp.yml`, `publicar-tiendas.yml`).
- Vídeo de promoción para TikTok (Remotion): `video/` (ver su README); las
  capturas de la web se rehacen con `npm run capturas` dentro.
- No se puede compilar la app en la nube de Claude (Google Maven bloqueado):
  la prueba de la app es siempre la CI.

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
| `overflow-hidden` recorta el propio `filter` del elemento que lo lleva | El resplandor de hover es `filter: drop-shadow`. Si el mismo elemento tiene `overflow-hidden` (para recortar una carátula a sus esquinas redondeadas), se recorta a sí mismo el resplandor. El recorte va siempre en un hijo interior, nunca en el elemento que declara el hover — ver `GameCard.tsx`. |
| "Estilo" es un eje aparte de "modo" y "acento" | El modo (claro/oscuro/OLED/contraste) cambia colores base; el acento, el color de marca; el estilo (`lib/apariencia.ts`) cambia la FORMA de toda la página — radio, sombra, tipografía, fondo. Los tres son independientes: se puede querer OLED + acento verde + estilo Vidrio. |
| Horas por juego: unificadas en el perfil, separadas por plataforma | En Estadísticas del perfil (`horasPorJuego`, `lib/profileStats.ts`) el mismo juego en dos plataformas suma sus horas en una fila — es "cuánto le he echado en total". En `/descubrir/[plataforma]` (`mostPlayedOnPlatform`, `lib/platformHub.ts`) se filtra `games.platform` ANTES de agrupar, así que cada plataforma solo cuenta sus propias horas. Las dos reglas son a propósito y no hay que igualarlas. |
| `avatarPersonalizado` decide si la foto subida a mano gana a PSN | `users.image` guarda a la vez la imagen de login (Google/Discord) y la subida a mano desde /ajustes — sin ese booleano no hay forma de distinguirlas. Solo `/api/upload` (subida real de avatar) lo pone a `true`. Cualquier sitio nuevo que resuelva un avatar tiene que pasar por `resolveAvatarUrl`/`avatarUrlSql`, nunca leer `users.image` a pelo. |
| Los logros de un juego: `defined` es solo-PSN, `definedTotal` es universal | `games.defined` (desglose por metal: bronce/plata/oro/platino) SOLO lo rellena PSN — Steam no tiene esa jerarquía. El total que vale para cualquier plataforma vive en `games.definedTotal`. Cualquier cosa que cuente "cuántos logros tiene este juego" sin mirar `definedTotal` como último recurso se deja Steam a cero, en silencio (pasó de verdad en `getGameTrophyBreakdown`). |
| Un `1fr` de CSS Grid no se encoge solo — hace falta `min-w-0` | A diferencia de un flex item, un `1fr` de grid tiene `min-width: auto` por defecto: si el contenido de dentro es más ancho que el hueco (una tira de scroll horizontal, por ejemplo), el TRACK entero crece para caber en vez de recortarse — eso empuja la página entera a scroll horizontal. Pasó en la ficha de juego (columna principal junto a la barra lateral de 300px). Cualquier columna de grid que pueda llevar dentro algo con `overflow-x-auto` necesita `min-w-0`. |
| Paragon Score es una cifra APARTE del nivel Paragon, nunca la misma | El nivel de la navbar/tarjeta de perfil (`lib/level.ts`, `paragonProgress`) solo cuenta metales de PSN (`game.earned`) y ya tiene un historial real de bugs de desincronización entre sitios. `lib/paragonScore.ts`/`lib/trophyScore.ts` es la puntuación unificada entre plataformas (PSN por metal, Xbox por Gamerscore real, Steam estimado por rareza) — vive aparte a propósito, no sustituye ni alimenta el nivel de siempre. |
| La fórmula pura de puntuación vive sin `server-only`, la consulta a la base sí lo lleva | `lib/trophyScore.ts` (la función `trophyScore`) no puede tener `server-only` porque la usa tanto el servidor como `TrophyList.tsx` (componente de cliente, para enseñar el XP de un trofeo suelto). `lib/paragonScore.ts` sí lo lleva, porque consulta Postgres — importa la fórmula de trophyScore.ts en vez de repetirla. |

---

**Textos de la web por sección (22 oct 2026).** Al navegador solo van los
textos que usan sus componentes de cliente, y por secciones:
`scripts/textos-por-ruta.mts` sigue los imports de cada carpeta de
`app/(app)` (y de las páginas de `app/(publico)`) y genera
`src/i18n/textosPorRuta.ts`; los globales van en `documento.tsx` y los de cada
sección los añade su `layout.tsx` con `<TextosRuta ruta="/seccion">`. Al
añadir o cambiar textos de cliente: `npx tsx scripts/textos-por-ruta.mts`
(la CI falla si está desfasado, o si una sección con textos no tiene su
`<TextosRuta>`). Si un componente le pasa `t` a una función de OTRO archivo,
el análisis no ve qué claves usa y manda el apartado entero; para evitarlo,
anotar `// @textos Ns.parte` en ese archivo (ver `TrophyList.tsx`).

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
  objetos de IGDB usan `coverUrl`; las tarjetas (`PosterCard`)
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

**Actualizado el 29 de septiembre de 2026** (lo de octubre está arriba, en
"Dónde estamos"). De la lista de abajo ya están
hechos: i18n de `relativeDate()` y de los retos semanales, filtro de
lenguaje en alemán y francés, Pase de Temporada, Vitrinas temáticas y las
notificaciones push (Web Push + FCM, hace tiempo). Sigue pendiente de
verdad:
- **Rendimiento, ideas medidas en la auditoría del 22 oct 2026** (detalle en
  docs/HISTORIAL.md):
  - ~~framer-motion en StatTile, MonthlySummary, ConfirmForm y Selector~~
    → hecho el 22 oct (CSS + `lib/useAparecer.ts`). Solo queda en
    `LibraryGrid` (animación `layout`) y `ProfileSectionOrderEditor`.
  - ~~~83 KB de textos en el HTML de cada página~~ → hecho el 22 oct:
    textos por sección (ver "Decisiones de arquitectura").
- **Rediseño visual de la landing**: sigue la decisión de no tocar la
  estética global.
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
- ~~Dominio propio~~ → comprado el 21 oct 2026: `paragontrophies.com`.

**Funciones acordadas y no hechas:**
1. ~~`igdbId` en `games` + emparejado.~~ → **Confirmado el 9 de septiembre**:
   413 de 470 juegos (88%) tienen `igdbId` poblado en producción — los
   scripts de Antigravity sí se ejecutaron de verdad. Este documento llevaba
   días sin confirmarlo.
2. ~~Compartir el Wrap como imagen~~ → hecho el 3 de septiembre de 2026, con
   `ImageResponse` de `next/og` (ya viene con Next, no hizo falta el paquete
   `@vercel/og` suelto). Ruta [`/api/wrap/[handle]`](../src/app/api/wrap/%5Bhandle%5D/route.tsx),
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
  ([profiles.ts](../src/lib/profiles.ts)) ahora devuelven `legible: false` (igual
  Google, que tampoco tiene lector real), y `syncLibrary`
  ([sync.ts](../src/lib/sync.ts)) corta explícito si la plataforma no es `psn` ni
  `steam`, por si algo vuelve a marcar `isPublic` sin querer. Ya no se le pide
  la biblioteca a Steam con un gamertag de Xbox. Se sigue pudiendo vincular la
  cuenta (queda guardada y visible), simplemente no sincroniza — que es lo que
  la propia UI ya decía ("en fase de desarrollo").
- ~~`unlinkAccountAction` solo desvincula PSN y Steam~~ → ahora acepta las seis
  plataformas ([actions.ts](../src/app/actions.ts)).
- ~~El cron por hora no despliega en plan Hobby~~ (Vercel: "Hobby accounts are
  limited to daily cron jobs") → `vercel.json` a `0 3 * * *` y lotes por
  pasada más grandes en [route.ts](../src/app/api/cron/sync/route.ts), para
  aprovechar la única ejecución diaria.
- ~~El nivel Paragon no cuadraba entre la navbar y la tarjeta del perfil~~ →
  [`lib/level.ts`](../src/lib/level.ts) calculaba `platinos` (XP de los
  platinos) y no lo sumaba al `total`, así que cualquiera con algún platino
  veía un nivel más bajo bajo el Wrap que en la navbar (`lib/paragonLevel.ts`,
  que sí lo suma). De paso arregla el propio donut de la tarjeta, que reparte
  sus 360° entre trofeos/platinos/completados sobre ese mismo `total`.
- ~~La app se sentía lenta~~ → `getLibrary` ([profiles.ts](../src/lib/profiles.ts))
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

### Copia de seguridad (20 oct 2026)

Cada lunes, el workflow "Copia de seguridad de la base"
(`scripts/copia-base.sh`) hace un `pg_dump` de los esquemas `public` y
`drizzle`, **lo restaura en una base vacía para comprobar que vale** (y falla
si no hay usuarios), lo cifra con AES-256 y lo deja como artefacto de esa
ejecución 90 días. El repo es público: el artefacto se puede descargar, por
eso solo sale cifrado. Lo de Supabase Storage (avatares, fondos) no entra.

Para restaurar (en Windows, con Gpg4win y las herramientas de PostgreSQL
17; o en cualquier Linux):
1. Actions → la ejecución que quieras → Artifacts → descargar y descomprimir.
2. `gpg --decrypt --output paragon.dump paragon-AAAA-MM-DD.dump.gpg` (pide
   `BACKUP_PASSPHRASE`).
3. Mejor en un proyecto de Supabase **nuevo** (cadena de sesión, puerto
   5432): `psql "<url>" -c "drop schema public cascade"` y después
   `pg_restore --no-owner --no-privileges -d "<url>" paragon.dump`. Luego se
   cambian `DATABASE_URL`/`DIRECT_URL` en Vercel.
   Para recuperar solo una tabla sin tocar el resto:
   `pg_restore --data-only -t <tabla> -f tabla.sql paragon.dump` y aplicar
   lo que haga falta a mano.

Variables de entorno (ver `.env.example`):

| Variable | Notas |
|---|---|
| `DATABASE_URL` / `DIRECT_URL` | Supabase. La segunda, solo para DDL. |
| `AUTH_SECRET`, `AUTH_GOOGLE_*`, `AUTH_DISCORD_*` | Auth.js. |
| `PSN_NPSSO` | **Caduca cada ~2 meses.** Cuando caduque, deja de sincronizar todo PSN. Desde el 16 oct el cron avisa al desarrollador (push + DM de Discord) una semana antes y en cuanto falla; estado en Admin → Sistema (`lib/credencialPsn.ts`). |
| `STEAM_API_KEY` | No caduca. |
| `IGDB_CLIENT_ID` / `IGDB_CLIENT_SECRET` | Twitch dev. |
| `CRON_SECRET` | Puesta y funcionando (16 oct: el workflow "Sincronización frecuente" recibe HTTP 200). Sin ella la ruta del cron devuelve 503 a propósito. El mismo valor va en el secreto `CRON_SECRET` del repo, con `SITE_URL`. |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Web Push (navegador/PWA) — `lib/webPush.ts`. Ya puestas desde la sesión del 6 de sept., faltaba anotarlas aquí. |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | **Nueva, de esta sesión.** JSON entero de la cuenta de servicio de Firebase (una sola línea), para `lib/fcm.ts` — el equivalente de las VAPID pero para la app nativa de Android. Ya puesta en Vercel por el usuario. |

**El cron**: `vercel.json` lo lanza una vez al día (`0 3 * * *`, lo máximo
del plan Hobby) y el workflow `sync-frecuente.yml` lo llama además "cada 30
min", que GitHub convierte en cada 3-5 h. Las dos vías usan `CRON_SECRET`.

**Migraciones:** la tabla `notification` se creó con SQL explícito
(`CREATE TABLE IF NOT EXISTS`), no con `db:push`, para no darle a una
herramienta la ocasión de proponer cambios sobre una base de producción.
Recomendado seguir así con lo aditivo. Mismo patrón para las tablas de
`game_difficulty_vote`, `game_guide`/`game_guide_reply` y, de esta sesión,
`trophy_guide` (`scripts/migraciones/crear-tabla-guias-trofeo.mts`): scripts en
`scripts/crear-*.mts`, ya ejecutados contra producción. Igual para columnas
sueltas: `users.profileSectionOrder`
(`scripts/migraciones/anadir-orden-secciones-perfil.mts`), `user_game.createdAt`
(`scripts/migraciones/anadir-createdat-user-game.mts`, para "Tendencias" en Descubrir) y,
de esta sesión, `users.avatarPersonalizado`
(`scripts/migraciones/anadir-avatar-personalizado.mts`, decide si el avatar subido a
mano gana a PSN), y de la sesión del 5 de septiembre,
`game_trophy.xp` (`scripts/migraciones/anadir-xp-game-trophy.mts`, Gamerscore real de
Xbox para Paragon Score) — **todas ya ejecutadas contra producción**. Los 5
índices de rendimiento (`scripts/migraciones/anadir-indices-rendimiento.mts`:
`user_game`/`user_trophy` por `gameId`, `activity` por `userId`/`gameId`,
`activity_comment` por `activityId`) también, mismo día. Sin confirmar si
`scripts/migraciones/anadir-igdbid-juegos.mts` y `scripts/migraciones/unificar-catalogo.mts` (de
Antigravity) llegaron a correrse — ver el punto 1 de "Pendiente". De esta
sesión, `fcm_token` (`scripts/migraciones/crear-tabla-fcm-token.mts`) — **ya ejecutada
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
