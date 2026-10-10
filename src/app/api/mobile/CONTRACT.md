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
   **Desde el 4 oct 2026 con `?k=<clave>`**: 32 bytes aleatorios en base64url
   sin relleno (43 caracteres), nuevos en cada login y guardados en la app
   (`EnlaceSeguro.kt`).
2. Tras el login, Google/Discord vuelve a `/movil/enlazar?k=...`, que
   redirige a `paragon://auth?c=<token cifrado>` — un intent-filter en
   `ComposeMainActivity` lo captura. `c` = base64url(iv[12] | cifrado |
   etiqueta[16]) con AES-256-GCM y la clave `k` (`lib/enlaceMovil.ts`). Sin
   `k` (app antigua) la página pide actualizar la app y no entrega token.
   La app ignora cualquier enlace que no descifre con su clave pendiente:
   así ni otra app que intercepte `paragon://` lee el token, ni un enlace
   fabricado puede meterte en la cuenta de otro.
3. Guardar el token descifrado (ver `TokenStore.kt`) y mandarlo en cada
   llamada como: `Authorization: Bearer <token>`. La app manda también
   `Accept-Language` con el idioma del teléfono: la ficha de juego y
   "Siguiente trofeo" devuelven los trofeos en ese idioma si la plataforma
   lo tiene (es/en/de/fr; si no, el idioma base).
4. Si cualquier endpoint responde **401**, el token ha caducado o se cerró
   sesión en la web — borrar el token guardado y volver a pedir login.
   (`PanelRepository.kt` ya hace esto.)

Todos los endpoints de abajo exigen ese header. Sin él, o con un token no
válido: `401 { "error": "No autenticado" }`.

**`429 { "error": "..." }`**: las rutas que escriben o llaman a servicios
externos (vincular, resync, búsqueda, guías, notas, ligas, clanes,
carpetas, reacciones, push-token...) tienen límite de peticiones por
usuario (`lib/rateLimit.ts`). Enseñar el `error` tal cual.

## `GET /api/mobile/panel` — Dashboard

```json
{
  "profile": { "handle": "mario", "name": "Mario", "level": 14, "psnId": "mario_psn", "image": "https://..." },
  "stats": { "platinums": 87, "trophies": 4312, "games": 214, "completionRate": 68, "gold": 214, "silver": 890, "bronze": 3121 },
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

**`409` "Perfil sin terminar de configurar"**: login nuevo (Google/Discord)
que todavía no tiene `handle` — el equivalente móvil de que la web te mande
a `/bienvenida`. Se arregla con `POST /api/mobile/profile/handle` (ver más
abajo); la app tiene que enseñar una pantalla para elegirlo en vez de
tratarlo como un error genérico con "Reintentar" (ese botón repite la misma
petición para siempre, nunca se arregla solo).

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

## `GET /api/mobile/panel/highlights` — "A un paso del platino", "Recientes", "Siguiente trofeo" y "Últimos trofeos"

```json
{
  "nearPlatinum": [ { "id": "abc123", "title": "Elden Ring", "coverUrl": "https://...", "earnedTrophies": 32, "totalTrophies": 42, "percent": 74 } ],
  "recent": [ { "id": "abc123", "title": "Elden Ring", "coverUrl": "https://...", "earnedTrophies": 32, "totalTrophies": 42, "percent": 74 } ],
  "nextTrophies": [
    { "gameId": "abc123", "gameTitle": "Elden Ring", "trophyId": "t1", "trophyName": "Maestro de las artes marciales", "detail": "...", "rarityPercent": 18.4, "gameProgress": 74, "iconUrl": "https://...", "grade": "gold" }
  ],
  "latestTrophies": [
    { "gameId": "abc123", "gameTitle": "Elden Ring", "gameIconUrl": "https://...", "trophyId": "t7", "trophyName": "Señor del Círculo", "iconUrl": "https://...", "grade": "gold", "earnedAt": "2026-10-05T21:14:00.000Z", "rarityPercent": 12.3 }
  ]
}
```
MISMO cálculo que la portada web (`gameProgress()` en `src/lib/stats.ts`),
no una aproximación aparte — `nearPlatinum` son juegos con platino real
(`defined.platinum > 0`) sin conseguir, ordenados por trofeos pendientes
(máx. 3); `recent` son los últimos jugados, no deseados (máx. 6). Endpoint
separado de `/api/mobile/panel` a propósito: evita duplicar `gameProgress()`
en Kotlin y que las dos versiones diverjan con el tiempo.

`nextTrophies` es "Siguiente trofeo" (`getTrophyRecommendations()` en
`lib/recommendations.ts`, máx. 4 para el móvil) — MISMA prioridad que la
web ("Siguiente trofeo" en `app/page.tsx`): primero el juego BASE (el
platino nunca depende del DLC), luego progreso alto, luego mayor
probabilidad real de conseguirlo (`rarityPercent` más alto = menos raro).
`rarityPercent`/`grade`/`iconUrl` pueden ser `null`.

`latestTrophies` es "Últimos trofeos" (`ultimosTrofeos()` en
`lib/history.ts`, máx. 5): los conseguidos más recientes de toda la
biblioteca por `earnedAt`, lo mismo que la sección del perfil web.
`gameIconUrl`/`iconUrl`/`grade`/`rarityPercent` pueden ser `null`.

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
  "reactions": 3, "reacted": false, "miReaccion": null,
  "comments": [ { "activityId": "act_1", "body": "GG", "userName": "Ana", "createdAt": "..." } ],
  "views": 12
} ] }
```
`type`: `"review" | "rating" | "platinum" | "favorite" | "new_game" | "status"`.
`"status"` es un estado libre publicado desde Comunidad: **`game` viene
`null`** y el texto vive en `review` (no es una cita sobre un juego, es la
publicación entera). Soportado por la app desde el 30 sept 2026 — antes se
filtraban en el propio endpoint porque la app esperaba `game` siempre.
`miReaccion` es la clave de con cuál de las 5 reacciones ha reaccionado esta
cuenta (`"aplauso" | "fuego" | "trofeo" | "risa" | "sorpresa"`, ver
`lib/reacciones.ts`), o `null` si ninguna. Máximo 50 elementos, ya ordenados
por fecha descendente. `views`: número de usuarios distintos que han visto
la publicación (tabla `activity_view`, PK compuesta por actividad+usuario —
no cuenta visitas repetidas de la misma persona).

## `POST /api/mobile/feed/{activityId}/react` — Reaccionar/quitar reacción

Body: `{ "reaction": "fuego" }` (opcional — sin él, o con una clave que no
es una de las 5, cae en `"aplauso"`, mismo comportamiento que antes del 30
sept 2026).
```json
{ "reacted": true }
```
Alterna: la misma reacción otra vez la quita (`"reacted": false`); una
distinta a la que ya tenías la cambia sin tocar el contador total. Mismo
`toggleActivityReactionAction` que la web — pensado también para el doble
toque en una tarjeta del Feed (idea #13 del brainstorm de v1.0, reacciona
con `"aplauso"`), no hay un endpoint aparte para "quitar" solamente.

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
  "standings": [ { "userId": "u1", "handle": "mario", "name": "Mario", "image": "...", "points": 250, "movimiento": 2 } ],
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

`movimiento` (en el `standings` de arriba, no en el del reto) son puestos
ganados (positivo) o perdidos (negativo) desde la última foto semanal —
`null` si el cron `/api/cron/league-snapshot` no ha corrido todavía para
esta liga, o si el miembro se unió después de la última foto. Ver
`getLeagueRankings`/`leagueStandingSnapshots` en `lib/leagues.ts`.

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

## `GET /api/mobile/clans` — Lista de clanes

```json
{
  "clans": [ { "id": "cl_1", "name": "Fontanero", "tag": "FNTR", "description": "...", "memberCount": 2 } ],
  "myClan": { "tag": "FNTR", "name": "Fontanero", "role": "owner" }
}
```
Todos los clanes que existen, ordenados por nº de miembros (más primero) —
mismo dato que `/clanes` (web). `myClan` es `null` si el usuario no
pertenece a ninguno. `role`: `"owner"` | `"member"` (el esquema contempla
`"admin"` para sublíderes, pero no está implementado todavía en ningún
sitio — no construir nada que dependa de él).

### `POST /api/mobile/clans` — Crear un clan

Body: `{ "name": "...", "tag": "...", "description"? }`. Mismas reglas que
la web (`createClanAction`), todas comprobadas en el servidor, no solo en
el cliente:
- **Nivel 5 de Paragon** mínimo (`paragonProgress` sobre la biblioteca del
  usuario) — `403` si no llega.
- `tag`: máximo 5 caracteres — `400` si se pasa. Se guarda siempre en
  MAYÚSCULAS (`tag.toUpperCase()`), da igual cómo lo mande el cliente.
- No puedes crear uno si ya perteneces a otro (el tuyo o cualquiera) —
  `409`. **Un usuario solo puede estar en un clan a la vez**, reforzado
  también con un índice único en base de datos (protege contra doble clic
  incluso en condición de carrera).
- `name`/`tag`/`description` pasan por el filtro de lenguaje ofensivo
  (`errorSiOfensivo`) — `400` con el motivo si algo no pasa.

El creador entra automáticamente como `"owner"`.

## `GET /api/mobile/clans/invites` — Invitaciones a clanes pendientes

```json
{ "invites": [ { "clanId": "cl_1", "clanName": "Fontanero", "clanTag": "FNTR", "invitedByName": "Mario", "invitedByHandle": "mario", "createdAt": "..." } ] }
```
Las invitaciones **se borran al resolverse** (aceptada o rechazada) — no
hay histórico, es un buzón de pendientes.

### `POST /api/mobile/clans/invites/{clanId}/accept` — Aceptar

Sin body. `400` si la invitación ya no existe, o si por alguna razón ya
estás en otro clan (no debería pasar en el flujo normal, pero el backend
lo comprueba igual).

### `POST /api/mobile/clans/invites/{clanId}/decline` — Rechazar

Sin body. Simplemente borra la invitación.

## `GET /api/mobile/clans/{tag}` — Ficha de un clan

```json
{
  "clan": { "id": "cl_1", "tag": "FNTR", "name": "Fontanero", "description": "..." },
  "score": 1840,
  "leaderboard": [ { "userId": "u1", "role": "owner", "handle": "fende21", "name": "FENDE21", "image": "https://...", "score": 73550, "trofeos": 4741, "contribucion": 1840, "trofeosEnClan": 96, "joinedAt": "2026-09-14T10:02:11.000Z" } ],
  "activity": [ { "id": "act_1", "type": "rating", "rating": 5, "createdAt": "...", "user": { "handle": "fende21", "name": "FENDE21", "image": "https://..." }, "game": { "id": "psn-...", "title": "...", "iconUrl": "https://..." } } ],
  "amIMember": true,
  "amIOwner": false,
  "invitables": []
}
```
`404` si el tag no existe. `score` es la **puntuación del clan**: la suma
de `contribucion` de todos los miembros. `contribucion` es el Paragon Score
(misma fórmula unificada entre plataformas que el resto de la app) solo de
los trofeos ganados desde `joinedAt`, y `trofeosEnClan` cuántos son; un
trofeo sin fecha no cuenta. `score` y `trofeos` de cada miembro siguen
siendo los de toda su vida. El `leaderboard` viene ordenado por
`contribucion` (y, a igualdad, por `score`).
`activity` es la actividad reciente de los miembros (máx. 15): **sin
reacciones, comentarios ni contador de vistas a propósito** — es un
escaparate de que el clan está vivo, no una segunda bandeja de entrada;
`type`: `"review" | "rating" | "platinum" | "favorite" | "new_game"`,
mismo significado que en `/feed`. `invitables` (amigos que se pueden
invitar ahora mismo: ni ya están en un clan, ni ya invitados a este) viene
vacío salvo que `amIOwner: true` — nadie más lo necesita.

### `POST /api/mobile/clans/{tag}/join` — Unirse

Sin body. `400` si ya estás en un clan (el tuyo o cualquier otro).

### `POST /api/mobile/clans/{tag}/leave` — Abandonar

Sin body. **Si eres el owner, se borra el clan ENTERO** (miembros e
invitaciones en cascada) — no hay transferencia de liderazgo, es una
simplificación deliberada de `lib/clans.ts`. La app debe confirmarlo con
el usuario ANTES de llamar aquí (mismo `confirm()` que hace la web) — el
backend no vuelve a preguntar.

### `POST /api/mobile/clans/{tag}/invite` — Invitar a un amigo

Body: `{ "invitedUserId": "..." }`. Solo el owner puede invitar (`400` si
no lo eres — el mensaje de error lo explica), y solo a alguien que ya sea
tu amigo (no cualquier usuario) y que no esté ya en un clan. `400` también
si ya le habías invitado a este mismo clan.

## `GET /api/mobile/users/{handle}` — Ficha de perfil de cualquiera

```json
{
  "userId": "u1", "name": "Ana", "handle": "ana", "image": "https://...",
  "level": 12, "platinos": 10, "trofeos": 1200, "amistad": "ninguna",
  "accounts": [ { "platform": "psn", "username": "ana_psn" } ],
  "recentGames": [ { "id": "abc123", "title": "Elden Ring", "coverUrl": "https://...", "percent": 74 } ]
}
```
Para el bottom sheet de perfil al tocar a alguien en Comunidad/Amigos (no
hace falta que sea amigo tuyo). `amistad`: `ninguna`, `solicitudEnviada`,
`solicitudRecibida`, `amigos` o `yo` — para el botón de amistad (enviar con
`POST /api/mobile/friends`, aceptar con `POST /api/mobile/friends/{userId}`).
`recentGames`: los 6 jugados más recientemente, sin deseados. `image` es la misma foto real que en toda
la web (`resolveAvatarUrl`), `null` si no tiene ninguna. `404` si no existe
ese handle.

Desde el 9 oct 2026 es el **perfil completo** de la app (pantalla
`ui/perfil/PerfilUsuarioScreen`), y trae además:

```json
{
  "juegos": 120, "oros": 80, "platas": 200, "bronces": 900, "completadoMedio": 46, "horas": 1500,
  "racha": { "actual": 3, "mejor": 21, "diasActivos": 340 },
  "esteAnio": 410, "mejorMes": { "mes": "2026-03", "total": 120 },
  "porMes": [ { "mes": "2025-11", "total": 30, "platinos": 1 } ],
  "clan": { "tag": "PRG", "name": "Paragon", "logoUrl": null },
  "ultimosTrofeos": [ { "gameId": "g", "juego": "Elden Ring", "trophyId": "12", "nombre": "...", "detalle": "...", "grade": "gold", "iconUrl": "https://...", "earnedAt": "2026-10-08T20:01:00.000Z", "rarityPercent": 4.2 } ]
}
```
`porMes`: los últimos 12 meses (los vacíos a cero, como `trofeosPorMes`).
`clan`: `null` si no está en ninguno.

## `GET /api/mobile/users/{handle}/month?mes=YYYY-MM` — Su mes contra el tuyo

```json
{
  "mes": "2026-10",
  "ellos": { "total": 40, "porDia": [ { "dia": "2026-10-01", "total": 3 } ], "porJuego": [ ... ], "trofeos": [ ... ] },
  "yo":    { "total": 25, "porDia": [ ... ], "porJuego": [ ... ], "trofeos": [ ... ] }
}
```
Mismos campos que `stats/month` para cada lado (todos los días del mes,
también los de cero). `yo` es `null` si el handle eres tú. `404` si no
existe.

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

## `GET /api/mobile/achievements` — Palmarés y Badges

```json
{
  "badges": [ { "id": "first_blood", "name": "Primera Sangre", "description": "Conseguiste tu primer platino", "earnedAt": "2026-01-01T00:00:00.000Z" } ],
  "trophyCase": [ { "kind": "liga_mensual", "rank": 1, "titulo": "Liga Mensual · septiembre de 2026", "earnedAt": "2026-09-01T00:00:00.000Z" } ]
}
```
`badges` — insignias por hitos (`checkAndGrantBadges` en lib/profiles.ts,
se conceden solas al sincronizar): `first_blood`/`cazador`/`experto`/
`leyenda` (platinos), `coleccionista` (100+ juegos), `critico` (3+
reseñas), `sociable` (3+ amigos), `rolero` (5+ RPGs), `multiplataforma`
(PSN+Steam+Xbox sincronizando), `madrugador` (usuario pionero). `name`/
`description` ya vienen resueltos en español (no una clave de traducción
— la app Android todavía no tiene i18n, igual que el resto de este
contrato). Lista de definiciones: `BADGE_DEFINITIONS` en
components/Badges.tsx.

`trophyCase` — palmarés real: SOLO el ganador absoluto (no Top 3) de la
Liga Mensual o de una Liga privada cerrada, nunca "casi cualquiera acaba
con una copa" (ver lib/trophyCase.ts). `kind`: `"liga_mensual"` |
`"liga_privada"`. Vacío en ambos campos si el usuario no ha ganado nada
todavía — no es un error, es el estado normal de la mayoría de cuentas.

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
    { "platform": "psn", "linked": true, "username": "mario_psn", "level": 245,
      "avatarUrl": "https://…", "isPublic": true, "syncedAt": "2026-10-05T19:40:00.000Z" },
    { "platform": "steam", "linked": false, "username": null, "level": null },
    { "platform": "xbox", "linked": false, "username": null, "level": null },
    { "platform": "epic", "linked": false, "username": null, "level": null, "declared": true, "appLinkable": false }
  ]
}
```
`configured` es si el servidor tiene ese proveedor OAuth dado de alta
(`AUTH_GOOGLE_ID`/`AUTH_DISCORD_ID`) — no ofrecer el botón si es `false`,
revienta al pulsarlo. Para **vincular** Google/Discord no hay un POST
aquí: se reabre `/movil/entrar/{provider}` (el mismo route del login) con
sesión activa — la Custom Tab comparte cookies con Chrome, así que
`signIn()` detecta la sesión y VINCULA en vez de crear una cuenta nueva.

Todas las plataformas traen `declared` y `appLinkable`. **Epic**:
`declared: true` (su progreso se ve pero no puntúa en nada, ver
`lib/declarado.ts`) y `appLinkable: false` (Epic bloquea al servidor; se
vincula y sincroniza con la extensión del navegador, no desde la app). Los
juegos de Epic llegan en la biblioteca con `platform: "epic"`.

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

## `POST /api/mobile/accounts/{platform}/sync` — Sincronizar una plataforma

Como el botón "Sincronizar" de cada fila de `/ajustes/plataformas`.
`{ "nuevos": 3 }` (trofeos que han entrado). `429` si se sincronizó hace
menos de 2 minutos o por el límite `resync`; `404` si no está vinculada;
`400` para Epic (va con la extensión). Las cuentas vinculadas traen además
`avatarUrl`, `isPublic` (`false` = perfil privado) y `syncedAt` (ISO o `null`).

## `POST /api/mobile/profile/handle` — Elegir nombre de usuario (alta nueva)

Body: `{ "handle": "mario_gg" }`. `{ "ok": true, "handle": "mario_gg" }` o
`400` (formato: 3-20 caracteres, minúsculas/números/guion bajo) / `409`
(ya cogido). Paso 1 del alta — equivalente móvil de `HandleForm` en
`src/app/bienvenida/page.tsx`. Sin esto, un login nuevo se queda en bucle
contra el `409` de `GET /api/mobile/panel` sin ningún sitio desde el que
arreglarlo.

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

Body opcional: `{ "fcmToken": "..." }` — el token de FCM de este teléfono,
que se desasocia de la cuenta (si es suyo) para que deje de recibir sus
avisos. `{ "ok": true }` siempre — ver `mintMobileSession`/
`revokeMobileSession` en `lib/mobileAuth.ts`.

## `GET /api/mobile/stats` — Estadísticas

```json
{
  "paragonScore": { "total": 12450, "porPlataforma": [ { "platform": "psn", "puntos": 8000, "trofeos": 1200 } ] },
  "trophyDna": { "ejes": [ { "key": "rpg", "label": "RPG", "valor": 100, "trofeos": 800 } ], "arquetipo": "El Completista" },
  "estiloDeCaza": { "nombre": "El Maratonista", "descripcion": "Pocos juegos, pero te los agotas de verdad..." },
  "rachas": { "actual": 4, "mejor": 12, "diasActivos": 88 },
  "historico": { "conFecha": 4200, "esteAnio": 900, "mejorMes": { "mes": "2026-03", "total": 210 } },
  "financiero": { "totalGastado": 1200, "totalHoras": 800, "costeHoraMedio": 1.5, "juegosConDatos": 40 },
  "eficiencia": { "ritmoMedioPct": -12, "juegosConDatos": 20 },
  "backlog": { "juegosContados": 15, "horasHistoriaRestantes": 120, "horasPlatinoRestantes": 300 },
  "horasTotales": 14280
}
```
`estiloDeCaza` es distinto de `trophyDna.arquetipo` (ese es de GÉNERO, qué
juegas) — mide CÓMO cazas trofeos (terminas lo que empiezas, abarcas mucho,
te quedas en pocos sitios...), ver `calcularEstiloDeCaza` en
`lib/trophyDna.ts`. `null` con menos de 3 juegos con progreso real, o si no
encaja claramente en ninguna categoría — no se fuerza una etiqueta sin base.

Versión CURADA para el móvil, no las ~15 piezas de
`EstadisticasCompletas.tsx` (heatmaps de calendario/horas, salón de la
vergüenza, comparador con amigos, gráficas de barras...) — esas son mejor
en pantalla grande o ya están cubiertas en otro sitio (recientes/a un paso
del platino en `/api/mobile/panel/highlights`, amigos en
`/api/mobile/social`). `eficiencia.ritmoMedioPct` negativo significa más
lento que la estimación de HowLongToBeat, positivo más rápido.

## `GET /api/mobile/wrap` — Paragon Wrap

```json
{
  "playerName": "FENDE21",
  "esteAnio": 322,
  "juegosEsteAnio": 20,
  "topGenre": { "name": "Adventure", "count": 170 },
  "topGame": { "id": "psn-...", "title": "Fortnite", "iconUrl": "https://...", "horasTotal": 2108.5, "earnedTrophies": 0 },
  "mejorMes": { "mes": "2021-04", "total": 129 },
  "rachas": { "actual": 5, "mejor": 17, "diasActivos": 1541, "hoyCuenta": true },
  "percentil": { "percentil": 8, "totalUsuarios": 120, "miTotal": 96 }
}
```
Mismo dato que las 3 tarjetas del perfil (`ParagonWrap.tsx`) MÁS lo que
solo tenía sitio en la versión ampliada "Stories" de la web
(`WrapStories.tsx`): `mejorMes`, `rachas` y `percentil`. Nada de esto es un
cálculo nuevo (`lib/history.ts`, `lib/wrapPercentile.ts`,
`generoTop`/`juegoDestacado` en `ParagonWrap.tsx`), solo un único endpoint
que junta todo para no hacer 4-5 llamadas sueltas.

`topGame` es `null` si la biblioteca está vacía o solo tiene deseados.
`horasTotal` es 0 si el juego más exprimido se decidió por trofeos, no por
horas (ninguna plataforma vinculada da tiempo jugado). `mejorMes` es
`null` sin ningún trofeo con fecha conocida. `percentil` es `null` con
menos de 20 usuarios reales con algún trofeo este año — con pocos
usuarios, "estás en el top X%" miente por parecer más grande de lo que
es, así que directamente no se manda (ver `MIN_USUARIOS_PERCENTIL` en
`lib/wrapPercentile.ts`), no un dato inventado.

`esteAnio: 0` es el estado "sin historia que contar todavía" — la app
debería enseñar un único mensaje honesto en vez de simular 7 diapositivas
vacías (mismo criterio que `WrapStories.tsx` en la web).

## `GET /api/mobile/diet` — Dieta Gamer

```json
{ "dieta": { "genero": "RPG", "juegos": [ { "gameId": "abc123", "titulo": "Elden Ring" } ], "horasTotales": 180 } }
```
`dieta` es `null` la mayoría de las veces — no es un error, es el estado
normal. Aviso amistoso (nunca un bloqueo) si tus últimos 3 juegos
TERMINADOS (mismo criterio que `esPlatinoEquivalente`) comparten género Y
suman más de 150h estimadas (HowLongToBeat) — ver `dietaGamer()` en
`lib/dietaGamer.ts` para los umbrales exactos. `juegos` son siempre esos 3,
en orden del más reciente al más antiguo.

## `POST /api/mobile/games/{gameId}/notes` — Nota privada (Modo Enfoque)

Body: `{ "notes": "..." }` (vacía para borrarla). `{ "ok": true }`. Mismo
campo que usa `/nota` del bot de Discord.

## `POST /api/mobile/games/{gameId}/resync` — "¿Ya lo tengo?" (Modo Enfoque)

```json
{ "nuevos": 2, "platinoNuevo": { "nombre": "Maestro de las artes marciales", "iconUrl": "https://..." } }
```
o `{ "nuevos": 0, "error": "..." }` — vuelve a pedir los trofeos de ESTE
juego a su plataforma sin esperar al cron. Siempre `200`, nunca 4xx/5xx
para el caso de error de plataforma: el cliente distingue por el campo
`error`, igual que la web.

`platinoNuevo` viene `null` (u omitido) salvo que ESTA llamada haya
descubierto un platino de verdad nuevo — no en la primera sincronización
de un juego (ver `primeraSincronizacion` en `lib/sync.ts`), y nunca por
trofeos que no sean platino. Pensado para una celebración en el momento,
no solo un contador — ver `syncGameTrophies`/`refrescarJuego`.

## `GET /api/mobile/games/{gameId}/trophies/{trophyId}/guide` — Guía en vídeo

```json
{ "videoId": "dQw4w9WgXcQ" }
```
`videoId` es `null` si no se encontró ninguno. MISMO dato cacheado que usa
la web (`TrophyGuideModal.tsx`, columna `game_trophy.guideVideoId` — ver
`buscarVideoGuiaTrofeo` en `lib/videoGuides.ts`): la primera persona que
pide la guía de un trofeo (de cualquier plataforma, web o móvil) dispara la
búsqueda real en YouTube y se guarda; todo el mundo después lee lo ya
guardado. A diferencia de la web (que incrusta el vídeo en un `<iframe>`),
el móvil no reproduce nada dentro de la app — abre directamente la app de
YouTube (o el navegador si no está instalada) en
`https://www.youtube.com/watch?v={videoId}`. `404` si el trofeo no existe.

## `GET /api/mobile/games/{gameId}/trophies/{trophyId}/guides` — Guías escritas

```json
{
  "guides": [ { "id": "g1", "body": "...", "language": "es", "createdAt": "...", "updatedAt": "...", "authorId": "u1", "authorHandle": "mario", "authorName": "Mario", "authorImage": "https://..." } ],
  "currentUserId": "u1"
}
```
Apuntes reales de gente de aquí (no un enlace externo, eso es `.../guide`
de arriba) — una fila por (usuario, juego, trofeo): publicar de nuevo
actualiza la tuya, nunca duplica. `currentUserId` es quien pregunta, para
que el cliente sepa cuál de las filas es "la mía" sin comparar handles.

### `POST /api/mobile/games/{gameId}/trophies/{trophyId}/guides` — Publicar (o actualizar la tuya)

Body: `{ "body": "..." }`. `400` si viene vacía o pasa de 4000 caracteres
(el mensaje de error lo dice). El idioma se guarda del propio perfil del
usuario (`users.language`), no hace falta mandarlo.

### `DELETE /api/mobile/games/{gameId}/trophies/{trophyId}/guides` — Borrar la tuya

Sin body. Solo borra la guía DEL QUE LLAMA para ese trofeo — no se puede
borrar la de otra persona.

## `GET /api/mobile/compare/{handle}` — Comparar con alguien

```json
{
  "resultado": "gano",
  "me": { "name": "Mario", "avatarUrl": "https://...", "level": 17, "platinos": 24, "trofeos": 4655, "juegos": 290 },
  "them": { "name": "Ana", "avatarUrl": null, "level": 12, "platinos": 10, "trofeos": 1200, "juegos": 80 },
  "sharedGames": [ { "id": "abc123", "title": "Elden Ring", "iconUrl": "https://...", "myPercent": 74, "theirPercent": 40, "myHours": 32, "theirHours": 10 } ]
}
```
`handle` no tiene que ser tu amigo — igual que en la web, cualquier perfil
público se puede comparar. `404` si no existe ese handle, `409` si esa
persona no tiene ninguna cuenta vinculada (nada que comparar). Versión
CURADA: sin la carrera trofeo a trofeo ("quién lo sacó antes",
`sharedTrophyLeads` en la web) — la pieza más pesada y la que menos aporta
en una pantalla pequeña. `myHours`/`theirHours` pueden ser `null` si la
plataforma no da tiempo jugado (Xbox, o Steam sin ese dato). `resultado`
es `"gano"`/`"pierdo"`/`"empate"`, por platinos — mismo criterio que la
etiqueta "Vas ganando" de la web (`comparar/[handle]/page.tsx`).
`avatarUrl` puede ser `null` si esa persona no tiene foto.

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

## `GET|POST /api/mobile/appearance` — Apariencia de la cuenta (la misma que la web)

Acento, color libre, paleta "desde tu juego", estilo y tamaño de texto de
Ajustes → Apariencia (`lib/aparienciaCuenta.ts`, compartido con la acción de
la web). El **modo** (oscuro/claro/OLED/contraste) NO viaja: es de cada
dispositivo.

```json
{
  "guardada": true,
  "acento": "accent-fosforo", "acentoLibre": "",
  "acentoJuego": { "id": "steam-1145360", "color": "#c0392b",
    "paleta": { "rgb": "212 90 70", "rgbClaro": "170 50 35", "c2": "#f3c4bb",
                "bg": "#150d0c", "surface": "#1c1210", "surface2": "#281a17", "border": "#3a2723" } },
  "estilo": "estilo-terminal", "tamanoTexto": "grande",
  "nivel": 42, "requisitosEstilo": { "estilo-ps5": 10, "estilo-xbox": 10, "estilo-steam": 20, "estilo-switch": 20 }
}
```
`guardada: false` = la cuenta nunca eligió nada: la app sube la suya del
teléfono. El POST recibe `{ acento, acentoLibre, acentoJuego?: {id,color}, estilo,
tamanoTexto }`, lo normaliza (nada de clases o colores inventados; un estilo
por encima del `nivel` se quita) y devuelve lo guardado de verdad. Claves
iguales que la web (`accent-*`, `estilo-*`); catálogo y colores en
`ui/theme/Apariencia.kt`, que hay que mantener a la par de `globals.css`.

## Errores en el idioma del teléfono

Todos los `{ "error": "..." }` de `/api/mobile` salen en el idioma del
`Accept-Language` (es/en/de/fr) vía `lib/mensajesApi.ts`; lo que no esté en
su lista sale en español. Al añadir un error nuevo a la API móvil, añadirlo
ahí también.

## `POST /api/mobile/steam/completar` — Logros de Steam que faltan

Al vincular Steam solo se traen los logros de los 40 juegos más recientes;
esto trae el resto **por lotes** (~24 juegos por llamada). Sin body.
`{ "hechos": 24, "restantes": 131 }`. Llamarlo en bucle hasta
`restantes == 0`, y parar también si `hechos == 0` (juegos que Steam no deja
leer). La app lo hace al abrir Cuentas vinculadas y en su sincronización de
fondo. Mismo trabajo en la web: `POST /api/steam/completar` (banner
`CompletarSteam`).

`GET /api/mobile/milestone` devuelve además `proximo: { numero, faltan }`
SIEMPRE (el próximo hito redondo y los platinos que faltan, el hito
incluido), haya o no un juego reservado: la ficha dice "Reservar para el #25
· faltan 11".

## Añadido el 5 oct 2026

### Ligas privadas: fin de verdad
- `GET /api/mobile/leagues` → cada liga trae `terminada: boolean` (ya pasó `endsAt`).
- `GET /api/mobile/leagues/{id}` → `terminada: boolean` y `ganadores: string[]` (userIds
  empatados en lo más alto; vacío si nadie sumó o si aún no ha terminado).
- En una liga terminada, `challenge`, `members` (invitar) y `accept` responden
  `409 { "error": "Esta liga ya ha terminado." }`.
- El cron (`cerrarLigasPrivadasVencidas`, lib/trophyCase.ts) la cierra una vez
  (`awarded`), da el premio del palmarés y avisa a cada miembro de su puesto.

### Guerra de clanes
- `GET /api/mobile/clans/{tag}` → además: `guerra: { abierta, historial }` (cada una:
  `id, estado ("pendiente"|"activa"|"terminada"), soyRetador, rival {id,name,tag},
  empiezaAt, terminaAt, diasRestantes, misPuntos, susPuntos, gane`) y `retables`
  (clanes a los que puede retar el líder si no hay guerra abierta).
- `POST /api/mobile/clans/{tag}/war` `{ "rivalId": "..." }` → retar (solo el líder).
- `POST /api/mobile/clans/wars/{id}` `{ "aceptar": true|false }` → responder (solo
  el líder del clan retado). Errores `409` con el mensaje de lib/clanWars.ts.

### Sesiones de trofeos online

Lo mismo que /sesiones en la web (src/lib/sesiones.ts). **Plazas: siempre el
total contando a quien organiza** (4 = el anfitrión + 3 libres).

- `GET /api/mobile/sessions` → `{ sesiones: Sesion[], juegos: [{ id, titulo, platform, deviceLabel, progreso }] }`.
  Próximas (y las empezadas hace < 2 h), primero las de juegos que tienes;
  `juegos` = tu biblioteca sin completar, para organizar.
- `GET /api/mobile/sessions/{id}` → `Sesion` (también cancelada o pasada). 404 "Sesión no encontrada".
- `POST /api/mobile/sessions` `{ gameId, trophyId | null, trofeo, descripcion, fechaHora (ISO), plazasTotales (2-16) }` → `{ id }`.
  `trophyId` elegido de la lista de abajo (se guarda su nombre original); null = escrito a mano en `trofeo`.
- `POST /api/mobile/sessions/{id}` `{ accion: "unirse" | "salir" }` → `Sesion` ya actualizada. 409 con el motivo.
- `DELETE /api/mobile/sessions/{id}` → cancelar (solo el anfitrión; avisa a los apuntados).
- `GET /api/mobile/sessions/trophies?gameId=` → `{ trofeos: [{ trophyId, name, grade, iconUrl, grupo }] }`: los que te faltan, en tu idioma; `grupo` null = juego base.

`Sesion`: `{ id, trofeo, trofeoInfo: { iconUrl, grade, detail } | null, descripcion, fechaHora, plazasTotales, ocupadas, libres, cancelada, juego: { id, titulo, iconUrl, platform, deviceLabel, igdbId }, anfitrion, participantes: [{ userId, handle, name, image }], soyAnfitrion, estoyApuntado, loTengo, yaLoTengo }`. `yaLoTengo`: quien mira ya tiene el trofeo (se une para ayudar); cada participante lleva `ayuda` con lo mismo. Crear una sesión de un trofeo que ya tienes da 400 "Ya tienes ese trofeo: elige uno que te falte."

### Diario del platino y desglose del mes

- `GET /api/mobile/games/{gameId}` trae también `diario`: `{ primeraFecha, primerTrofeo, muroDias, muroTrofeo, masRaro: { nombre, rarityPercent } | null, fechaPlatino, diasTotales } | null` (src/lib/diarioPlatino.ts; null sin platino o sin fechas). Como en la web: el muro solo se cuenta con 3 días o más, y la hazaña si su rareza es menor del 20 %.
- `GET /api/mobile/stats/month?mes=YYYY-MM` (por defecto el actual) → `{ mes, total, porDia: [{ dia, total }], porJuego: [{ gameId, juego, iconUrl, total }], trofeos: [{ gameId, juego, trophyId, nombre, detalle, grade, iconUrl, earnedAt, rarityPercent }] }`.

### Amigos (añadir, aceptar, rechazar)

- `GET /api/mobile/friends` → `{ pendientes: [{ userId, handle, name, image }] }`: solicitudes que te han enviado.
- `POST /api/mobile/friends` `{ handle }` (con o sin @) → `{ ok, amigos }` (`amigos`: esa persona ya te la había enviado y quedáis como amigos). 409 con el motivo ("No existe nadie con ese usuario.", "Ya sois amigos."...).
- `POST /api/mobile/friends/{userId}` → aceptar su solicitud. `DELETE` → rechazarla o dejar de ser amigos.

## Añadido el 8 oct 2026 — precios y "Platinos de oferta"

### `GET /api/mobile/games/{gameId}/precios` — Precio en PC de un juego

```json
{ "precios": {
  "steamAppId": "1245620",
  "precio": { "final": 35.99, "inicial": 59.99, "descuento": 40 },
  "ofertas": [{ "tienda": "GreenManGaming", "precio": 31.49, "precioOriginal": 59.99, "ahorro": 48, "url": "https://...", "viaCheapShark": true }],
  "minimoHistoricoUsd": 23.99,
  "alerta": 30
} }
```
`precios: null` si el juego no tiene versión de PC: el AppID de Steam es el
suyo si es de Steam y, si no (PSN, Xbox, a mano), el que enlaza IGDB
(`lib/preciosJuego.ts`). `precio` es Steam España en **euros** (null si no
está a la venta); `ofertas` y `minimoHistoricoUsd` vienen de CheapShark, en
**dólares**. `alerta`: tu precio objetivo, o null.

### `GET|POST|DELETE /api/mobile/price-alerts` — Alertas de precio

- `GET` → `{ alertas: [{ steamAppId, gameId, titulo, precioObjetivo, precio: PrecioSteam|null, avisadoAt }] }`, la más nueva primero, con el precio de ahora en Steam España.
- `POST { steamAppId, gameId, titulo, precioObjetivo }` → `{ ok: true }`. Crea o cambia la alerta (mismas reglas que la web: 0,01 a 999 €). 400 con el motivo si no vale.
- `DELETE ?steamAppId=` → `{ ok: true }`.

Las comprueba el cron (`lib/priceAlerts.ts`) y el aviso sale por `avisarUsuario`: push FCM en Android; en iOS, sin push, en la app.

### `GET /api/mobile/platinos-oferta` — Platinos de oferta

```json
{ "ofertas": [{
  "steamAppId": "304430", "titulo": "INSIDE",
  "caratula": "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/304430/header.jpg",
  "precio": { "final": 2.29, "inicial": 22.99, "descuento": 90 }, "precioUsd": 1.99, "ahorro": 90,
  "logros": 14, "logroMasRaro": 14, "dificultad": { "nivel": 4, "etiqueta": "Media", "color": "#8fa347" },
  "horas": null, "gameId": null, "url": "https://store.steampowered.com/app/304430/"
}] }
```
Juegos de Steam rebajados (CheapShark) con un 100 % asequible: `dificultad`
sale del logro más raro según los porcentajes globales de Steam
(`lib/platinosOferta.ts`, nivel 1-10, hasta 6). Sin los que ya tienes en
Steam. `horas` (HowLongToBeat) y `gameId` solo si el juego ya está en
Paragon; sin `gameId`, la app abre `url`. La primera petición tarda unos
segundos (consulta Steam juego a juego); luego va en caché.
