# API móvil — contrato para la app nativa (Android/Compose)

No es una ruta (Next.js la ignora, no exporta handlers) — es la referencia
para quien construya la UI nativa sin tener que leer el backend. Si un campo
cambia aquí, avisar en el mismo PR que lo cambie.

**Copia real para Gemini en `android/API-CONTRACT.md`** — Gemini (Android
Studio) solo tiene acceso a la carpeta `android/`, no a este archivo. Si
cambias algo aquí, cambia también esa copia en el mismo commit.

## Autenticación

Un único login real: Google o Discord (no hay contraseña, ver `src/auth.ts`).

1. La app abre `/movil/entrar/google` (o `/discord`) en una Custom Tab
   (`androidx.browser`) — ese route (`src/app/movil/entrar/[provider]/route.ts`)
   llama a `signIn()` directo, SIN pasar por la página web `/entrar` de por
   medio. `AppRoot.LoginGate` en Android ya tiene un botón por proveedor.
2. Tras el login, Google/Discord vuelve a `/movil/enlazar`, que redirige a
   `paragon://auth?token=<sessionToken>` — un intent-filter en
   `ComposeMainActivity` lo captura.
3. Guardar `token` (ver `TokenStore.kt`) y mandarlo en cada llamada como:
   `Authorization: Bearer <token>`
4. Si cualquier endpoint responde **401**, el token ha caducado o se cerró
   sesión en la web — borrar el token guardado y volver a pedir login.
   (`PanelRepository.kt` ya hace esto.)

Todos los endpoints de abajo exigen ese header. Sin él, o con un token no
válido: `401 { "error": "No autenticado" }`.

## `GET /api/mobile/panel` — Dashboard

```json
{
  "profile": { "handle": "mario", "name": "Mario", "level": 14, "psnId": "mario_psn", "image": "https://..." },
  "stats": { "platinums": 87, "trophies": 4312, "games": 214, "completionRate": 68 },
  "racha": { "actual": 4, "mejor": 12 }
}
```
`psnId` puede ser `null` (sin cuenta PSN vinculada). `image` es la MISMA foto
que se ve en toda la web (`resolveAvatarUrl` en lib/profiles.ts: subida a
mano > PSN > cualquier otra cuenta vinculada > la del proveedor de login) —
`null` si no hay ninguna. Para cambiarla desde la app, ver
`POST /api/mobile/profile/avatar` más abajo. `racha` es el MISMO cálculo que
`GET /api/mobile/stats` (`rachas()` en `lib/history.ts`) — duplicado aquí
solo como dato (no como función) para que el icono de racha de la cabecera
no obligue a pedir todo el endpoint de Estadísticas en cada apertura de la
app; `actual` es 0 si no se ha sacado ningún trofeo hoy o ayer.

## `GET /api/mobile/racha` — Detalle de la racha diaria

```json
{
  "actual": 4, "mejor": 12, "diasActivos": 88,
  "dias": [ { "dia": "2026-08-14", "trofeos": 0 }, { "dia": "2026-08-15", "trofeos": 3 } ]
}
```
Para la pantalla dedicada que se abre al tocar el icono de fuego del
Panel — no la Estadísticas completa. `dias` son los últimos 35 (5
semanas), pensados para una tira visual, no el heatmap de 365 días de la
web. `actual`/`mejor`/`diasActivos` son el mismo cálculo que
`GET /api/mobile/stats` y que el propio Panel (duplicado como dato en los
tres sitios a propósito, ver la nota en `panel/route.ts`).

## `GET /api/mobile/panel/highlights` — "A un paso del platino", "Recientes" y "Siguiente trofeo"

```json
{
  "nearPlatinum": [ { "id": "abc123", "title": "Elden Ring", "coverUrl": "https://...", "earnedTrophies": 32, "totalTrophies": 42, "percent": 74 } ],
  "recent": [ { "id": "abc123", "title": "Elden Ring", "coverUrl": "https://...", "earnedTrophies": 32, "totalTrophies": 42, "percent": 74 } ],
  "nextTrophies": [ { "gameId": "abc123", "gameTitle": "Elden Ring", "trophyId": "t1", "trophyName": "Maestro de las artes marciales", "detail": "...", "rarityPercent": 18.4, "gameProgress": 74, "iconUrl": "https://...", "grade": "gold" } ]
}
```
MISMO cálculo que la portada web (`gameProgress()` en `src/lib/stats.ts`),
no una aproximación aparte — `nearPlatinum` son juegos con platino real
(`defined.platinum > 0`) sin conseguir, ordenados por trofeos pendientes
(máx. 3); `recent` son los últimos jugados, no deseados (máx. 6). Endpoint
separado de `/api/mobile/panel` a propósito: evita duplicar `gameProgress()`
en Kotlin y que las dos versiones diverjan con el tiempo.

`nextTrophies` (máx. 4) es el mismo recomendador de "Siguiente trofeo" de
la portada web (`lib/recommendations.ts`, `TrophyRecommendations.tsx`):
prioriza juego base sobre DLC, progreso alto y mayor probabilidad real de
conseguirlo. `rarityPercent`/`grade`/`iconUrl` pueden ser `null`.

## `GET /api/mobile/library` — Biblioteca

```json
{ "games": [ {
  "id": "abc123", "platform": "psn", "title": "Elden Ring",
  "deviceLabel": "PS5", "iconUrl": "https://...", "progressPercent": 74,
  "definedTotal": 42, "earnedTotal": 32,
  "defined": { "bronze": 20, "silver": 15, "gold": 6, "platinum": 1 },
  "earned": { "bronze": 18, "silver": 10, "gold": 3, "platinum": 0 },
  "isWishlist": false, "isPinned": false,
  "lastPlayedAt": "2026-09-01T12:00:00.000Z", "playtimeMinutes": 3120
} ] }
```
`platform`: `"psn" | "steam" | "xbox" | "manual"` (las demás del tipo ancho
`Platform` son residuales de juegos importados a mano, ver HANDOFF).
`defined`/`earned` son `null` en Steam/Xbox (no tienen desglose por metal).

**Filtrado y orden son responsabilidad del cliente** (igual que la web,
`LibraryGrid.tsx`) — se manda el array completo, no hay `?estado=`/`?orden=`
en el servidor. Estados a replicar si hace falta un selector como el de la
web (`src/lib/stats.ts`, `GameStatus`): `platinado`, `completado`,
`en-curso`, `sin-empezar`, `deseados`, `a-punto`, `abandonado` — se derivan
de `progressPercent`/`isWishlist`/`earnedTotal` vs `definedTotal`, no vienen
como campo aparte.

## `GET /api/mobile/feed` — Actividad (propia + amigos)

```json
{ "items": [ {
  "id": "act_1", "type": "platinum", "rating": null, "review": null,
  "createdAt": "2026-09-15T20:00:00.000Z",
  "user": { "id": "u1", "handle": "mario", "name": "Mario", "image": "https://..." },
  "game": { "id": "abc123", "title": "Elden Ring", "iconUrl": "https://...", "deviceLabel": "PS5" },
  "reactions": 3, "reacted": false,
  "comments": [ { "activityId": "act_1", "body": "GG", "userName": "Ana", "createdAt": "..." } ],
  "views": 12
} ] }
```
`type`: `"review" | "rating" | "platinum" | "favorite" | "new_game"`.
Máximo 50 elementos, ya ordenados por fecha descendente. `views`: número de
usuarios distintos que han visto la publicación (tabla `activity_view`, PK
compuesta por actividad+usuario — no cuenta visitas repetidas de la misma
persona).

## `POST /api/mobile/feed/{activityId}/react` — Reaccionar/quitar reacción

```json
{ "reacted": true }
```
Alterna: si ya habías reaccionado, la quita y devuelve `false`. Mismo
`toggleActivityReactionAction` que la web (botón de aplauso) — pensado para
el doble toque en una tarjeta del Feed (idea #13 del brainstorm de v1.0),
no hay un endpoint aparte para "quitar" solamente.

## `POST /api/mobile/feed/{activityId}/view` — Registrar visualización

```json
{ "isNew": true }
```
Idempotente — llamarlo varias veces por la misma persona solo inserta la
primera vez; `isNew: false` en las siguientes. Pensado para llamarse cuando
una tarjeta del Feed entra en pantalla (`LazyColumn` solo compone lo
visible, así que sirve de aproximación razonable a "se ha visto"). El
cliente usa `isNew` para saber si debe sumar +1 al contador que ya tenía
pintado (el `GET /feed` no incluye la vista que se está a punto de
registrar).

## `POST /api/mobile/feed/{activityId}/comment` — Añadir un comentario

Body: `{ "body": "GG" }`. Respuesta (el comentario recién creado, mismo
shape que los de `GET /feed`):
```json
{ "activityId": "act_1", "body": "GG", "userName": "Mario", "createdAt": "..." }
```
`400` si el cuerpo, tras recortar espacios, queda vacío. Mismo
`addActivityComment` que usa `addActivityCommentAction` en la web — antes
la app solo podía leer comentarios, no escribirlos.

## Ligas propias (`lib/leagues.ts`) — distintas de la Liga Mensual global

Antes solo existía la "Liga Mensual" global (todos los usuarios, sin tabla
propia, calculada al vuelo — ver `getLigaMensual` en `lib/ligas.ts`, sigue
existiendo tal cual). Esto es otra cosa: ligas que crea un usuario, con
nombre propio y duración opcional, y a las que solo se puede invitar a
amigos reales (`areFriends`) — y que el invitado tiene que aceptar antes de
contar en la clasificación (ver `status` más abajo). Mismo cálculo de
puntos (platino 100/oro 50/plata 25/resto 10) que la Liga Mensual, pero
acotado a los miembros de cada liga y a su propia ventana de tiempo (desde
que se creó hasta que termina, o para siempre si no tiene duración) en vez
del mes en curso.

### `GET /api/mobile/leagues` — Mis ligas (ya aceptadas)

```json
{ "leagues": [ { "id": "lg_1", "name": "Los de siempre", "ownerId": "u1", "memberCount": 3, "endsAt": null } ] }
```
`memberCount` solo cuenta miembros que ya aceptaron. Las invitaciones sin
responder no salen aquí — ver `GET /leagues/invites`.

### `POST /api/mobile/leagues` — Crear una liga

Body: `{ "name": "...", "durationValue"?: 3, "durationUnit"?: "dias" | "semanas" | "meses" | "anios" }`.
El creador entra como único miembro (ya aceptado). Sin duración, la liga no
tiene fecha de fin. `400` si el nombre, tras recortar espacios, queda vacío.
```json
{ "id": "lg_1", "name": "Los de siempre", "ownerId": "u1", "memberCount": 1, "endsAt": "2026-12-17T00:00:00.000Z" }
```

### `GET /api/mobile/leagues/invites` — Invitaciones sin responder

```json
{ "invites": [ { "id": "lg_2", "name": "Otra liga", "ownerId": "u3", "ownerName": "Ana" } ] }
```

### `POST /api/mobile/leagues/{id}/accept` — Aceptar una invitación

Sin body. A partir de aquí sí cuentas en la clasificación. `404` si no hay
ninguna invitación pendiente a esa liga para ti.
```json
{ "ok": true }
```

### `POST /api/mobile/leagues/{id}/decline` — Rechazar una invitación

Sin body. Se borra, como si nunca hubiera llegado. `404` en las mismas
condiciones que `/accept`.

### `GET /api/mobile/leagues/{id}` — Clasificación de una liga

`404` si no existe o si no eres miembro ACEPTADO (ver esta liga sin haber
aceptado la invitación no tiene sentido — para eso está `/accept`).
```json
{
  "id": "lg_1", "name": "Los de siempre", "ownerId": "u1", "isOwner": true,
  "durationValue": 3, "durationUnit": "meses", "endsAt": "2026-12-17T00:00:00.000Z",
  "standings": [ { "userId": "u1", "handle": "mario", "name": "Mario", "image": "...", "points": 250 } ],
  "pendingMembers": [ { "userId": "u4", "handle": "ana2", "name": "Ana", "image": "..." } ],
  "challenge": {
    "gameId": "abc123", "title": "Elden Ring", "iconUrl": "https://...",
    "standings": [
      { "userId": "u1", "handle": "mario", "name": "Mario", "image": "...", "progressPercent": 100, "hasPlatinum": true, "platinumAt": "2026-09-10T07:55:00.000Z" },
      { "userId": "u2", "handle": "ana", "name": "Ana", "image": "...", "progressPercent": 64, "hasPlatinum": false, "platinumAt": null }
    ]
  }
}
```
Los miembros sin ningún trofeo en la ventana de la liga salen igualmente,
con `points: 0` — la liga enseña a todos sus miembros aceptados, no solo a
quien ya ha cazado algo. `pendingMembers` viene vacío salvo que
`isOwner: true` (es información de gestión, no le interesa a nadie más).
`challenge` es `null` si la liga no tiene ningún juego de reto fijado (ver
`POST .../challenge`). Dentro, `standings` va ordenado por quién llegó
antes al platino (o al 100% en Steam, que no tiene grado "platinum" propio
— ver `esPlatinoEquivalente`), y luego por `progressPercent` para quien
todavía no lo tiene.

### `POST /api/mobile/leagues/{id}/challenge` — Fijar el juego de reto

Body: `{ "gameId": "abc123" }` (o `{ "gameId": null }` para quitarlo). Solo
el dueño (`403` si no lo eres). El picker de juego en el cliente usa la
biblioteca del dueño (`GET /library`), igual que la web.

### `POST /api/mobile/leagues/{id}/members` — Invitar a un amigo

Body: `{ "userId": "..." }`. Solo el dueño puede invitar (`403` si no lo
eres), y solo a alguien que ya sea tu amigo de verdad (relación `accepted`
en `friendships`) — `400` en caso contrario. Entra como `pending` — avisa
por Web Push + FCM y, si tiene Discord vinculado con los DMs activados, por
ahí también — y no cuenta en la clasificación hasta que acepte.

### `DELETE /api/mobile/leagues/{id}/members/{userId}` — Quitar a alguien

El dueño puede quitar a cualquiera (menos a sí mismo — para eso está borrar
la liga entera); cualquier otro miembro solo puede quitarse a sí mismo
(salir). `403` en cualquier otro caso.

### `POST /api/mobile/leagues/{id}/leave` — Salir de una liga

Igual que el `DELETE` de arriba apuntando a tu propio `userId`, pero sin que
la app tenga que conocerlo (solo tiene el token, no el id de usuario, a
diferencia de la sesión completa de la web) — pensado para el botón "Salir"
de la app móvil.

### `DELETE /api/mobile/leagues/{id}` — Borrar la liga entera

Solo el dueño (`403` si no lo eres). Cascada sobre los miembros.

## `GET /api/mobile/users/{handle}` — Ficha de perfil de cualquiera

```json
{
  "userId": "u1", "name": "Ana", "handle": "ana", "image": "https://...",
  "level": 12, "platinos": 10, "trofeos": 1200,
  "accounts": [ { "platform": "psn", "username": "ana_psn" } ],
  "recentGames": [ { "id": "abc123", "title": "Elden Ring", "coverUrl": "https://...", "percent": 74 } ]
}
```
Para el bottom sheet de perfil al tocar a alguien en Comunidad/Amigos (no
hace falta que sea amigo tuyo). `image` es la misma foto real que en toda
la web (`resolveAvatarUrl`), `null` si no tiene ninguna. `404` si no existe
ese handle. `recentGames` son los últimos 3 jugados, sin deseados.

## `GET /api/mobile/social` — Amigos y Liga

Dos conceptos DISTINTOS, no la misma lista en otro orden:

```json
{
  "amigos": [ {
    "userId": "u1", "name": "Mario", "handle": "mario", "avatarUrl": "https://...",
    "trophyLevel": 14, "platinos": 87, "trofeos": 4312, "juegos": 214, "completadoMedio": 68,
    "accounts": [ { "platform": "psn", "username": "mario_psn" }, { "platform": "steam", "username": "Mario" } ]
  } ],
  "liga": [ {
    "userId": "u1", "handle": "mario", "name": "Mario", "image": "https://...", "points": 340
  } ]
}
```
- `amigos`: tú + tus amigos reales, con vuestras cifras de siempre.
  `accounts` es la lista de sus cuentas de plataforma vinculadas (puede
  estar vacía) — el Online ID de PSN, gamertag de Xbox o SteamID reales,
  para poder añadirlos directamente en esa plataforma.
- `liga`: liga mensual **global** (todo el mundo, no solo amigos), puntuada
  solo por trofeos de ESTE mes calendario (platino=100, oro=50, plata=25,
  bronce/sin metal=10) — se reinicia cada mes. Pestaña "Ligas" del plan.

## `GET /api/mobile/games/{gameId}` — Ficha de juego

```json
{ "game": {
  "id": "abc123", "platform": "psn", "title": "Elden Ring", "...": "(mismos campos que en /library)",
  "trophiesSyncedAt": "2026-09-10T08:00:00.000Z", "notes": "Guía: empezar por...",
  "trophies": [ {
    "id": "t1", "name": "Elden Lord", "detail": "Consigue uno de los finales.",
    "grade": "platinum", "earned": true, "earnedAt": "2026-09-10T07:55:00.000Z",
    "rarityPercent": 4.2, "hidden": false, "iconUrl": "https://...",
    "isMissable": false, "xp": 300
  } ]
}}
```
`grade` puede faltar en logros de Xbox/Steam sin metal (solo tienen `xp`,
el Gamerscore/puntuación real de ese logro). 404 si el juego no es tuyo o
no existe. La primera carga tras vincular una cuenta puede tardar algo
más — puede disparar un resync de trofeos en el servidor si estaban
desactualizados.

## `POST /api/mobile/games/{gameId}/pin` — Anclar/desanclar para Modo Enfoque

```json
{ "pinned": true }
```
Sin body. Desancla SIEMPRE lo que hubiera antes primero — nunca hay más de
un juego anclado a la vez, sin necesidad de mandar el id del anterior.

## `POST /api/mobile/games/{gameId}/reserve` — Reservar/quitar para el próximo hito

```json
{ "reservado": true }
```
Sin body. "Cerrojo de Hitos": reserva este juego para tu próximo platino en
número redondo (#25, #50...). Solo uno a la vez, igual que anclar.

## `GET /api/mobile/milestone` — Qué hay reservado ahora mismo

```json
{ "hito": { "gameId": "abc123", "titulo": "Elden Ring", "iconUrl": "https://...", "numero": 100 } }
```
`hito` es `null` si no hay nada reservado, o si el juego reservado YA se
platinó (el cerrojo se cumplió solo). `numero` se recalcula siempre a
partir de tus platinos actuales, nunca se guarda un número viejo.

## `GET /api/mobile/collections` — Carpetas de juegos

```json
{ "collections": [ { "id": "col_1", "name": "Para el finde", "gameIds": ["abc123", "def456"] } ] }
```

## `POST /api/mobile/collections` — Crear carpeta

Body: `{ "name": "..." }` (máx. 40 caracteres). `{ "id": "col_1" }` o `400`
con `{ "error": "..." }` si el nombre no vale.

## `PATCH /api/mobile/collections/{id}` — Renombrar carpeta

Body: `{ "name": "..." }`. `{ "ok": true }` o `400` igual que crear.

## `DELETE /api/mobile/collections/{id}` — Borrar carpeta

`{ "ok": true }`. No borra los juegos, solo la carpeta.

## `POST /api/mobile/collections/{id}/games/{gameId}` — Meter/sacar un juego de la carpeta

```json
{ "dentro": true }
```
Sin body. `dentro: false` también si la carpeta no es tuya o no existe (no
hay 404 aparte — el resultado que le importa al cliente es el mismo).

## `GET /api/mobile/accounts` — Qué cuentas están vinculadas

```json
{
  "oauth": [
    { "provider": "google", "linked": true, "configured": true },
    { "provider": "discord", "linked": false, "configured": true }
  ],
  "platforms": [
    { "platform": "psn", "linked": true, "username": "mario_psn", "level": 245 },
    { "platform": "steam", "linked": false, "username": null, "level": null },
    { "platform": "xbox", "linked": false, "username": null, "level": null }
  ]
}
```
`configured` es si el servidor tiene ese proveedor OAuth dado de alta
(`AUTH_GOOGLE_ID`/`AUTH_DISCORD_ID`) — no ofrecer el botón si es `false`,
revienta al pulsarlo. Para **vincular** Google/Discord no hay un POST
aquí: se reabre `/movil/entrar/{provider}` (el mismo route del login) con
sesión activa — la Custom Tab comparte cookies con Chrome, así que
`signIn()` detecta la sesión y VINCULA en vez de crear una cuenta nueva.

## `POST /api/mobile/accounts/{platform}` — Vincular PSN/Steam/Xbox

`{platform}` es `psn`, `steam` o `xbox` (Google/Discord van por OAuth, ver
arriba). Body: `{ "input": "tu-online-id-o-gamertag" }`.

```json
{ "username": "mario_psn", "legible": true, "juegos": 214 }
```
`legible: false` si el perfil está en privado (se vincula igual, pero no se
pueden leer sus juegos). Error `422` con `{ "error": "..." }` si la cuenta
ya está vinculada a OTRO usuario de Paragon, o si la plataforma no
responde — mismos mensajes que la web (`PlatformAccountAlreadyLinkedError`
y demás, ver `src/lib/profiles.ts`).

## `DELETE /api/mobile/accounts/{platform}` — Desvincular PSN/Steam/Xbox

`{ "ok": true }`. Borra la cuenta vinculada, no los juegos ya importados.

## `POST /api/mobile/profile` — Ajustes del perfil

Body: `{ "name": "Mario", "image": "https://..." | null }`. `{ "ok": true }`
o `400` si `name` viene vacío.

## `POST /api/mobile/profile/avatar` — Cambiar la foto de perfil

`multipart/form-data` con un único campo `file` (jpg/jpeg/png/gif/webp).
`{ "url": "https://..." }` o `400`/`500` con `{ "error": "..." }`. Sube a
Supabase Storage (bucket `Avatars`) y actualiza `users.image` +
`avatarPersonalizado: true` directamente — no hace falta llamar después a
`POST /api/mobile/profile` para que se guarde, ya queda vinculada con la
web al momento (mismo criterio que `/ajustes` en la web, ver
`resolveAvatarUrl`). Versión para la app de `POST /api/upload` (esa exige
la cookie de sesión de NextAuth, que la app no tiene — aquí se autentica
igual que el resto de `/api/mobile/*`, con el Bearer token).

## `POST /api/mobile/logout` — Cerrar sesión SOLO en este móvil

Sin body. `{ "ok": true }` siempre — ver `mintMobileSession`/
`revokeMobileSession` en `lib/mobileAuth.ts`.

## `GET /api/mobile/stats` — Estadísticas

```json
{
  "paragonScore": { "total": 12450, "porPlataforma": [ { "platform": "psn", "puntos": 8000, "trofeos": 1200 } ] },
  "trophyDna": { "ejes": [ { "key": "rpg", "label": "RPG", "valor": 100, "trofeos": 800 } ], "arquetipo": "El Completista" },
  "rachas": { "actual": 4, "mejor": 12, "diasActivos": 88 },
  "historico": { "conFecha": 4200, "esteAnio": 900, "mejorMes": { "mes": "2026-03", "total": 210 } },
  "financiero": { "totalGastado": 1200, "totalHoras": 800, "costeHoraMedio": 1.5, "juegosConDatos": 40 },
  "eficiencia": { "ritmoMedioPct": -12, "juegosConDatos": 20 },
  "backlog": { "juegosContados": 15, "horasHistoriaRestantes": 120, "horasPlatinoRestantes": 300 },
  "horasTotales": 14280
}
```
Versión CURADA para el móvil, no las ~15 piezas de
`EstadisticasCompletas.tsx` (heatmaps de calendario/horas, salón de la
vergüenza, comparador con amigos, gráficas de barras...) — esas son mejor
en pantalla grande o ya están cubiertas en otro sitio (recientes/a un paso
del platino en `/api/mobile/panel/highlights`, amigos en
`/api/mobile/social`). `eficiencia.ritmoMedioPct` negativo significa más
lento que la estimación de HowLongToBeat, positivo más rápido.

## `POST /api/mobile/games/{gameId}/notes` — Nota privada (Modo Enfoque)

Body: `{ "notes": "..." }` (vacía para borrarla). `{ "ok": true }`. Mismo
campo que usa `/nota` del bot de Discord.

## `POST /api/mobile/games/{gameId}/resync` — "¿Ya lo tengo?" (Modo Enfoque)

```json
{ "nuevos": 2 }
```
o `{ "nuevos": 0, "error": "..." }` — vuelve a pedir los trofeos de ESTE
juego a su plataforma sin esperar al cron. Siempre `200`, nunca 4xx/5xx
para el caso de error de plataforma: el cliente distingue por el campo
`error`, igual que la web.

## `GET /api/mobile/compare/{handle}` — Comparar con alguien

```json
{
  "me": { "name": "Mario", "level": 17, "platinos": 24, "trofeos": 4655, "juegos": 290 },
  "them": { "name": "Ana", "level": 12, "platinos": 10, "trofeos": 1200, "juegos": 80 },
  "sharedGames": [ { "id": "abc123", "title": "Elden Ring", "iconUrl": "https://...", "myPercent": 74, "theirPercent": 40, "myHours": 32, "theirHours": 10 } ]
}
```
`handle` no tiene que ser tu amigo — igual que en la web, cualquier perfil
público se puede comparar. `404` si no existe ese handle, `409` si esa
persona no tiene ninguna cuenta vinculada (nada que comparar). Versión
CURADA: sin la carrera trofeo a trofeo ("quién lo sacó antes",
`sharedTrophyLeads` en la web) — la pieza más pesada y la que menos aporta
en una pantalla pequeña. `myHours`/`theirHours` pueden ser `null` si la
plataforma no da tiempo jugado (Xbox, o Steam sin ese dato).

## `POST /api/mobile/push-token` — Notificaciones push nativas (FCM)

Body: `{ "token": "..." }` — el token de Firebase Cloud Messaging del
dispositivo (`FirebaseMessaging.getInstance().token` en Android). Llamar al
arrancar la app (tras tener sesión) y cada vez que `onNewToken` lo renueve.
`{ "ok": true }` o `400` si falta el token. Ver `lib/fcm.ts`.

Esto es el equivalente para Android de la suscripción Web Push que ya usa
la web — un canal aparte porque Web Push (VAPID) no puede entregar nada a
una app nativa, solo a navegadores/PWA. Los eventos que ya avisaban por
Web Push (solicitud de amistad, trofeo nuevo, platino conseguido...) mandan
ahora los dos a la vez (`enviarPush` + `enviarPushFcm`); ninguno de los dos
hace nada si el usuario no tiene nada registrado en ese canal, así que es
seguro llamar a los dos siempre.

**Necesita configurar `FIREBASE_SERVICE_ACCOUNT_KEY` en el servidor** (el
JSON de la cuenta de servicio de Firebase) y `android/app/google-services.json`
en el proyecto Android — sin eso, este endpoint sigue funcionando pero
`enviarPushFcm` no manda nada de verdad, en silencio.

## `GET /api/mobile/games/search?q=` — Buscar en el catálogo (IGDB)

Pensado para "Añadir a Paragon" desde el Sharesheet de Android (compartir un
título desde Chrome/YouTube). Mismo `searchGames` que usa
`GET /api/games/search` en la web (`AddManualGameModal.tsx`), aquí detrás de
auth móvil.
```json
{ "results": [ { "igdbId": 1234, "title": "Hades II", "coverUrl": "https://...", "developer": "Supergiant Games", "genres": ["Roguelike"], "pegi": "16" } ] }
```
`q` vacío devuelve `{ "results": [] }` sin llamar a IGDB.

## `POST /api/mobile/wishlist` — Añadir un juego a Deseados

Body (un resultado de la búsqueda de arriba, tal cual):
```json
{ "igdbId": 1234, "title": "Hades II", "coverUrl": "https://...", "pegi": "16", "genres": ["Roguelike"], "developer": "Supergiant Games", "publisher": "Supergiant Games", "deviceLabel": "Deseados" }
```
`deviceLabel` es opcional (por defecto "Deseados" — libre, no hay catálogo
de dispositivos). Mismo `addManualGame(..., isWishlist=true)` que
`addToWishlistAction` en la web — esa es una Server Action ligada a la
cookie de sesión, no se puede llamar desde la app nativa, de ahí este
endpoint aparte. `400` si falta `title`/`igdbId` válido.
```json
{ "gameId": "manual:1234:deseados" }
```
