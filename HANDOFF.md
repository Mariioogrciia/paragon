# Paragon — traspaso

Estado del proyecto y de la sesión de trabajo, para retomarlo sin tener que
releer todo el historial. Última actualización: **10 de septiembre de 2026**
(con Antigravity trabajando en paralelo todo el rato — más abajo hay un
aviso de qué tocó él).

---

## Sesión del 10 de septiembre de 2026 — Capacitor (Nivel 2 de "app nativa")

El usuario preguntó por pasar Paragon a app nativa. Se le explicaron tres
niveles honestos (PWA instalable / shell con Capacitor hacia las tiendas /
reescritura nativa de verdad) y pidió el Nivel 2.

### Por qué "shell", no una reescritura

Next.js con server actions, cron, auth por cookies de sesión y streaming no
sobrevive a un `next export` estático — así que en vez de reescribir la
app, [capacitor.config.ts](capacitor.config.ts) usa `server.url` apuntando
a la web de producción de verdad
(`https://platinos-nine.vercel.app`, el dominio que dio el usuario — **hay
que cambiarlo a mano en cuanto tenga un dominio propio**). Es el mismo
patrón que una Trusted Web Activity de Android, con Capacitor dando
también el lado de iOS. `capacitor-www/` es un placeholder que Capacitor
exige que exista pero que nunca se ve — solo aparecería si `server.url`
fallara al cargar (sin red, dominio mal puesto).

### Se casi duplica el manifest ya arreglado antes — ojo con esto

Al montar el PWA (antes de llegar a Capacitor en esta misma conversación)
casi se crea un `public/manifest.json` nuevo sin comprobar antes que
`app/manifest.ts` YA daba de alta un manifest real (arreglado en una
sesión anterior, antes de esta traspaso — favicon/manifest antes rotos,
ver el comentario de `layout.tsx`). Se revirtió a tiempo. **Aviso real de
verdad para quien retome esto**: `npx capacitor-assets generate` escribió
sin pedir permiso un `public/manifest.webmanifest` ESTÁTICO apuntando a un
`icons/` roto — Next sirve archivos estáticos de `public/` ANTES que sus
propias rutas dinámicas, así que ese archivo suelto habría estado
pisando en silencio el manifest de verdad en cuanto se desplegara. Se
borró. Si se vuelve a correr ese comando, comprobar que no reaparece.

Sí se aprovechó para arreglar dos cosas menores que sí hacían falta:
[apple-icon.png](src/app/apple-icon.png) llevaba transparencia sin
aplanar (podía verse raro en iOS según el fondo del launcher) y el color
de splash del manifest (`#0e1217`) no coincidía exactamente con el fondo
real de la app (`#0a0d13`) — los dos ya alineados.

### Qué se generó

`npx cap add android` e `ios` — proyectos nativos completos en
`android/` e `ios/`, cada uno con su propio `.gitignore` (autogenerado por
Capacitor, cubre `Pods/`, `build/`, `DerivedData`, `local.properties`,
etc. — sí se comprueba a mano, no es responsabilidad puesta a ciegas).
Iconos y splash de verdad (no los del logo con fondo blanco por defecto
que generó `@capacitor/assets` la primera vez —
[resources/icon-foreground.png](resources/icon-foreground.png) +
[icon-background.png](resources/icon-background.png) con el fondo oscuro
real de la app, en vez del `icon.png` plano que da fondo blanco de
serie).

**`npm run build` de Next corre limpio con todo esto añadido** —
comprobación real, no solo `tsc --noEmit` (que también pasa limpio).

### Lo que el usuario tiene que hacer — no se puede montar desde aquí

Este entorno es Windows sin Xcode, sin Android Studio, sin cuenta de
Apple/Google Developer — nada de eso se puede tener ni simular desde
aquí. Para llegar a un `.apk`/`.ipa` de verdad:

- **Android**: instalar Android Studio, abrir la carpeta `android/`,
  compilar. Cuenta de Google Play Developer (25$ pago único) solo hace
  falta para PUBLICAR, no para probar en un móvil propio.
- **iOS**: hace falta un Mac con Xcode — no hay forma de evitarlo, Apple no
  permite compilar para iOS desde otro sistema. Cuenta de Apple Developer
  (99$/año) para firmar y publicar.
- **Push dentro del shell**: el Web Push que ya usa Paragon puede NO
  funcionar igual dentro de una WKWebView de iOS (limitación conocida,
  no de esta configuración) — si hace falta que funcione de verdad ahí
  dentro, el camino real es el plugin nativo
  `@capacitor/push-notifications` (APNs para iOS, FCM para Android), que
  no se ha montado esta sesión por quedar fuera de "solo el shell".

**Nada de esto se ha podido abrir en un dispositivo ni emulador real** —
sin las herramientas de arriba no hay cómo, desde este entorno.

---

---

## Sesión del 9 de septiembre de 2026 (continuación 9) — el webhook de Discord, sustituido por un bot de verdad

El usuario preguntó por un bot de Telegram, se corrigió a "de Discord" —
Paragon ya usa Discord como proveedor de login, así que hay una ventaja
real: quien inició sesión con Discord ya tiene su ID de Discord guardado
(`accounts`, provider='discord'), sin vincular nada aparte.

### Qué cambia

El webhook (`lib/discordWebhook.ts`, URL pegada a mano en Ajustes) queda
SUSTITUIDO por [lib/discordBot.ts](src/lib/discordBot.ts): mismo contenido
de aviso (trofeo nuevo / platino, con el mismo formato de embed de
siempre), pero por DM del bot en vez de a un canal. Nueva columna
`users.discordDmEnabled` (opt-in, `false` por defecto — mandar un DM sin
pedirlo sería spam); la columna vieja `discordWebhookUrl` se deja tal cual
en la base, sin que ningún código nuevo la lea ni la escriba.
[ProfileForm](src/components/forms/ProfileForm.tsx)/[Forms.tsx](src/components/forms/Forms.tsx):
el campo de URL se cambia por un interruptor simple, que solo funciona si
la cuenta inició sesión con Discord (si no, se explica por qué en vez de
enseñar el interruptor).

### Comandos de barra, primera versión

Nuevo endpoint
[/api/discord/interactions](src/app/api/discord/interactions/route.ts) —
HTTP puro (verificado con `tweetnacl`, nueva dependencia pequeña, sin
bindings nativos), nada de gateway ni proceso persistente, encaja tal cual
en una ruta serverless de Vercel:

- `/platinosalalcance` — el mismo radar de la continuación 6, top 5.
- `/quejuegohoy [minutos]` — el mismo recomendador de la continuación 7.

Los dos comandos identifican a la persona por su ID de Discord (quien
escribe el comando) buscando en `accounts` cuál es su cuenta de Paragon —
si nunca inició sesión con Discord ahí, se le dice tal cual, no un error
sin explicar. Nuevo
[scripts/registrar-comandos-discord.mts](scripts/registrar-comandos-discord.mts)
para darlos de alta en la API de Discord (no aparecen solos por escribir el
código — hay que decírselo a Discord aparte, una vez por comando nuevo o
cambiado).

### Lo que tiene que hacer el usuario — esto no lo puedo montar yo

Crear la aplicación de Discord y el bot es una cuenta/panel de terceros,
fuera de lo que este entorno puede tocar. Pasos completos en
`.env.example`, resumen aquí:

1. Developer Portal de Discord → crear aplicación → pestaña **Bot** →
   "Reset Token" → `DISCORD_BOT_TOKEN`.
2. Misma aplicación → **General Information** → Public Key →
   `DISCORD_PUBLIC_KEY`, y Application ID → `DISCORD_APPLICATION_ID`.
3. Con esos dos ya puestos en Vercel: en esa misma página, "Interactions
   Endpoint URL" = `https://tu-dominio/api/discord/interactions` — Discord
   manda un PING de prueba nada más guardar el campo, y si el endpoint no
   contesta bien (por eso hace falta tener el deploy con las env vars
   puestas ANTES de rellenar esto), ni deja guardarlo.
4. **OAuth2 → URL Generator** → marcar scope `bot` → permiso "Send
   Messages" → abrir la URL que genera e invitar el bot a un servidor
   propio (hace falta compartir servidor para poder mandarle DM a alguien).
5. `npx tsx scripts/registrar-comandos-discord.mts` — una vez, para dar de
   alta los dos comandos.

**Nada de esto se ha podido probar en vivo** — necesita las cinco cosas de
arriba puestas por el usuario. Compila limpio (`tsc --noEmit`), pero la
verificación real (¿el bot manda el DM de verdad? ¿el comando responde a
tiempo?) queda pendiente hasta que exista el bot.

**La migración pendiente crece otra vez**: `discordDmEnabled` se suma a
`hiddenNavItems`, `manualProgressCurrent`/`Target`, `acquisitionFormat` y
`pricePaid` de sesiones anteriores — cinco columnas ya esperando el mismo
`npm run db:push` bloqueado por el aviso de `push_subscription`, sin
resolver desde la continuación 5.

---

## Sesión del 9 de septiembre de 2026 (continuación 8) — sync cada 15 min por fuera de Vercel, i18n aparcado

El usuario preguntó por "varios idiomas y horarios", que resultó ser dos
cosas — una aparcada a propósito, otra construida:

**Multi-idioma: aparcado, era una idea suelta.** Confirmado que hoy la
interfaz entera está en español a pelo, sin ninguna librería de i18n
(`users.language` existe en la base pero de momento no traduce nada — ver
el comentario en `schema.ts` junto a `trophyGuides.language`). Es un
proyecto en sí mismo (next-intl + extraer cientos de textos de decenas de
archivos), no algo que quepa junto a otra cosa. El usuario lo confirmó:
no es prioridad ahora, queda apuntado para cuando lo sea.

**Sincronización cada 15 minutos — resuelto SIN tocar el plan de Vercel.**
El cron de `vercel.json` corría 1 vez al día porque el plan Hobby no deja
más (ya estaba documentado en el propio `route.ts` — se probó por horas
antes y Vercel rechazó el despliegue). En vez de pagar Vercel Pro (el
usuario lo descartó, prefiere gratis), nuevo
[.github/workflows/sync-frecuente.yml](.github/workflows/sync-frecuente.yml):
un cron de GitHub Actions que llama a la MISMA ruta `/api/cron/sync` cada
15 minutos desde fuera de Vercel — la ruta solo exige la cabecera
`Authorization: Bearer <CRON_SECRET>` de siempre, no distingue quién
llama, así que no hizo falta tocar ni una línea de `route.ts`. Revisado
que no hay ningún gate de "solo si no se sincronizó hace X" que lo hiciera
inútil llamarlo más a menudo — simplemente coge las cuentas más
desactualizadas en cada pasada (`POR_PASADA = 8`), así que con pocos
usuarios como los que tiene hoy Paragon esto significa que TODOS quedan
sincronizados en minutos, no en días. El cron diario de Vercel se ha
dejado tal cual, como red de seguridad.

**Para que funcione de verdad, el usuario tiene que hacer esto a mano en
GitHub** (Settings → Secrets and variables → Actions, del repo):
- Secret `SITE_URL`: el dominio real de producción, sin barra al final.
- Secret `CRON_SECRET`: el mismo valor exacto que ya tiene puesto en
  Vercel (Project → Settings → Environment Variables).

Sin esos dos secrets el workflow falla con un mensaje claro en vez de
fallar en silencio (comprobado en el propio script). No se ha podido
verificar la primera ejecución real porque necesita esos dos secrets
puestos por el usuario y GitHub tarda en arrancar el primer cron.

---

## Sesión del 9 de septiembre de 2026 (continuación 7) — el bloque medio de las propuestas de Antigravity

Las 4 ideas que se habían clasificado como "buenas pero de tamaño medio" en
la continuación 6, todas construidas.

- **Trophy DNA**: [lib/trophyDna.ts](src/lib/trophyDna.ts) pesa por TROFEOS
  GANADOS (no juegos ni horas) agrupados por género real de IGDB, mapeado a
  7 categorías propias — se dejaron fuera "souls-like" y "sigilo" de la idea
  original porque IGDB no tiene esos géneros y no hay con qué detectarlos
  sin adivinar (mismo motivo que ya descartó la heurística de subtítulos).
  Radar SVG a mano en [TrophyDnaRadar.tsx](src/components/TrophyDnaRadar.tsx),
  sin librería de gráficos. Visible en cualquier perfil, no solo el propio
  — no es información privada ni da vergüenza.
- **Coste por hora**: dos columnas nuevas en `userGames`
  (`acquisitionFormat`, `pricePaid` — [schema.ts](src/db/schema.ts)),
  rellenadas a mano desde [AcquisitionEditor.tsx](src/components/AcquisitionEditor.tsx)
  en la ficha de cada juego. `costePorHora()` en
  [lib/backlog.ts](src/lib/backlog.ts) solo cuenta con lo que el usuario ha
  puesto — nada de precio de mercado ni de adivinar. Mejores/peores
  amortizados en [CostePorHora.tsx](src/components/CostePorHora.tsx),
  Estadísticas, solo tuyo.
- **Control de formato/propiedad**: mismo `acquisitionFormat` de arriba
  (físico/digital/PS Plus/Game Pass/prestado/gratis), mismo editor. **No
  se ha hecho** el filtro "qué tengo en PS Plus que va a salir del
  catálogo pronto" que pedía la idea original — no existe ninguna fuente
  pública con fechas de salida del catálogo, ya se avisó de esto al
  valorar la lista.
- **"Tengo X horas hoy"**: [lib/recomendadorTiempo.ts](src/lib/recomendadorTiempo.ts),
  dos bolsas con dato real cada una — "victorias rápidas" (≤3 trofeos
  restantes, no depende del tiempo) y "para profundizar" (HLTB
  `completionist` menos horas ya jugadas, con margen del 30%; sin HLTB para
  ese juego, simplemente no entra, no se inventa una estimación con la
  barra de trofeos). Es puro TypeScript sin `server-only` a propósito: el
  cálculo corre en el propio navegador al cambiar de opción
  ([RecomendadorTiempo.tsx](src/components/RecomendadorTiempo.tsx), en el
  Panel, pestaña "Progreso y actividad").

**Compila limpio** (`tsc --noEmit` sin errores, comprobado después de cada
pieza). **Sigue sin verificarse en el navegador** — mismo motivo que las
continuaciones 5 y 6, el puerto 3000 lo tiene ocupado el servidor de la
otra sesión en paralelo.

**IMPORTANTE — la migración pendiente sigue creciendo**: a `hiddenNavItems`
y `manualProgressCurrent`/`manualProgressTarget` de sesiones anteriores se
suman ahora `acquisitionFormat` y `pricePaid`. Los CUATRO bloqueados por el
MISMO aviso de `push_subscription_endpoint_unique` (truncar 2 filas reales)
sin relación con nada de esto — documentado ya dos veces, sigue sin
resolverse. Quien retome esto: una sola vez, en una terminal con TTY,
`npm run db:push`, decidir esa pregunta con calma, y entran las cuatro
columnas juntas. Hasta entonces, todo lo de esta sesión y la anterior sigue
sin poder probarse de verdad en producción.

---

## Sesión del 9 de septiembre de 2026 (continuación 6) — legal, y el primer bloque de las propuestas de Antigravity

El usuario pidió mejorar la parte legal, y pasó una lista de 14 ideas de
Antigravity. Se le devolvió una valoración por bloques (fácil-ya /
medio-después / descartar por el mismo motivo que ya se descartó la
heurística de subtítulos: heurística o scraping frágil que no escala) y
pidió empezar por el bloque fácil.

### Legal: privacidad reescrita + cookies + términos, nuevos

[privacidad/page.tsx](src/app/privacidad/page.tsx) reescrita de cero (quién
trata los datos, qué se recoge de verdad hoy — incluye push y webhook de
Discord, que la versión anterior no mencionaba —, con quién se comparte y
por qué, derechos RGPD). Nuevas [cookies/page.tsx](src/app/cookies/page.tsx)
(Paragon no usa analítica ni publicidad, solo la cookie de sesión, exenta
de consentimiento por ley) y [terminos/page.tsx](src/app/terminos/page.tsx)
(no afiliación, fuentes de terceros no garantizadas, uso aceptable).
[CookieBanner.tsx](src/components/CookieBanner.tsx) nuevo — el usuario lo
pidió aunque no sea obligatorio hoy. Contacto: el correo personal del
usuario (gmail), porque `soporte@paragon.app` no es una bandeja real
todavía — se le explicó cómo montarla (ImprovMX/Cloudflare Email Routing)
para cuando quiera cambiarlo.

### El bloque "fácil" del backlog de ideas, las 5 construidas

- **Salón de la Vergüenza** + "jugar a ciegas": [lib/backlog.ts](src/lib/backlog.ts)
  (`salonDeLaVerguenza`) + [SalonDeLaVerguenza.tsx](src/components/SalonDeLaVerguenza.tsx)
  — el temporizador de 2h vive en `localStorage`, no en la base (es un
  empujón personal de este navegador, no algo que sincronizar).
- **Radar de "Platinos al alcance"**: `platinosAlAlcance()` en el mismo
  `lib/backlog.ts` + [PlatinosAlAlcance.tsx](src/components/PlatinosAlAlcance.tsx)
  — ≥75% de progreso, sin tocar en 2 meses, excluyendo lo ya platinado con
  `esPlatinoEquivalente` (el mismo criterio de siempre, no uno nuevo).
- **Contador manual +/-**: dos columnas nuevas en `userTrophies`
  (`manualProgressCurrent/Target`, [schema.ts](src/db/schema.ts)),
  `setManualTrophyProgress` en [profiles.ts](src/lib/profiles.ts),
  `actualizarContadorManualAction` en [actions.ts](src/app/actions.ts), y el
  widget dentro de [TrophyGuideModal.tsx](src/components/TrophyGuideModal.tsx)
  (la "ficha" de cada trofeo) — solo aparece si el trofeo no tiene progreso
  NATIVO de la plataforma y no está conseguido todavía.
- **Heatmap por franja horaria**: `franjasHorarias()` en
  [profileStats.ts](src/lib/profileStats.ts) (convierte a la zona horaria de
  Ajustes, no UTC a pelo) + [HourlyHeatmap.tsx](src/components/HourlyHeatmap.tsx).
- **Línea de tiempo de hitos**: `hitosHistoricos()` en el mismo
  `profileStats.ts` (primer platino, trofeo más raro, "platino añejo" —
  cuánto tardó desde el primer trofeo hasta el platino —, racha más larga
  de días seguidos) + [HistoricalTimeline.tsx](src/components/HistoricalTimeline.tsx).

Las cinco viven en `EstadisticasCompletas.tsx`, las dos de backlog (Salón +
Radar) solo en tu propio perfil (`esMio`) — son datos que solo le importan
o le dan vergüenza al dueño, no a quien visita.

### Ocultar del menú (continuación 5): correcto, sigue sin migrar

Añadido en la sesión anterior, revisado y sigue igual: `hiddenNavItems`
está en el código, no en la base todavía.

**IMPORTANTE — sigue sin correr `npm run db:push`, ahora con MÁS columnas
pendientes**: a lo de `hiddenNavItems` (continuación 5) se suman
`manualProgressCurrent`/`manualProgressTarget` de esta sesión. Los tres
bloqueados por el MISMO aviso interactivo sin relación con nada de esto
(`push_subscription_endpoint_unique`, truncar 2 filas reales) que ya se
documentó en la continuación 5 y sigue sin resolverse. Quien retome esto:
**una sola vez, en una terminal con TTY**, correr `npm run db:push`,
decidir con calma esa pregunta de `push_subscription` (probablemente
"no truncar"), y de paso entran las tres columnas nuevas juntas. Hasta
entonces: `/ajustes/ocultar` y el contador manual de trofeos fallarán en
producción (columna inexistente) aunque el código compile limpio
(`tsc --noEmit` sin errores, comprobado tras cada cambio de esta sesión).
No se pudo verificar nada de esto en el navegador tampoco: el puerto 3000
lo tenía ocupado el servidor de otra sesión trabajando en paralelo en este
mismo proyecto, igual que en la continuación 5.

---

## Sesión del 9 de septiembre de 2026 (continuación 5) — las tres peticiones de la sesión anterior, cerradas (con una migración pendiente)

El usuario respondió directamente a las tres preguntas que se habían
quedado abiertas en la continuación 4. Las tres se han construido esta
sesión:

### Campana de avisos: quitada del todo

El usuario confirmó "no tiene utilidad real, quitarla del todo". Se ha
quitado el botón de la cabecera y toda la ruta `/avisos`
([Header.tsx](src/components/Header.tsx), borrado
`src/app/avisos/page.tsx`, `avisosSinLeer` fuera de
[layout.tsx](src/app/layout.tsx)), y también la generación en el cron
([route.ts](src/app/api/cron/sync/route.ts)) y `marcarLeidoAction`
([actions.ts](src/app/actions.ts)) — no tenía sentido seguir generando
avisos que ya nadie puede leer. **A propósito NO se ha tocado**
`lib/notifications.ts` ni la tabla `notifications` de la base — código y
tabla quedan huérfanos pero intactos, por si alguien quiere revivirlo o
prefiere que se borre de verdad más adelante (eso sí sería destructivo).
Las estadísticas de `avisosGenerados` en `/admin` se quedan como estaban,
congeladas en el número histórico — no se ha tocado `lib/admin.ts`. La
copy de marketing de la portada (`FEATURES` en
[page.tsx](src/app/page.tsx), num. 06) hablaba de esto — cambiada a
describir el push de verdad (que sí sigue vivo, confirmado en
`lib/sync.ts` vía `enviarPush`), no de un hueco.

### Selector de plataformas: Epic, Google Play y Ubisoft ya no se pueden vincular

Tal y como pidió el usuario ("el resto quítalas de momento" + su propia
investigación sobre Epic, sin API REST pública documentada). En
[ajustes/plataformas/page.tsx](src/app/ajustes/plataformas/page.tsx) las
tres tarjetas de vincular solo se enseñan **si la cuenta ya estaba
vinculada de antes** (con su opción de desvincular intacta) — quien no
tenía ninguna de las tres ya no puede crear una nueva. No se ha tocado el
tipo `AccountPlatform` ni `resolveEpic`/`resolveUbisoft`/`resolveGoogle`
en `lib/sync.ts`/`lib/profiles.ts`: sigue siendo reversible sin tocar
datos, por si alguna de las tres consigue de verdad una vía oficial más
adelante.

### Ocultar funciones del menú — nuevo, personal, nada de comunidad

El usuario pidió "ocultar tanto funcionalidades que no te interese como
juegos". Esta sesión solo cierra la parte de **funcionalidades**: nueva
página [/ajustes/ocultar](src/app/ajustes/ocultar/page.tsx) con una
casilla por cada función opcional de la cabecera (Comunidad, Ligas,
Amigos, Descubrir, Noticias, Planificador — Panel y Biblioteca no cuentan,
son el núcleo). Columna nueva `users.hiddenNavItems` (jsonb,
[schema.ts](src/db/schema.ts)), leída/escrita desde
[lib/navPreferences.ts](src/lib/navPreferences.ts) y aplicada en
[Header.tsx](src/components/Header.tsx) — filtra tanto la barra de
escritorio como el desplegable "Más" y el menú móvil. Es 100% personal:
oculta la función de TU menú, no la desactiva para nadie más ni toca la
ruta (`/feed` sigue existiendo aunque la ocultes).

**"Ocultar juegos" de la biblioteca NO se ha tocado esta sesión** —
adrede: toca `getLibrary` en `lib/profiles.ts`, una función central que
usan la biblioteca, el perfil público, el planificador y más sitios, y
liarla sin tiempo de verificarla a fondo es justo el tipo de cambio
apresurado que ha dado bugs reales antes en este proyecto (ver el bug del
rendimiento de perdibles, sesión anterior). Queda para una sesión
dedicada solo a eso.

**IMPORTANTE — migración pendiente, no ejecutada**: la columna
`hiddenNavItems` está en `schema.ts` pero `npm run db:push` no se ha
podido correr — pidió una decisión interactiva sin relación con este
cambio ("¿truncar `push_subscription`, que tiene 2 filas reales, por un
`unique constraint` pendiente de antes?") que no se puede contestar a
ciegas desde un proceso no interactivo. Esa tabla es la de las
suscripciones push de verdad confirmadas en producción — no se ha tocado
ni respondido nada. **Quien retome esto tiene que correr
`npm run db:push` a mano** (una terminal con TTY), mirar bien esa
pregunta del `unique constraint` de `push_subscription` (posible resto de
trabajo de otra sesión en paralelo, no de esta) antes de decidir, y de
paso confirmar que se crea `hiddenNavItems`. Hasta que eso no se corra,
`/ajustes/ocultar` fallará en tiempo de ejecución (columna inexistente) —
el código compila limpio (`tsc --noEmit` sin errores) pero no se ha
podido probar en el navegador: el puerto 3000 lo tenía ocupado el
servidor de otra sesión trabajando en paralelo en este mismo proyecto.

---

## Sesión del 9 de septiembre de 2026 (continuación 4) — más cobertura de perdibles, y tres peticiones nuevas sin cerrar

### Perdibles: lista curada de títulos alternativos + los ":" rompen la búsqueda de PowerPyx

El usuario pidió expresamente lo de MGS4 "con mucho cuidado y para juegos
que se sabe" — nada de una regla genérica de subtítulo (ya descartada antes
por el caso real Resident Evil 4 vs Resident Evil 4 Remake, guías
distintas de verdad).

`TITULOS_ALTERNATIVOS` (lib/powerpyx.ts): mapa fijo, comprobado a mano uno
a uno contra powerpyx.com, de juegos reales de la biblioteca del usuario
que PowerPyx llama de otra forma —

- Metal Gear Solid 4: Guns of the Patriots → "Metal Gear Solid 4"
- Resident Evil 7: Biohazard → "Resident Evil 7"
- Marvel's Spider-Man: Miles Morales → "Spider-Man: Miles Morales" (sin
  "Marvel's" — comprobado que no colisiona con "Marvel's Spider-Man 2")
- Mafia: Definitive Edition → "Mafia 1 Remake: Definitive Edition"
- Call of Duty: WWII → "Call of Duty WW2"

Va como una tercera búsqueda en paralelo, usando el alternativo como su
propio objetivo de comparación — la comparación contra el título REAL de
PSN/Steam no se relaja. Verificado: las 5 guías se encuentran ahora (antes
0). MGS4 pasa de 0 a 24 perdibles. Los otros 4 dan 0 perdibles — comprobado
contra el HTML real que es CORRECTO (3 de esos 4 juegos tienen 0 perdibles
de verdad; Resident Evil 7 tiene 31 pero solo en prosa sin lista de
nombres, mismo caso ya documentado de Silent Hill 2).

**Hallazgo aparte, más general y sin el riesgo de una lista curada**: los
DOS PUNTOS por sí solos rompen la búsqueda de PowerPyx — "Call of Duty®:
Black Ops 4" da 0 resultados, "Call of Duty Black Ops 4" (mismas palabras,
sin ":") encuentra la guía real en primera posición. No es un cambio de
título, es un problema de cómo busca WordPress con ese carácter — se quita
de la CONSULTA (no de la comparación de igualdad, que sigue igual de
estricta). Arregla Call of Duty Black Ops 4 y Ghost of Tsushima: Iki
Island, sin tocar nada que ya funcionara.

### Tres peticiones nuevas del usuario, sin empezar todavía

1. **Función personal de "ocultar cosas"** — no de comunidad, algo como
   poder ocultar tarjetas/elementos que aparecen en algún sitio de la app
   que no interesan. **Sin concretar todavía qué se oculta ni dónde**
   (¿recomendaciones de Descubrir? ¿juegos sugeridos? ¿noticias?) — hace
   falta preguntarlo antes de construir nada, la sesión se cortó justo
   antes de esa pregunta.
2. **La campana de avisos "no tiene utilidad real"**, según el usuario —
   se empezó a revisar qué hace de verdad hoy (`Header.tsx` línea ~194-309,
   `avisosSinLeer`, ruta `/avisos`) pero se interrumpió antes de sacar
   ninguna conclusión. Sigue sin revisar a fondo.
3. **Quitar del selector de plataformas las que no se pueden sincronizar
   de verdad** (Epic Games, y probablemente Google Play/Ubisoft por el
   mismo motivo) — el usuario pegó una investigación real sobre la API de
   Epic: no existe una REST API pública documentada para leer logros de
   cuentas ajenas; solo queda ingeniería inversa de su GraphQL interno
   (que puede cambiar sin avisar) o apoyarse en proyectos de la comunidad
   (Legendary, Heroic Games Launcher) que ya descifraron su OAuth2. Nada
   de esto se ha decidido ni construido — sigue exactamente como estaba
   (`resolveEpic`/`resolveUbisoft`/`resolveGoogle` con `legible: false`,
   vinculable pero sin sincronizar, la UI ya dice "en fase de desarrollo").

**Para quien retome esto**: las tres siguen abiertas, ninguna se ha tocado
más allá de leer el código de la campana por encima. La 1 necesita una
pregunta directa al usuario antes de nada; la 3 es una decisión de
producto (quitar la opción de vincular del todo, o dejarla como está con
el aviso que ya tiene) más que un problema técnico nuevo.

---

## Sesión del 8-9 de septiembre de 2026 (continuación 3) — vídeo de guía cacheado, auditoría PSN, subtítulos descartados a propósito, hover

Cuatro cosas propuestas por Claude, no pedidas por el usuario, con luz
verde para todas.

### El vídeo de guía por trofeo ya existía — solo le faltaba caché y un "buscar otro"

El usuario pidió tener vídeos de localizaciones "más a mano" — ya existía
(`TrophyGuideModal.tsx`, clic en cualquier trofeo de la lista, busca solo en
YouTube y lo reproduce incrustado). Lo que sí faltaba, encontrado al
revisarlo: **nunca guardaba el resultado** — cada persona que abría el
mismo trofeo repetía la misma búsqueda de scraping en vivo. Arreglado con
`game_trophy.guideVideoId` (migración ejecutada): se cachea a nivel de
trofeo, no por usuario, la primera búsqueda vale para todo el mundo.

Efecto secundario real de cachear: si la primera búsqueda pilla un vídeo
irrelevante, se queda mal **para siempre**. Arreglado con
`rebuscarVideoGuiaAction` + botón "No es este — buscar otro" (solo en tu
propia ficha) — guarda TODOS los candidatos distintos de la búsqueda (antes
solo el primero) y ofrece el siguiente al que ya había, no el mismo de
siempre.

### PSN auditado con el mismo criterio que Xbox/Steam/IGDB — sin nada que arreglar

Tras el bug real de Xbox que tiró la app entera (ver la sesión anterior),
se revisó `lib/psn/client.ts` con la misma sospecha. Encontrado: sí hay
llamadas a `psn-api` sin `try/catch` propio (`horasJugadas`'s bucle
principal, el `Promise.all` de `fetchTrophies`). Pero a diferencia de
Xbox, **ya estaban protegidas en capas por encima** — `mapLimit` (ya
existía, no es de esta sesión) envuelve cada juego en su propio
`try/catch` ("un juego que falle no puede tumbar la sincronización
entera"), y `resyncLibraries`/`resyncPlatform` (arreglados en la sesión
anterior) protegen el nivel de cuenta. Ninguna ruta real llega sin
capturar hasta el layout raíz. Auditado de verdad, no solo revisado por
encima — conclusión honesta: no había nada que arreglar aquí.

### Coincidencia de título por subtítulo — investigado y DESCARTADO a propósito

Se planteó recortar el subtítulo tras ":" para que "Metal Gear Solid 4:
Guns of the Patriots" encontrara la guía de PowerPyx (que solo se llama
"Metal Gear Solid 4"). Probado contra PowerPyx real antes de escribir
nada: **"Resident Evil 4" y "Resident Evil 4 Remake" tienen guías
DISTINTAS y reales** — recortar "Remake" habría emparejado con el juego
original de 2005, un caso real y actual de "Blood and Wine" otra vez, no
teórico. Mismo problema con "Final Fantasy VII" vs "Final Fantasy VII
Remake". **No se implementó** — MGS4 sigue sin encontrar guía, a
propósito: correcto-pero-incompleto es mejor que adivinar mal. Quien
retome esto: cualquier heurística de subtítulo necesitaría una lista
curada de qué sufijos son "edición" (seguro) contra qué sufijos son "otro
juego" (peligroso), no un recorte genérico por ":".

### Auditoría de hover en todo el proyecto

Regla del usuario: todo control clicable necesita hover visible. Barrido
de todos los archivos con `<button>`/`onClick` sin NINGÚN `hover:` en el
archivo entero — tres casos reales, ninguno de hoy: `CardCarousel.tsx`
(las flechas tenían `transition-opacity` puesta pero sin ningún
`hover:opacity-*` que la disparara — declaración muerta),
`PriceHistoryChart.tsx` (mismo patrón que los chips de filtro de la
sesión anterior: fondo por `style` inline sin hover), y
`global-error.tsx` (sin clases en todo el archivo a propósito — el hover
de sus dos botones va por `onMouseEnter`/`onMouseLeave` en vez de CSS).
No es exhaustivo: un archivo con hover en un botón y sin él en otro no lo
detecta este barrido, solo "archivo entero sin ninguno".

### Barrido completo de `fetch` sin capturar — cerrado del todo, no solo lo encontrado por el camino

Después del bug real de Xbox, se fueron arreglando `xbl/client.ts`,
`steam/client.ts` e `igdb/client.ts` uno a uno según iban apareciendo.
Para cerrar esto de verdad (no solo "los que tuve la suerte de mirar"),
un barrido de los 13 archivos de `src/lib` con `await fetch(` — los diez
restantes (`discordWebhook.ts`, `google/client.ts`, `itad.ts`,
`platformHub.ts`, `prices.ts`, `psNews.ts`, `psPlus.ts`, `steamNews.ts`,
`xboxNews.ts`, más los dos de `app/actions.ts` de esta sesión) **ya
tenían su `fetch` dentro de un `try/catch` de verdad**, comprobado línea
a línea, no solo "el archivo menciona catch en algún sitio". Conclusión:
la clase de bug que tiró la app con Xbox está cerrada del todo en el
proyecto, no solo en los tres sitios donde se encontró por casualidad.

De paso, confirmado el `igdbId` de la lista de pendientes de más abajo
(llevaba días sin comprobarse): **413 de 470 juegos (88%) lo tienen
poblado en producción** — los scripts de Antigravity sí se ejecutaron.

### Perdibles: la caché de `fetch` de Next no acertaba de verdad — cacheado en la base

El usuario preguntó si el rendimiento se podía mejorar más. Medido en vivo:
tres visitas seguidas a la misma ficha tardaban igual (~1,3-1,5s cada una,
solo en la parte de perdibles) — la caché de 30 días que ya declaraba el
`fetch` (`next: { revalidate }`) no estaba acertando de verdad en este
entorno. Añadido `games.missableTrophies`/`missableTrophiesCheckedAt`
(migración ejecutada), mismo patrón que `guideVideoId`/`hltb` — caché en
base de datos, no en la del framework.

**Bug real encontrado al VERIFICARLO, no solo escrito y dado por bueno**:
la primera prueba en vivo escribió `missableTrophies: []` para Black
Myth: Wukong — vacío, sabiendo que tiene 7. Causa real: un fallo de red
(`fetch failed`, certificado TLS — propio de este entorno de pruebas
local con algún proxy/antivirus haciendo inspección TLS, no de
producción; el mismo tipo de error que ya salió con IGDB antes) que
`trofeosPerdiblesDe` capturaba en silencio y devolvía como si fuera "se
comprobó y no hay ninguno". Cachear eso habría dejado el juego marcado
sin perdibles 30 días por un fallo de un momento — el mismo error que ya
se evitó a propósito para HLTB, reintroducido aquí sin querer.

Arreglado con `trofeosPerdiblesDeConEstado` (lib/powerpyx.ts): distingue
"ok, no hay ninguno" (se cachea) de "falló la red" (no se cachea, se
reintenta la próxima vez). Verificado en vivo las dos ramas: con la red
fallando de verdad, la caché se queda sin tocar; sembrando el valor real
a mano, la siguiente carga lo lee sin volver a tocar PowerPyx.

**Aviso para quien retome esto**: este mismo entorno de desarrollo tiene
algo (proxy corporativo, antivirus con inspección TLS) que rompe `fetch`
a ciertos hosts externos (IGDB, PowerPyx) SOLO dentro del proceso de
`next dev` — un script `tsx` suelto contra el mismo host, en la misma
máquina, funciona bien. Si algo similar vuelve a pasar, no es
necesariamente un bug de código: comprueba primero si un script aislado
con `tsx` tiene el mismo problema antes de sospechar del código.

---

## Sesión del 7-8 de septiembre de 2026 (continuación 2) — filtros, notas privadas, HLTB de verdad, push confirmado en vivo, y un bug de rendimiento propio

Retomada varias veces la misma sesión larga. Va por tema.

### Filtros de trofeos, notas privadas por juego, guía externa

Tres piezas pequeñas, cada una en su commit:
- **Filtros en la lista/cuadrícula de trofeos** (Perdibles, Multijugador,
  Coleccionables, Historia, Habilidad, Secretos) — reutilizando
  `clasificarTrofeo` (ya existía, solo se usaba para el icono) e
  `isMissable` (de esta misma sesión). Solo se enseñan los chips que ESE
  juego tiene algo que mostrar.
- **Notas privadas por juego** (`user_game.notes`, migración ejecutada):
  un recordatorio tipo "me falta el coleccionable 14 del capítulo 3",
  nunca público — a diferencia de `review`/`rating`. Se trae solo en
  `getGameDetail`, no en `getLibrary`, para no mandar notas privadas en
  cada carga de la biblioteca.
- **"Guía completa" como enlace externo**, a propósito NO como función de
  comunidad propia: `game_guide` (el foro de guías que ya existe en
  `/juego/[id]/guias`) tiene 0 filas en producción, la misma trampa de
  siempre con pocos usuarios. Y a diferencia de perdibles, no hay una
  fuente única razonable para "mejor arma/armadura" — cada juego tiene su
  propia wiki con su propio formato. Un enlace a una búsqueda real
  ("`<juego> guía completa mejores armas y armadura`") en `/juego/[id]` y
  en la ficha de trofeos, sin sitio fijo (Fextralife/IGN/wiki oficial —
  varía por juego, el buscador ya lo resuelve solo).

### `TrophyTree.tsx` auditado con el mismo escepticismo que "perdibles"

Pedido explícito del usuario, con una corrección propia primero: **sí
estaba enganchado** (vista "Árbol" en `TrophyList.tsx`) — el HANDOFF
anterior decía mal que no se usaba en ninguna página.

Comprobado contra los 15.574 trofeos reales: hoy no rompe nada, pero
`querySelector('[data-trophy-id="${id}"]')` interpolaba el id del trofeo
SIN escapar dentro de un selector CSS — los logros de Steam llevan texto
libre de la desarrolladora (hay ids con espacios y puntos, "Leg day",
"geometry.ach.path08.08"; ninguno con comillas hoy, pero nada impide que
un juego futuro use uno con comillas y rompa el árbol ENTERO). Arreglado
con `CSS.escape()`. Y aviso añadido en la propia vista: las líneas del
árbol son puramente visuales (ni PSN ni Steam exponen qué trofeo
desbloquea a cuál) — sin decirlo, se lee como un tech tree real y no lo
es. Verificado en vivo contra Black Myth: Wukong (36 nodos, 35 líneas,
ninguna con coordenadas inválidas).

### HLTB arreglado de verdad — `howlongtobeat-ts`, no reconstruir el token a mano

El hallazgo de la sesión anterior (API de HLTB con token de seguridad en
dos pasos) se iba a replicar a mano — mejor idea, buscado en npm primero:
**`howlongtobeat-ts`** (github.com/Deadlock-too/howlongtobeat-ts),
publicada hace 2 semanas **explícitamente por este mismo cambio de API**,
mantenida activamente, con reintentos y manejo de 429/403 ya resueltos.
Cambiado `lib/hltb.ts` para usarla en vez del paquete viejo `howlongtobeat`
(desinstalado). Se mantiene "coger el mejor resultado por similitud, no
el primero" de antes, y se añade: un fallo de RED ya no marca el juego
como "comprobado sin dato" (antes cualquier error, incluida una petición
que no llega a completarse, escribía `hltb: {}` igual que "no existe").

Verificado de punta a punta contra producción: Black Myth: Wukong → 37.8h
historia / 48.4h main+extra / 67.7h platino, guardado y leído de vuelta.

**Horas estimadas en la ficha del juego** (pedido explícito: "por un lado
modo historia y por otro para el platino"): `HltbCard.tsx` nueva, dos
cifras separadas — distinta de `EtaPlatinoCard` (esa calcula CUÁNDO
terminarás TÚ según tu ritmo real, solo tiene sentido si ya has empezado;
HLTB es la media de la comunidad, útil incluso antes de empezar).
`AutoSyncHltb` dispara la búsqueda una vez si `game.hltb` es `undefined`
(nunca comprobado) — distingue de `{}` (comprobado, sin dato) para no
repetir la búsqueda en cada visita. El Planificador también separa ahora
"⏱ Xh historia" / "🏆 Xh platino" en vez de un número combinado, y el
desplegable "Más rápido (HLTB)" se oculta solo cuando ningún juego del
plan tiene dato todavía (vuelve a aparecer solo).

**Aviso real del propio paquete**: HowLongToBeat bloquea rangos de IP de
centros de datos (como los de Vercel) en el paso de "init" — si eso pasa
algún día, se ve como un fallo de red normal, sin romper nada (mismo
criterio que PowerPyx/OpenXBL, riesgo asumido a propósito).

### Push de verdad confirmado en producción, con el usuario mirando

Pendiente de sesiones anteriores, cerrado del todo esta vez: el usuario
activó notificaciones en `/ajustes` (con su navegador real, permiso
concedido) y probó el botón "Probar" — no le llegó nada en el momento
porque estaba lejos del dispositivo (jugando a la consola). Se comprobó
en paralelo, con acceso a la base de producción: la suscripción SÍ se
guardó bien (`push_subscription`), y un envío directo con
`webpush.sendNotification()` contra esa suscripción real recibió
**201 de Google (FCM)** — el problema no estaba en el código. Un segundo
envío, con el usuario ya delante, **confirmado recibido de verdad**. VAPID
en Vercel + suscripción + entrega, las tres piezas verificadas en
producción con datos reales, no solo revisadas a mano.

### Bug propio: la mejora de búsqueda de perdibles duplicó el tiempo de carga

Reportado por el usuario poco después de desplegar: "va lenta la página",
solo con sesión iniciada. Medido en vivo contra producción: las páginas
públicas cargan en ~0,15-0,2s (nada que ver), así que el cuello de
botella estaba en las páginas con datos de usuario. Aislado con más
medición: `buscarGuia` (lib/powerpyx.ts) tardaba **1,1-1,8 segundos SOLO
ahí** — el arreglo de esta misma sesión para el caso Elden Ring/Nightreign
añadió una segunda búsqueda EN SECUENCIA (primero con "Trophy Guide"
añadido, si falla el título pelado), y el caso más común de verdad es que
NINGUNA de las dos encuentre nada — la mayoría de fichas de PSN pagaban
las dos peticiones completas, no una. Arreglado corriendo las dos en
paralelo (`Promise.all`): MGS4 (el peor caso, sin coincidencia) baja de
1813ms a 1064ms. Mismo resultado exacto, solo más rápido.

**Moraleja para quien retome esto**: cualquier cambio que añada una
petición externa nueva a una ruta que ya se sirve con sesión (no solo a
un cron o una acción aislada) hay que medirlo en el momento, no dar por
hecho que "en paralelo con la base" es gratis — aquí lo era hasta que la
propia función pasó a tardar más que la base.

---

## Sesión del 7 de septiembre de 2026 (continuación) — perdibles de verdad, HLTB revisado, y "anclar juego"

Retomada la sesión del mismo día. El usuario pidió expresamente revisar
`TrophyTree.tsx`/`hltb.ts` (dejados sin auditar por la sesión anterior) y
subir la cobertura real de "perdibles" antes de nada.

### El bug real de "perdibles" no era el formato de tabla — eran dos bytes de control invisibles

Investigando por qué ni Black Myth: Wukong ni MGS4 marcaban nada pese a
tener guía real en PowerPyx, salió algo peor que lo que este documento
sospechaba: `normalizar()` (`lib/powerpyx.ts`) llevaba **dos bytes de
control (`0x08`, backspace) colados dentro de su propia regex de
sufijos** — invisibles en cualquier editor, imposibles de ver con un
`grep` normal — que impedían que "Trophy Guide & Roadmap" se recortara
NUNCA del título de la guía. Como casi todas las guías de PowerPyx
terminan así, esto rompía la coincidencia de título para la inmensa
mayoría de juegos, no solo para los "casos raros" que se venía
culpando. Ya estaba así en el commit anterior a esta sesión.

Además, dos arreglos reales en el parser de la tabla: (1) bastantes
celdas de nombre llevan un ancla de salto justo antes del `<br>` que el
patrón viejo no cruzaba, colgando el aviso del trofeo ANTERIOR
(comprobado contra MGS4 real: daba "Hands up!"/"SUNLIGHT!" mal); (2) el
marcador pasó de "MISSABLE TROPHY" a solo "MISSABLE —" en las guías
nuevas. Se sumó `resumenPerdibles`: las guías modernas listan TODOS los
perdibles de golpe en un resumen antes de la tabla, más completo que el
aviso suelto — subió Black Myth: Wukong de 2/7 a 7/7 detectados.
Verificado en vivo contra powerpyx.com y contra la biblioteca real de
`fende21`: los 7 trofeos de Wukong salen marcados de verdad en su ficha.

**Lo que sigue limitando la cobertura, sin arreglar**: la búsqueda de
PowerPyx solo devuelve 10 resultados y a veces la guía correcta ni entra
ahí (probado con "Elden Ring": lo tapan 10 resultados de "Elden Ring
Nightreign"). El título en la base sigue teniendo que coincidir EXACTO
(MGS4 sigue sin encontrar guía: "Guns of the Patriots" en la base vs solo
"Metal Gear Solid 4" en PowerPyx). Y algunos juegos (Silent Hill 2
Remake) solo explican sus perdibles en prosa, sin nombrarlos en ningún
sitio extraíble.

### `hltb.ts` (Antigravity): mismo bug de raíz que "perdibles", y la API de HLTB cambió de verdad

`syncGameHltb` cogía "el primer resultado" de la búsqueda a ciegas — la
propia librería `howlongtobeat` calcula una `similarity` por Levenshtein
pero NO reordena por ella, devuelve los resultados en el orden que da la
API de HLTB (`sortCategory: "popular"`), así que el juego más popular
que comparta alguna palabra con la búsqueda puede salir primero aunque
sea otro juego. Arreglado: se coge el de mayor `similarity`, descartando
si ni el mejor llega a un umbral razonable.

**Hallazgo más importante, sin arreglar**: la API de HowLongToBeat
**cambió de verdad** — el endpoint que usa esta librería (`/api/search`,
incluso en su última versión publicada, 1.8.0) da **404 ahora mismo**,
comprobado en vivo contra el servidor real. Inspeccionado el JS de
howlongtobeat.com: el endpoint real ahora es `/api/search/site`, y exige
un **token de seguridad en dos pasos** (`GET /api/search/site/init` para
sacar `{token, hpKey, hpVal}`, luego `POST /api/search/site` con esos
tres valores en headers `x-auth-token`/`x-hp-key`/`x-hp-val`). Esto no es
solo una URL movida — es un mecanismo anti-scraping deliberado, un
escalón por encima de lo que ya se asume con PowerPyx/OpenXBL, así que no
se ha replicado sin decidirlo antes con el usuario. Mientras tanto, el
tiempo de HLTB en el Planificador simplemente no aparece (nunca lanza).

> **ARREGLADO DE VERDAD el mismo 7/8 de septiembre, más tarde esta misma
> sesión — no reconstruir el token a mano.** En vez de replicar el
> mecanismo de dos pasos de arriba, se cambió a la librería
> `howlongtobeat-ts` (activamente mantenida, publicada hace 2 semanas
> explícitamente por este mismo cambio de API) — ver la sección "Horas
> estimadas" más abajo para el detalle completo.

### GTA V otra vez: el mismo hardcode que se quitó hoy, reintroducido sin querer

`GameHeaderLogo.tsx` (la cabecera de `/juego/[id]`, no la carátula de
`GameCard.tsx` — sitio distinto) traía un `if (title === "grand theft
auto v"...)` forzando una imagen fija de Steam en vez del logo dinámico
de siempre. Comprobado: el logo dinámico (`.../apps/271590/logo.png`)
carga perfectamente (200, ~60KB) — no había ninguna razón técnica.
Revertido a como estaba, con el mismo criterio que ya dejó `GameCard.tsx`
por escrito esta misma mañana: un dato/render que funciona no se tapa
con un `if` por título. Como coincidía byte a byte con el commit
anterior, no generó commit propio — simplemente no llegó a mezclarse.

### Nueva función: anclar juego ("voy a por este platino ahora")

Pedido por el usuario: marcar el juego al que le está dando prioridad
ahora mismo, visible en su propia biblioteca y en su perfil público (para
que quien lo visite sepa a qué está jugando). `user_game.pinnedAt`
(migración ejecutada), `togglePinGameAction` (solo uno anclado a la vez,
anclar otro desancla el anterior), botón de chincheta en la biblioteca
(solo tuyo) y un banner dorado en el perfil público, lo primero que se ve
debajo de la cabecera, visible para cualquiera.

**Bug real encontrado y arreglado por el camino**: un botón anidado
dentro de la tarjeta-enlace (`TiltCard`/`Link`) navega al juego al
pulsarlo en vez de disparar su propio `onClick`, **incluso llamando a
`preventDefault`/`stopPropagation`** — comprobado en vivo, no en teoría.
Por eso el botón de anclar vive FUERA de `GameCard`, como overlay hermano
desde `LibraryGrid` (mismo motivo por el que `RatingStars` tampoco vive
dentro de `GameCard` — quien retome esto: cualquier control interactivo
nuevo sobre una tarjeta de juego tiene que seguir este mismo patrón).

Probado de punta a punta contra la cuenta real de `fende21`: anclar,
verlo en el perfil, desanclar — sin dejar nada de prueba anclado.

**Aviso de entorno, aparte**: durante esta sesión el `next dev` local se
quedó sirviendo contenido **de una versión anterior** de la página (un
`<div id="S:N" hidden>` con el HTML real nunca se llegó a revelar,
mientras se seguía viendo una versión vieja) tras muchos ciclos de Fast
Refresh seguidos. Reiniciar el proceso lo curó, dos veces. Es la misma
familia de síntoma que "el proceso se atasca tras horas vivo" que ya
documentó la sesión del 6 de septiembre — aquí pasó en minutos, no horas,
con edición de archivos muy seguida. Si vuelve a pasar: reiniciar `next
dev`, no busques el bug en el código primero.

### VAPID: este documento decía "pendiente", ya no lo está

La sección de más abajo (sesión del 6 de septiembre) decía en mayúsculas
que las claves VAPID solo estaban en local y hacían falta en Vercel.
**El usuario confirmó que ya están puestas en producción.** Corregido en
su sitio. Sigue sin probarse un push real de extremo a extremo con una
suscripción de verdad (motivo de siempre: sin persona real no hay
permiso de notificaciones que conceder) — pero ahora sí se podría probar
en producción, con una cuenta real.

### Commits de esta sesión, separados por autoría/tema a propósito

Cinco commits, no uno solo — el propio aviso de "disciplina de commits"
de más abajo pedía exactamente esto: `trofeosPerdiblesDe`/tipos
(100% de esta sesión), HLTB de Antigravity + el arreglo de similitud
(mezclados en `hltb.ts`, imposible separar limpio en un archivo tan
pequeño), tres retoques sueltos de Antigravity revisados sin objeción,
"anclar juego" completo, y `TrophyTree.tsx` de Antigravity en su propio
commit — con el mismo aviso de "sin auditar a fondo" que ya llevaba.

---

## Sesión del 7 de septiembre de 2026 — responsive, tamaño de letra, Descubrir en tiempo real, y trofeos perdibles de verdad

Sesión larga a base de peticiones cortas encadenadas, con Antigravity
editando los mismos archivos en paralelo varias veces (dos incidentes reales
de `git add -A` arrastrando cambios suyos a un commit mío — ver el aviso de
"disciplina de commits" más abajo). Va por tema, no en orden cronológico.

### El build de producción estaba roto, y nadie se había dado cuenta

`next build` fallaba entero con "Failed to type check" por un archivo suelto
en `scratch/test_igdb.ts` (de Antigravity, un test a medias con un import
que no existe). El motivo real: `tsconfig.json` incluye `**/*.ts` de TODO el
repo, no solo `src/`, así que un archivo roto en cualquier carpeta tumbaba
el build aunque nada de la app lo importara. Se excluyó `scratch/` en
`tsconfig.json` — arreglo de una vez, no depende de que nadie se acuerde de
no dejar archivos rotos sueltos. De paso se encontró y se borró
`src/app/api/test-igdb/route.ts` (mismo problema, pero además rompía
`/api/games/upcoming` con un 500 en desarrollo porque Turbopack invalida el
build entero si cualquier módulo del árbol falla).

### Responsive: la cabecera estaba rota en TODAS las pantallas

Capturas reales del usuario en móvil mostraban el logo "PARAGON" solapado
con el botón de menú, botones cortados en Comunidad/Amigos/Planificador, y
"RECOMENDACIONES" pisando "PLAYSTATION" en Descubrir. Se repasó con una
herramienta hecha ex profeso que mide el DOM a 375px (elementos que se salen
de su contenedor o de la pantalla) en vez de comparar capturas a ojo.

Causas reales encontradas, todas con el mismo patrón de fondo:
- **La cabecera** metía 6 iconos en la misma barra. Sincronizar, apariencia,
  ajustes y admin pasan al menú desplegable (con su nombre escrito, no un
  icono suelto); en la barra se quedan logo, menú y avisos.
- **24 archivos con rejillas sin columna base** (`grid gap-3 sm:grid-cols-2`
  sin un `grid-cols-1` explícito antes). Sin columna explícita, una rejilla
  usa columnas implícitas de tamaño `auto`, que se dimensionan al CONTENIDO
  MÁXIMO y desbordan cuando no cabe — medido en las tarjetas de
  lanzamientos: una pista de 248,75px en un hueco de 213px.
- **Campos de formulario sin `min-w-0`**: un `<input>` trae un ancho mínimo
  intrínseco (~180px) que `flex-1` NO anula, así que empujaba el botón de al
  lado fuera de la pantalla ("Enviar solicitud" en Amigos, "Enviar" en los
  comentarios del muro).
- `truncate` no recorta en un elemento `inline` (un `<a>` lo es por
  defecto) — un nombre largo en Amigos se salía 42px hasta que se le puso
  `block`.

Verificado a 375px, en Normal y con el tamaño de letra en Grande, sin
desbordes: panel, biblioteca, estadísticas, ficha de juego, feed, noticias,
ligas, Descubrir, Amigos, Planificador, Avisos, Ajustes.

### Tamaño de letra, controlado por el usuario (no encogido por mí)

Se pidió explícitamente que fuera un AJUSTE, no que yo redujera la
tipografía. El obstáculo real: 387 clases de texto usaban píxeles fijos
(`text-[13px]`), que no responden a un cambio del tamaño de la raíz.
Convertidas todas a `rem` (`text-[0.8125rem]`) — verificado que a tamaño
Normal el resultado renderiza IDÉNTICO a antes (h1 en 42px exactos). Nuevo
control en `/ajustes/apariencia` (Pequeño 87,5% / Normal / Grande 112,5% /
Enorme 125%), mismo patrón que tema y acento (`localStorage` + aplicado al
`<html>` antes de pintar, para no dar un salto visual en cada carga).
Probar con letra Grande destapó un fallo que no se veía de otro modo: el
hero de Descubrir tenía altura FIJA con `overflow-hidden`, así que el botón
de deseados quedaba cortado. Pasa a `min-h`.

### Descubrir: el "tiempo real" tenía una trampa de caché

`upcomingGames`/`recentReleases`/`destacadosRecientes` (lib/igdb/client.ts)
metían el instante actual (`Date.now()`) en el CUERPO de la consulta a
IGDB, y Next cachea cada `fetch` por su cuerpo — con el instante cambiando
cada segundo, la caché de 6h **nunca acertaba**, así que cada visita a
Descubrir iba a IGDB de verdad (que limita a 4 peticiones/segundo). Ahora el
instante se redondea a ventanas de 5 minutos (`ahoraRedondeado`): la caché
funciona y la lista sigue fresca. Se añadió `RefrescoAutomatico.tsx`
(`router.refresh()` cada 5 min y al volver a la pestaña, sin perder el
scroll — verificado) para lo que se pinta en el servidor.

También en Descubrir: tarjetas de tamaño desigual (el hero saltaba entre
210px y 268px al rotar según el juego tuviera título de una o dos líneas,
géneros que cupieran en una fila, o —el caso más curioso— si el botón decía
"+ Añadir a Deseados" o el más corto "✓ En Deseados") — ahora todas
reservan el mismo hueco. El hero solo mostraba la PRIMERA plataforma de un
juego multiplataforma (`slice(0, 1)`); ahora muestra todas (un icono por
familia, sin repetir PS4/PS5). Fechas de lanzamiento en formato corto
(`dd/mm/aaaa`, o `nov 2026`/`T4 2026`/`2028` según la precisión real que dé
IGDB — nunca se inventa un día que no se sabe).

### Ofertas, logos de sitios web, y PS Plus

- Las ofertas de "Dónde comprarlo" SÍ eran enlaces válidos, pero pasaban por
  una página intermedia de CheapShark que reenvía por JS — se siente como
  que no llevan a ningún sitio. La de Steam ahora va DIRECTA a su ficha (el
  appid ya se tiene); el resto no tiene alternativa (CheapShark no publica
  la URL propia de cada oferta) y ahora se avisa en pantalla.
- "Sitios web" en la ficha de juego mostraba un círculo con la INICIAL del
  nombre — en Garry's Mod salían dos círculos con "S" (Sitio oficial/Steam)
  y dos con "T" (Twitch/Twitter), indistinguibles. `SiteIcon.tsx` (nuevo)
  da logos reales a 13 sitios conocidos.
- PS Plus enseñaba el mes EN INGLÉS ("juegos de March"), ya traducido.
  Comprobado contra el blog oficial: Sony no ha publicado ningún anuncio de
  PS Plus desde el 25 de febrero de 2026 (el de marzo) — ni en el feed ni en
  la web de la etiqueta. No es que el scraping esté roto: Sony sencillamente
  no lo ha publicado. El aviso en pantalla ahora lo dice sin rodeos en vez
  de un tímido "puede que ya no sea el catálogo vigente".

### "Añadido a mano (4)" en el filtro de plataforma de la biblioteca

El usuario reportó que ese filtro salía sin haber añadido nada a mano. Eran
los 4 juegos de su lista de DESEADOS (se guardan como plataforma "manual"
porque así los mete "+ Añadir a Deseados" desde Descubrir). Los deseados ya
tienen su propio filtro de estado; ya no cuentan como plataforma
(`lib/stats.ts`/`libraryFacets` filtra `!g.isWishlist` antes de contar).

### "Tu legado": exportar todos los datos en un JSON

Antigravity había empezado la misma idea en paralelo (misma función
`exportarDatosUsuario`, mismo endpoint `/api/exportar`) — se fusionó en vez
de duplicar. Recorre biblioteca, trofeos conseguidos, carpetas, amistades,
insignias, votos de dificultad, guías escritas y el historial de
sincronización, todo en consultas en paralelo. Deliberadamente sin
credenciales (nunca se guardan) ni el perfil completo de otros usuarios.
Botón en `/ajustes/seguridad`.

### Trofeos perdibles: la desconfianza del usuario hacia Antigravity estaba justificada

Antigravity había implementado "perdible" buscando la palabra literal
dentro de guías de trofeo ESCRITAS POR LA COMUNIDAD (`trophy_guide`, con un
simple `ilike`). Roto de dos formas: una guía que dijera "esto NO es
perdible" habría coincidido igual, y `trophy_guide` tiene **0 filas en
producción** — el aviso no iba a salir nunca, para ningún trofeo.

Se probó sustituirlo por una heurística sobre el propio texto del trofeo
(mismo patrón que `clasificarTrofeo`, que sí funciona para dificultad/tipo)
y se descartó tras comprobarlo contra los **15.574 trofeos reales de la
base**: 0 contienen la palabra "missable", y las pocas coincidencias con un
patrón más amplio eran FALSOS POSITIVOS ("Point of No Return" y "Last
Chance" resultaron ser nombres de misión/arena de un juego, no avisos). La
descripción que da PSN/Steam de un trofeo sencillamente no lleva esta
información — nunca.

La fuente real que sí la tiene: **PowerPyx** (guías escritas por una
persona), que marca cada trofeo perdible literalmente "MISSABLE TROPHY".
`lib/powerpyx.ts` (nuevo) busca la guía por título exigiendo coincidencia
EXACTA tras normalizar (nunca "el primer resultado" — buscando "The Witcher
3" el primero es el DLC "Blood and Wine", no el juego base) y extrae los
nombres marcados. Nunca lanza; un fallo es "sin aviso", no rompe la ficha.

**Cobertura real, medida con honestidad — léase antes de dar esto por
resuelto**: solo cubre PSN (PowerPyx no tiene guías de Steam/Xbox,
comprobado con Garry's Mod: "sin resultados"). Y dentro de PSN, solo un
subconjunto: PowerPyx cambió de formato de tabla con los años, y el parser
escrito aquí cubre la tabla clásica (confirmado con Metal Gear Solid 4, 23
trofeos detectados) pero no las guías más nuevas (TablePress o prosa por
capítulos — Black Myth: Wukong, por ejemplo). Probado contra 6 juegos reales
de una biblioteca real (Assassin's Creed Unity, los tres Uncharted
Remastered, The Last of Us Part II, Black Myth: Wukong): **ninguno** mostró
el aviso — 5 por no encontrar coincidencia exacta de título, 1 por el
formato nuevo. El sistema es correcto y seguro (nunca miente), pero
mejorarlo de verdad pasa por relajar la coincidencia de título (con
cuidado: relajarla demasiado ya causó el caso de Blood and Wine) o sumar un
segundo parser para el formato nuevo — ninguna de las dos hecha todavía.

El tick en pantalla (`TrophyList.tsx`) pasó de un triángulo con el aviso
solo en el `title` (invisible sin pasar el ratón) a un check real con la
palabra "Perdible" escrita al lado, como pidió el usuario.

### GTA VI tenía la carátula de GTA V, y un hardcode lo tapaba mal

Al investigar lo de perdibles salió, sin buscarlo, que la ficha de **Grand
Theft Auto VI mostraba la carátula de Grand Theft Auto V** — error de
emparejamiento de IGDB en algún momento pasado. Corregido en la base
(`games.iconUrl`). Y se encontró que Antigravity ya había "arreglado" esto
antes con un hardcode en `GameCard.tsx` (comparando `game.title` contra
"grand theft auto v"/"vi" literal para forzar una URL de Wikipedia) — con
el dato de origen ya corregido, ese hardcode **sobrescribía la carátula
real y correcta que ya tenía GTA V**, y de paso ocultaba el título de la
tarjeta (el logo de Wikipedia lo llevaba dibujado dentro; la carátula real
es artwork sin texto). Se quitó entero. Moraleja para quien retome esto:
un dato mal guardado se arregla en el dato, nunca con un `if` por título en
el componente que lo pinta.

### Disciplina de commits, con Antigravity editando en paralelo

Pasó tres veces en esta sesión (y ya había pasado en sesiones anteriores):
un `git add -A` se llevó por delante archivos que Antigravity había tocado
a la vez (un `CONTEXTO.md` suyo, una migración de logos de `.jpg` a `.png`,
una línea `hltb: gamesTable.hltb` en `getLibrary`). Ninguno era dañino, pero
mezclar autoría en un commit es peor que dividir en dos — se fueron
separando en commits aparte según se detectaban. **Para quien retome esto
con Antigravity trabajando a la vez: revisar `git status`/`git diff --cached`
archivo por archivo antes de comitear, nunca fiarse de un `git add -A`.**

### Lo que Antigravity está construyendo en paralelo, sin tocar

`src/components/TrophyTree.tsx` y `src/lib/hltb.ts` — un árbol visual de
trofeos y "Time to Beat" en el planificador, las dos ideas que esta misma
sesión le había recomendado al usuario por separado. No se ha revisado ese
código; si se retoma, conviene una revisión con el mismo nivel de
escepticismo que se aplicó aquí a "perdibles" antes de confiar en él.

---

## Sesión del 6 de septiembre de 2026 (continuación 2) — webhook de Discord confirmado en vivo, y aviso de conexión zombi en el pool

### Webhook de Discord: confirmado funcionando de verdad, con un webhook real

Primera prueba end-to-end real (hasta ahora solo se había verificado el regex
de validación y el código a mano, ver sesión de más abajo). El usuario
reportó "consigo un trofeo y no se manda el webhook" — **no era un bug**: el
flujo correcto es conseguir el trofeo → darle a "Sincronizar ahora" (el icono
de la cabecera) → el aviso llega. Paragon no sabe que existe un trofeo nuevo
hasta que sincroniza de verdad contra PSN/Steam/Xbox (nada de tiempo real,
ver la sesión del botón de sincronizar más abajo); si no se sincroniza, no
hay nada que anunciar. Con ese flujo, el usuario confirmó que **el mensaje
llega al canal de Discord tal cual**. `lib/discordWebhook.ts`/`lib/sync.ts`
quedan verificados en producción, no solo revisados a mano.

### La lentitud de `/u/[handle]`: medida de verdad — el pool SIGUE atascándose (sin resolver)

Este documento llevaba dos sesiones diciendo dos cosas que **resultaron ser
falsas al medirlas**. Queda corregido aquí para que nadie más las herede.

**Los síntomas** (logs reales de `next dev` pegados por el usuario): un
`SELECT` trivial por `handle` con `LIMIT 1` cancelado por `statement timeout`
a los 60s (`57014`), y una petición a `/u/[handle]/[gameId]` que tardó
**131,7 minutos** antes de que el navegador cortara ("the destination stream
closed early").

**Lo que se midió, en este orden** (todo reproducible, no deducido):
1. **No hay ninguna `db.transaction` en toda la app** — así que no era una
   transacción nuestra sin cerrar.
2. **La base está perfectamente sana**: conectando aparte, el MISMO `select`
   por handle que tardaba 60s desde la app tarda **49ms**. `select 1` 415ms
   (primera conexión), `now()` 37ms, `count(*)` sobre `user` 64ms.
3. **No hay tormenta de N+1**: instrumentando el cliente con el hook `debug`
   de postgres.js, el perfil entero hace **28 consultas**, 19 distintas.
   Ninguna pasa de ~300ms de media (`pg_stat_statements`), la mayoría 40-70ms.
4. **Reiniciar el servidor lo curaba**: tras reiniciar `next dev`, la misma
   página bajó de >120s a 3,5-5s. O sea que los cuelgues de 60s/131min eran
   del PROCESO, no de la base ni de la consulta.

**Causa 1 — el proceso se atasca entero tras horas vivo. Mitigado, NO
demostrado.**

Lo que se observó de verdad: en el proceso de `next dev` del usuario —vivo
desde hacía horas y corriendo el código VIEJO del pool— `/u/[handle]`,
`/feed` y `/ligas` se colgaban indefinidamente, y no se recuperaba solo
(probado 75s en reposo + una petición paciente de 5 minutos: nunca
termina). Solo respondían las páginas cacheadas (`/rankings`, 0,23s) y las
que no tocan la base (`/entrar`, 0,13s). Reiniciar lo curaba.

La base NO tenía la culpa: con la app completamente colgada, un script
aparte abrió una conexión nueva al mismo Postgres e hizo **la misma
consulta por handle en 38ms**.

**Pero NO se reprodujo en un proceso limpio.** Con `.next` borrado y el
servidor recién arrancado: 6 renders frescos seguidos (1 MB cada uno) a
3,2s constantes, y además 5 peticiones abortadas a mitad de render
(justo lo que genera el "destination stream closed early") sin degradar
nada. Así que ni la carga normal ni los renders abandonados lo explican.

**Hipótesis mejor sostenida**: el pooler de Supabase cierra las conexiones
ociosas y postgres.js sigue usando sockets ya muertos, en los que ninguna
respuesta llega nunca. Encaja con todo lo observado: tarda HORAS en
aparecer (no minutos), es permanente, la base está sana y reiniciar lo
cura. Contra eso van `idle_timeout: 20` (cierra las ociosas antes de que
las cierre el pooler), `max_lifetime: 30min` (recicla aunque parezcan
sanas), `connect_timeout` y `statement_timeout: 30s`. **Sin demostrar**:
haría falta dejar un proceso vivo varias horas y ver si vuelve a pasar.
Quien retome esto: si con el código nuevo vuelve a colgarse tras horas, la
hipótesis del socket muerto es falsa y toca instrumentar el pool de verdad
(contar consultas empezadas vs terminadas por conexión).

**TRAMPA que confundió el diagnóstico durante una hora** — ver también el
aviso de `.next` más abajo: hacer `npm run build` con `next dev` corriendo
deja `.next` corrupto, y a partir de ahí las páginas se cuelgan o devuelven
404 **exactamente igual que el bug de verdad**. Antes de investigar un
cuelgue, borra `.next` y arranca limpio; si desaparece, era esto.

**Causa 2 — la pestaña oculta bloqueaba el HTML (arreglada).** `SectionTabs`
renderiza las 3 pestañas en el servidor aunque solo se vea una (a propósito:
las oculta con `hidden` sin desmontarlas, para no perder scroll ni repetir
consultas al cambiar). El problema es que `<EstadisticasCompletas />` — una
pestaña que NO se ve por defecto — bloqueaba el envío del HTML de "Resumen"
y "Biblioteca". Metida en un `<Suspense>` con skeleton: el esqueleto sale a
los **540ms** y las estadísticas llegan después por streaming.

**Corregida la advertencia anterior sobre `Promise.all`.** El HANDOFF decía
en mayúsculas "NO dispares varias consultas nuevas en paralelo en esta
página". Era una conclusión equivocada del incidente: aquel cuelgue fue la
conexión zombi (causa 1), no la concurrencia. Con la base sana, las cinco
consultas del cuerpo del perfil se paralelizan **en tandas de 3** (no las
cinco de golpe: el pool sigue siendo de 5 y se comparte con lo que rinde el
resto del árbol) sin un solo cuelgue en las pruebas.

**Resultado medido** (perfil real `fende21`, con `.next` limpio):

| | antes | ahora |
|---|---|---|
| primer HTML útil | 3,5-5s | **0,54s** (esqueleto) |
| contenido visible | ~3,5s | ~1,87s |
| carga en frío | 3,5-5s | 3,8s |

**AVISO sobre estas cifras**: las medidas intermedias de esta sesión se
tomaron con un `.next` corrupto (ver el aviso de abajo) y algunas salieron
peores de lo real. Lo que sí está verificado es que el `<Suspense>` hace su
trabajo: la cáscara sale a los ~540ms en vez de esperar a todo.

**Trampa que costó media hora — `npm run build` con `next dev` encima
corrompe `.next`.** Tras hacer el build de producción con el servidor de
desarrollo corriendo, `/u/[handle]` empezó a devolver **404 en 50ms sin
compilar la ruta siquiera** (y no era un fallo de código: la consulta
devolvía la fila perfectamente desde fuera). Se cura borrando `.next`
entero y arrancando de nuevo. Si ves 404 en rutas que existen, es esto:
no busques el bug en el código.

**Lo que sigue pendiente aquí**: el HTML del perfil pesa **1.030 KB** porque
las 3 pestañas se renderizan enteras (la biblioteca de 190 juegos incluida).
Ese es el siguiente cuello de botella real, y probablemente también la vía
más eficaz contra el atasco del pool: menos trabajo y menos consultas por
petición. Herramientas usadas para medir esto, por si hace falta repetirlo:
el hook `debug` de postgres.js para contar consultas, `pg_stat_statements`
para tiempos por consulta, y un script que lee el stream marcando en qué
milisegundo llega cada parte del HTML.

### El dato que debería guiar qué se construye a partir de ahora

Contando filas reales en la base (7 de septiembre de 2026):

| tabla | filas |
|---|---|
| `user` | **6** |
| `trophy_guide` | **0** |
| `game_guide` | **0** |
| `game_difficulty_vote` | **0** |
| `collection` | 2 |
| `activity` | 23 |

Las tres funciones de comunidad están **construidas y conectadas a la
interfaz** (se comprobó: `communityDifficulty`, `guides` y `trophyGuides`
tienen sus páginas y componentes), pero vacías. No están rotas: es que con 6
usuarios no hay nadie que escriba una guía ni vote una dificultad. Lo mismo
vale para Ligas, Rankings, Feed y Comparar.

**Conclusión para quien siga**: construir más funciones sociales es construir
para una audiencia que todavía no existe. Lo que rinde hoy es lo que sirve a
una sola persona — y, aparte, lo que pueda traer usuarios nuevos.

### Tarjetas sociales (openGraph) — lo único que ataca el problema de los 6 usuarios

La app no tenía **ni una línea de `openGraph`** en ninguna página, así que
pegar un enlace de Paragon en Discord o WhatsApp dejaba un enlace pelado.

- `u/[handle]/opengraph-image.tsx`: tarjeta del perfil con avatar, nivel, XP
  y las cuatro cifras. Misma técnica que las dos imágenes que ya existían
  (`api/wrap/[handle]`, `api/trophy-card/...`): Satori vía `ImageResponse`,
  en Node porque `postgres-js` no va en edge.
- `opengraph-image.tsx` en la raíz: la de por defecto.
- `generateMetadata` en el perfil, con cifras reales en la descripción.
- `metadataBase` en el layout raíz. **No es opcional** en cuanto hay
  imágenes sociales: sin él, Next no puede resolver la URL absoluta que
  exigen las redes y la tarjeta no sale.

**Dos trampas que salieron al hacerlo, y que importan más que la función:**

1. `generateMetadata` y la página corren en la MISMA petición y las dos
   piden perfil + biblioteca. `getProfileByHandle` no estaba memoizada, así
   que esto habría **duplicado** la consulta cara del perfil, deshaciendo la
   optimización de las rutas. Ahora `getProfileByHandle` y `getLibrary` van
   envueltas en `cache()` de React (el patrón que documenta el propio Next).
   Quien añada `generateMetadata` a otra página: comprueba esto primero.
2. `urlAbsolutaParaOg` devolvía `undefined` en local, con el efecto de que
   ningún avatar subido a mano salía en NINGUNA tarjeta mientras se
   desarrollaba. Ahora cae a `localhost:3000` en desarrollo, lo que además
   arregla las dos imágenes que ya existían.

### Estado de la biblioteca (/ajustes/plataformas)

`lib/syncHealth.ts` + `SaludSincronizacion.tsx`. Enseña por plataforma
cuántos juegos no tienen detalle de trofeos y cuántos llevan más de 6h sin
refrescar, con un botón de puesta al día por tandas acotadas **por tiempo**
(mismo patrón que el cron: cada juego es una llamada a la plataforma y sin
presupuesto la función se agota a medias sin guardar progreso).

Un juego sin detalle no cuenta en el histórico ni en las rachas, así que
esto no era cosmético: `fende21` tenía 59 juegos de PSN así y nada lo decía
en pantalla. Xbox y manuales quedan fuera (cuota compartida de OpenXBL / no
hay nada que sincronizar), filtrado en SQL **y** con una guarda en el bucle.

**Sin ver renderizado** (necesita sesión): merece un vistazo real.

### Sincronización automática al abrir la ficha de un juego

Decisión del usuario tras plantearle las tres variables: **6 horas de
caducidad, solo PSN y Steam, y solo al abrir la ficha de un juego** (no al
entrar al perfil). `AutoSyncJuego.tsx` (nuevo) + la regla en
`u/[handle]/[gameId]/page.tsx`.

Reutiliza `refrescarJuegoAction` —la misma acción que ya usaba el modo
enfoque— en vez de escribir sincronización nueva. Quien decide si toca es el
SERVIDOR; el componente de cliente solo dispara. Así no hay dos copias de la
regla que se puedan desincronizar.

**Xbox queda fuera a propósito**: OpenXBL da 150 peticiones/hora compartidas
entre TODOS los usuarios de Paragon. Los juegos manuales también quedan
fuera (no hay nada que sincronizar). Y solo se dispara en TU propio juego:
si no, cualquiera podría quemar cuota ajena abriendo un perfil público
muchas veces.

Ojo, ya existía algo parecido y sigue ahí: `getGameDetail` sincroniza de
forma BLOQUEANTE cuando el juego no se ha sincronizado nunca o cuando
detecta descuadre entre biblioteca y detalle. Lo nuevo es solo la caducidad
por tiempo, y esa sí va en segundo plano.

Verificado: la ficha carga igual y el componente no se monta para un
visitante anónimo. Contra datos reales de `fende21`: 204 juegos de PSN
caducados (>6h), 0 de Steam, y los 3 manuales correctamente excluidos.
**Sin probar con sesión iniciada** (sin credenciales en este entorno, mismo
motivo de siempre) — merece una comprobación real: abrir un juego tuyo de
PSN que lleve más de 6h sin sincronizar y ver si aparece el aviso.

### Las pestañas del perfil son ahora rutas (el perfil pesa un 86% menos)

`SectionTabs` renderiza las tres pestañas en el servidor y solo oculta las
que no tocan. El precio real de eso, medido: `LibraryGrid` es un componente
de CLIENTE y recibía los 291 juegos enteros, así que **cada** visita al
perfil mandaba 1.030 KB aunque la pestaña por defecto fuera "Resumen" y
nadie mirase la biblioteca.

| ruta | antes | ahora |
|---|---|---|
| `/u/[handle]` (Resumen) | 1.030 KB | **142 KB** |
| `/u/[handle]/biblioteca` (nueva) | — | 457 KB, solo si vas |
| `/u/[handle]/estadisticas` | ya existía | 535 KB |

`ProfileTabsNav.tsx` (nuevo) mantiene el mismo aspecto que tenían las
pestañas, así que no cambia la sensación de uso, y de regalo cada pestaña
es enlazable y compartible (antes la activa vivía en `localStorage`,
invisible desde fuera). El Resumen se ahorra además la consulta de
carpetas. `SectionTabs` sigue existiendo y sigue usándose en el panel.

`profileSections.ts` ya no ofrece "collections" ni "biblioteca" como
secciones reordenables en /ajustes (no se pintan en el Resumen, ofrecerlas
prometía algo que no iba a pasar). Los órdenes ya guardados con esas claves
no rompen nada: `normalizeSectionOrder` las descarta.

### Cosas que se revisaron y NO eran lo que este documento decía

- **El error de hidratación en todas las páginas** (anotado como
  `task_9310785c`): **no se reprodujo**. Ni en `/noticias` ni en el perfil
  ni en la biblioteca aparece nada de hidratación en la consola. O se
  arregló por el camino, o solo pasa con sesión iniciada (no comprobable en
  este entorno, sin credenciales).
- **"La nav tiene 9 destinos y satura"**: falso de facto. El Header ya
  agrupa en 5 visibles (Panel, Biblioteca, Comunidad, Ligas, Amigos) más un
  desplegable "Más" con Descubrir, Noticias, Planificador y Rankings. Sigue
  habiendo solapes conceptuales reales (Rankings vs Ligas, Noticias sueltas
  vs las de cada plataforma en Descubrir, `/ritmo` vs Estadísticas), pero
  no es un problema de saturación visual y no justifica reestructurar
  páginas.

### Favicon: el bug real (no era caché del navegador)

La sesión anterior investigó "el favicon se ha ido", vio que `app/icon.jpg`
existía y se servía bien, y lo achacó a caché del navegador. **No era caché.**
Comprobado con `curl` sobre el HTML de verdad: el `<head>` solo llevaba
`<link rel="apple-touch-icon">` y **ningún `<link rel="icon">`**. El culpable
era `icons: { apple: "/logo.jpg" }` en el `metadata` de `layout.tsx`:
declarar `icons` a mano hacía que Next dejara de emitir el enlace de la
convención de archivos, así que `app/icon.jpg` se servía pero no lo
enlazaba nadie.

Arreglado pasando los dos iconos a la convención de archivos, que es lo que
recomiendan los propios docs de Next (`node_modules/next/dist/docs/01-app/
03-api-reference/03-file-conventions/01-metadata/app-icons.md`) y quitando
`icons` del metadata:
- `src/app/icon.jpg` (256×256, **11 KB**) → `<link rel="icon">`
- `src/app/apple-icon.jpg` (180×180, 7 KB) → `<link rel="apple-touch-icon">`

De paso, el favicon pesaba **429 KB** (el logo a 1024×1024 tal cual) y se
descarga en cada visita de cada visitante para verse a 16-32px en la
pestaña: ahora son 11 KB. El `logo.jpg` de 1024 sigue en `/public` para la
cabecera y el manifest de la PWA, donde sí hace falta grande.

Logo nuevo (copa con un mando dentro, gradiente platino) puesto por el
usuario en `public/logo.jpg`; los otros dos se generan de ahí con `sharp`.

### El cooldown del botón de sincronizar YA ESTABA HECHO

Este documento lo listaba como pendiente ("nada impide dar a sincronizar 20
veces seguidas"). Está construido: `SYNC_COOLDOWN_MS = 2 minutos` en
`app/actions.ts`, aplicado tanto a `syncNowAction` como a
`syncPlatformAction`, reutilizando `platformAccounts.syncedAt` en vez de una
columna nueva. Pendiente tachado.

---

## Sesión del 6 de septiembre de 2026 (continuación) — foto real de los logros en todos lados, favicon/logo, y un aviso serio sobre el pool de conexiones

### Foto real del logro, barrido completo

El usuario pidió "siempre la foto, no logos" tras ver cuadrados de color
genéricos donde debería verse el trofeo real. Encontrado y arreglado en
**5 sitios** (todos con el mismo defecto: enseñar `TrophyTile`/`TrophyIcon`
por metal en vez de `trophy.iconUrl`, la foto real que da PSN/Steam):

1. **"Próximos pasos"** (`u/[handle]/[gameId]/page.tsx`).
2. **"Últimos trofeos"** (`RecentTrophies.tsx`, sección nueva de esta misma
   sesión — ver más abajo).
3. **"Vitrina de Orgullo"** (`ShowcaseTrophies.tsx`): antes solo tenía una
   marca de agua translúcida del color del metal en la esquina, sin
   enseñar el trofeo en sí. Ahora la foto real, a tamaño visible.
4. **"Siguiente trofeo"** (`TrophyRecommendations.tsx`, panel): tenía
   **hardcodeado `<TrophyTile grade="gold" />` siempre**, sin mirar el
   metal real — `lib/recommendations.ts` ni siquiera traía `iconUrl`/
   `grade` en la consulta. Añadidos los dos campos.
5. **Modo Enfoque** (`FocusMode.tsx`).

La función que ya hacía esto bien (`Icono`, privada dentro de
`TrophyList.tsx`) se exportó como **`TrophyPhoto`** — una sola fuente de
verdad reutilizada en los 5 sitios, en vez de repetir el `if (!iconUrl)
return <TrophyTile ...>` cinco veces.

### Nueva sección: "Últimos trofeos" en el perfil

Petición del usuario: ver los trofeos más recientes en el propio perfil,
visible tanto para el dueño como para quien lo visita. `lib/history.ts`
(`ultimosTrofeos`, reutiliza el mismo patrón de `trofeosDelMes` pero sin
filtrar por mes) + `RecentTrophies.tsx`. Registrada en
`lib/profileSections.ts` (clave `recientes`) para que también se pueda
reordenar desde /ajustes como el resto de secciones del perfil. Verificado
contra datos reales (`fende21`): muestra trofeos de "hoy" y "ayer"
correctamente.

### Favicon y logo

El usuario reportó que el favicon "se había ido". Investigado: el archivo
(`src/app/icon.jpg`) existe, es válido y el servidor lo sirve bien — no se
ha tocado en ninguna sesión reciente. Casi seguro caché del navegador
(recomendado cerrar la pestaña del todo). Además el usuario dijo que el
logo actual "no le convence" y pidió uno nuevo, **literal: una copa o
medalla**. Sin generador de imágenes en esta sesión — diseñado a mano como
SVG (gradiente platino `#dff0f8→#7fbcd8→#3f7d99`, el mismo que ya usa toda
la app para platino) y rasterizado con `sharp` (ya estaba en
`node_modules`, dependencia de Next). **Mandada la propuesta al usuario
como imagen — pendiente de su confirmación antes de reemplazar
`src/app/icon.jpg`/`public/logo.jpg` de verdad.** El SVG fuente vive en el
scratchpad de la sesión, no en el repo — si se aprueba, hay que rehacerlo
o pedir el archivo.

### Aviso serio: el pool de Postgres es de 5 conexiones, no paralelizar a la ligera

El usuario reportó `/u/[handle]` tardando 4-5s (logs reales pegados:
"GET /u/fende21 200 in 3.7s...4.2s..."). Encontradas 5 consultas
independientes en `u/[handle]/page.tsx` hechas en **secuencia** (`await`
suelto una detrás de otra) — se juntaron en un `Promise.all` para acortar
la latencia total.

**Se probó y salió mal**: una petición de prueba se quedó **colgada más de
60 segundos** — peor que los 5s originales. Motivo real: `db/index.ts`
capa el pool de Postgres a **`max: 5`** conexiones simultáneas a
propósito (ya hubo un incidente real de "max client connections reached"
en producción, documentado más abajo en este mismo archivo). Esta misma
página ya pide varias conexiones vía `getLibrary()`, y **`SectionTabs`
renderiza las 3 pestañas del perfil enteras en el servidor aunque estén
ocultas** (incluida `EstadisticasCompletas`, que hace su propio montón de
consultas) — disparar 6-8 consultas MÁS a la vez desde aquí encima superó
lo que el pool puede dar de sí.

> **CORREGIDO DESPUÉS — no te fíes de lo que dice el resto de este bloque.**
> Todo lo de abajo culpa a la concurrencia, y al medirlo resultó ser falso:
> la causa era una conexión zombi en el pool (sin `idle_timeout` ni
> `max_lifetime`) y la pestaña oculta de Estadísticas bloqueando el HTML.
> Ver "La lentitud de `/u/[handle]`, por fin medida" al principio de este
> documento. Sí se puede paralelizar en esta página, con cabeza.

**Revertido a secuencial** (commit `0f0bced`) — el estado que sí funciona,
solo que despacio. **La lentitud real de `/u/[handle]` sigue sin
arreglar.** Sospecha fuerte, sin confirmar: `SectionTabs` pide los datos
de las 3 pestañas SIEMPRE, no solo la visible, así que "Estadísticas" se
calcula entera aunque se esté mirando "Resumen" — arreglarlo de verdad
significa que cada pestaña pida sus datos solo cuando se activa (o un
`loading.tsx`/Suspense por pestaña), no meter más `Promise.all` contra un
pool ya ajustado. **Cualquiera que retome esto: NO dispares varias
consultas nuevas en paralelo en esta página sin contar cuántas conexiones
pide ya el resto del árbol** — con 5 de tope, se agota rápido.

---

## Sesión del 6 de septiembre de 2026 — Notificaciones push de verdad

Último "trabajo real sin empezar" identificado en el HANDOFF (el otro,
confirmar `igdbId`, se hizo antes en esta misma tanda — ver más abajo). Ya
había Service Worker y manifest de PWA (de Antigravity); faltaba VAPID +
tabla de suscripciones + el manejador `push` + el disparador.

- **Claves VAPID generadas** (`npx web-push generate-vapid-keys`,
  `web-push` + `@types/web-push` añadidos a package.json) y puestas en
  `.env.local` (`VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/
  `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — la pública se repite con el prefijo
  `NEXT_PUBLIC_` porque el navegador la necesita al suscribirse).
  **YA PUESTAS EN VERCEL** (confirmado por el usuario el 7 de septiembre —
  este documento decía "pendiente" y ya no lo estaba; corregido aquí para
  que nadie más lo repita). Sigue sin probarse un push real de extremo a
  extremo con una suscripción de verdad (el entorno automatizado deniega
  el permiso de notificaciones solo, no hay una persona real para
  concederlo) — eso sí sigue pendiente, y ahora sí se podría probar en
  producción.
- **`push_subscription`** (migración ejecutada:
  `scripts/crear-tabla-push-subscription.mts`): una fila por NAVEGADOR
  suscrito, no por usuario — quien tiene Paragon abierto en el móvil y en
  el portátil recibe el aviso en los dos.
- **`lib/webPush.ts`**: `enviarPush(userId, payload)` manda a todas las
  suscripciones de ese usuario; si el servicio push responde 404/410 (la
  suscripción ya no existe — desinstaló la PWA, borró datos del
  navegador), se borra sola de la base en vez de reintentar para siempre.
- **Disparador reutilizado del webhook de Discord**: el push se envía
  desde el MISMO punto de `syncGameTrophies` (lib/sync.ts) con la MISMA
  lista de `nuevos` (trofeos genuinamente nuevos en esta sincronización,
  no ya conocidos) y la MISMA guarda contra la primera sincronización de
  cada juego (sin esto, vincular una cuenta con 200 juegos ya jugados
  mandaría 200 avisos push de golpe, igual que ya se evitó para Discord).
- **`PushToggle.tsx`** (nuevo, en /ajustes, sección "Notificaciones del
  navegador"): activar pide permiso al navegador, se suscribe con
  `pushManager.subscribe()` y guarda la suscripción; desactivar hace las
  dos cosas a la inversa. Botón "Probar" para no tener que esperar a un
  trofeo real para saber si funciona.
- **`public/sw.js`**: añadidos los manejadores `push` (pinta la
  notificación del sistema) y `notificationclick` (lleva a la pestaña ya
  abierta si existe, si no abre una nueva en la URL del aviso) — antes
  solo tenía el caché offline, sin nada de push.

**Verificado hasta donde el entorno deja**: migración ejecutada contra
producción, TypeScript limpio, sintaxis del Service Worker válida
(`node --check`), el Service Worker se registra e instala de verdad en el
navegador de pruebas, y la conversión de la clave VAPID + la llamada real a
`pushManager.subscribe()` llegan hasta el propio navegador sin errores —
se detiene justo en el permiso de notificaciones, que este entorno
automatizado deniega solo (no hay una persona real para concederlo). El
envío de un push real de extremo a extremo (con una suscripción de verdad)
no se ha podido probar por lo mismo — probarlo con una cuenta real antes
de darlo por cerrado del todo.

---

## Sesión del 5 de septiembre de 2026 (continuación 6) — Botón de sincronizar en la cabecera

El usuario preguntó por trofeos "en tiempo real". Respuesta honesta: no es
posible — ni PSN, ni Steam, ni Xbox avisan por webhook cuando alguien
desbloquea un trofeo, la única forma de saberlo es preguntar. Y preguntar
automáticamente para todo el mundo tiene un techo real: el cron
(`api/cron/sync/route.ts`) corre **una vez al día** porque el plan Hobby de
Vercel no deja crons más frecuentes (se pidió cada hora al principio y
Vercel rechazó el despliegue), y encima esa única pasada solo refresca 8
cuentas — con más usuarios tarda varios días en darle la vuelta a todos.

De las opciones planteadas (botón más visible / límite de frecuencia al
botón / auto-refresco en la página / cron más frecuente con plan de pago),
el usuario eligió solo la primera. `syncNowAction` (el mismo "Sincronizar
ahora" que ya existía, escondido en Ajustes → Plataformas) ahora tiene un
icono propio en la cabecera (`Header.tsx`), visible en cualquier página
mientras haya sesión y al menos una cuenta vinculada
(`headerUser.tieneCuentas`, nuevo en `layout.tsx`) — antes hacía falta saber
que ese botón existía y bucear hasta ajustes para encontrarlo.

**Pendiente, no construido a propósito** (el usuario no lo pidió esta vez,
solo la primera opción): el botón sigue sin ningún límite de frecuencia —
nada impide dar a "sincronizar" 20 veces seguidas, y con Xbox vinculado eso
puede agotar la cuota compartida de OpenXBL (150 peticiones/hora entre
TODOS los usuarios de Paragon con Xbox, no por cuenta — ver el aviso en
`lib/xbl/client.ts`). Vale la pena un cooldown (p. ej. 1 sincronización cada
2-3 minutos) antes de que alguien lo descubra por accidente.

Sin verificar en el navegador logueado (sin credenciales, mismo motivo de
siempre) — sí comprobado que la cabecera no rompe nada en páginas sin
sesión y que tipa correctamente.

---

## Sesión del 5 de septiembre de 2026 (continuación 5) — Retos semanales con variedad de verdad

Última pendiente de la lista de 8. La decisión bloqueada era "a mano o con
un generador automático" — se optó por automático: alguien inventando 3
retos nuevos cada lunes es trabajo de mantenimiento para siempre, y no hay
nadie dedicado a eso.

`lib/missions.ts` tenía 4 retos fijos (siempre los mismos, solo cambiaban
los números). Ahora hay un **catálogo de 12** y cada semana se eligen 4 al
azar — pero con una semilla estable por semana (`mulberry32`, sembrado con
un hash de "2026-W36"), no `Math.random()`: todo el mundo ve LOS MISMOS 4
retos esta semana (comparables entre amigos, como una liga), y la semana
que viene salen otros 4 solos, sin que nadie tenga que decidir nada. Nuevos
en el catálogo: fin de semana cazador, doble ración (2 juegos), explorador
(2 géneros), multiplataforma, racha de oro, cosecha de plata, ultra raro
(≤5% de rareza) — antes solo estaban los 4 originales (ritmo de caza,
platino semanal, rarezas, constancia).

Sin tabla nueva ni migración: sigue calculándose en vivo contra
`user_trophy` de esta semana, igual que antes — la única novedad real es
CUÁLES de los 12 se enseñan. Verificado con datos reales (`fende21`, últimos
30 días: 2 platinos, 12 trofeos raros, 5 juegos, 7 géneros, 25 días
distintos) y con la secuencia de semillas (4 semanas seguidas dan 4
combinaciones distintas, un año distinto con el mismo número de semana da
otra combinación distinta).

---

## Sesión del 5 de septiembre de 2026 (continuación 4) — Webhook de Discord para logros nuevos

Última de las 3 ideas pendientes de la lista original de 8. La alternativa
real al Rich Presence (que no es técnicamente posible sin app de escritorio,
ver más abajo): un webhook de Discord que anuncia logros nuevos en un canal,
sin bot ni permisos OAuth — el propio usuario lo crea desde su Discord
(Ajustes del servidor → Integraciones → Webhooks) y pega la URL en
`/ajustes`.

- **`users.discordWebhookUrl`** (migración ejecutada:
  `scripts/anadir-discord-webhook.mts`). Validado con una regex estricta
  (`esWebhookDiscordValido`, `lib/discordWebhook.ts`) antes de guardar: la
  URL la pega el usuario y el servidor hace un POST a lo que sea que haya
  ahí, así que sin validar el host cualquiera podría usar el propio
  servidor de Paragon para mandar peticiones a una URL cualquiera (SSRF).
- **Detección de "esto es nuevo de verdad"** en `lib/sync.ts`
  (`saveTrophies`/`syncGameTrophies`): antes de cada upsert se comprueba qué
  trofeos del lote YA estaban marcados como conseguidos en la base — los que
  no lo estaban son los que se avisan. Sin esto, cada sincronización
  "avisaría" de los mismos trofeos de siempre.
- **Un aviso por juego y sincronización, no uno por trofeo**: sincronizar de
  golpe 50 trofeos atrasados mandaría 50 mensajes seguidos (spam de verdad,
  y tropieza con el límite de Discord de 5 peticiones/2s por webhook). Un
  platino sí es su propio mensaje siempre — es el hito que se quiere
  celebrar aparte del resto.
- **Guarda real contra el caso más obvio de spam**: vincular una cuenta con
  200 juegos ya jugados no manda 200 "¡enhorabuena!" de golpe — se comprueba
  si `userGames.trophiesSyncedAt` era `null` (nunca se había pedido el
  detalle de este juego) y, si es la primera sincronización de verdad, no se
  avisa de nada: un platino de hace 5 años no es una noticia de hoy.
- Ajustes nuevo en `/ajustes` (`DiscordWebhookForm`, `Forms.tsx`): guardar y
  "Probar" son dos `<form>` con dos acciones de servidor distintas, fuera
  del `<form>` grande de "Guardar cambios" del resto de la página — un
  `<form>` dentro de otro no es HTML válido y el navegador ignora el
  anidado.

Sin verificar en el navegador logueado (sin credenciales en este entorno,
mismo motivo de siempre, y hace falta un webhook de Discord real de todas
formas) — sí comprobado a mano el regex de validación contra intentos de
SSRF y URLs con trucos de query string, y revisado con cuidado
`lib/sync.ts` por ser una zona sensible con historial real de bugs.

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

**Las 8 ideas originales están construidas** (Ruleta del Backlog, banner de
juego favorito, Paragon Score, Wrap en Stories, 3 pestañas del perfil no
estaban en la lista pero salieron del mismo hilo de trabajo, webhook de
Discord y Retos semanales con catálogo — ver las sesiones de arriba).

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
