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
  "profile": { "handle": "mario", "name": "Mario", "level": 14, "psnId": "mario_psn" },
  "stats": { "platinums": 87, "trophies": 4312, "games": 214, "completionRate": 68 }
}
```
`psnId` puede ser `null` (sin cuenta PSN vinculada).

## `GET /api/mobile/panel/highlights` — "A un paso del platino" y "Recientes"

```json
{
  "nearPlatinum": [ { "id": "abc123", "title": "Elden Ring", "coverUrl": "https://...", "earnedTrophies": 32, "totalTrophies": 42, "percent": 74 } ],
  "recent": [ { "id": "abc123", "title": "Elden Ring", "coverUrl": "https://...", "earnedTrophies": 32, "totalTrophies": 42, "percent": 74 } ]
}
```
MISMO cálculo que la portada web (`gameProgress()` en `src/lib/stats.ts`),
no una aproximación aparte — `nearPlatinum` son juegos con platino real
(`defined.platinum > 0`) sin conseguir, ordenados por trofeos pendientes
(máx. 3); `recent` son los últimos jugados, no deseados (máx. 6). Endpoint
separado de `/api/mobile/panel` a propósito: evita duplicar `gameProgress()`
en Kotlin y que las dos versiones diverjan con el tiempo.

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
  "comments": [ { "activityId": "act_1", "body": "GG", "userName": "Ana", "createdAt": "..." } ]
} ] }
```
`type`: `"review" | "rating" | "platinum" | "favorite" | "new_game"`.
Máximo 50 elementos, ya ordenados por fecha descendente.

## `GET /api/mobile/social` — Amigos y Liga

Dos conceptos DISTINTOS, no la misma lista en otro orden:

```json
{
  "amigos": [ {
    "userId": "u1", "name": "Mario", "handle": "mario", "avatarUrl": "https://...",
    "trophyLevel": 14, "platinos": 87, "trofeos": 4312, "juegos": 214, "completadoMedio": 68
  } ],
  "liga": [ {
    "userId": "u1", "handle": "mario", "name": "Mario", "image": "https://...", "points": 340
  } ]
}
```
- `amigos`: tú + tus amigos reales, con vuestras cifras de siempre.
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
