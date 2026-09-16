# API móvil — contrato para la app nativa (Android/Compose)

Copia dentro de `android/` para que Gemini (Android Studio) pueda leerla —
solo tiene acceso a esta carpeta, no al resto del repo. **Fuente real:**
`src/app/api/mobile/CONTRACT.md` (backend Next.js) — si algo cambia ahí,
Claude actualiza esta copia en el mismo commit.

## Autenticación

Un único login real: Google o Discord (no hay contraseña).

1. La app abre `/movil/entrar/google` (o `/discord`) en una Custom Tab
   (`androidx.browser`) — ese route llama a `signIn()` directo, SIN pasar
   por la página web `/entrar` de por medio. `AppRoot.LoginGate` ya tiene
   un botón por proveedor.
2. Tras el login, Google/Discord vuelve a `/movil/enlazar`, que redirige a
   `paragon://auth?token=<sessionToken>` — un intent-filter en
   `ComposeMainActivity` lo captura.
3. Guardar `token` (ver `TokenStore.kt`) y mandarlo en cada llamada como:
   `Authorization: Bearer <token>`
4. Si cualquier endpoint responde **401**, el token ha caducado o se cerró
   sesión — borrar el token guardado y volver a pedir login.

Todos los endpoints de abajo exigen ese header. Sin él, o con un token no
válido: `401 { "error": "No autenticado" }`.

## `GET /api/mobile/panel` — Dashboard

```json
{
  "profile": { "handle": "mario", "name": "Mario", "level": 14, "psnId": "mario_psn" },
  "stats": { "platinums": 87, "trophies": 4312, "games": 214, "completionRate": 68 }
}
```
`psnId` puede ser `null`. **Ya enganchado de verdad** en `PanelScreen`.

## `GET /api/mobile/panel/highlights` — "A un paso del platino" y "Recientes"

```json
{
  "nearPlatinum": [ { "id": "abc123", "title": "Elden Ring", "coverUrl": "https://...", "earnedTrophies": 32, "totalTrophies": 42, "percent": 74 } ],
  "recent": [ { "id": "abc123", "title": "Elden Ring", "coverUrl": "https://...", "earnedTrophies": 32, "totalTrophies": 42, "percent": 74 } ]
}
```
MISMO cálculo que la web — `nearPlatinum` son juegos con platino real sin
conseguir (máx. 3), `recent` son los últimos jugados, no deseados (máx. 6).
**Ya enganchado de verdad** en `PanelScreen`.

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
`platform`: `"psn" | "steam" | "xbox" | "manual"`. `defined`/`earned` son
`null` en Steam/Xbox. **Filtrado y orden son responsabilidad del
cliente** — se manda el array completo. **Ya enganchado de verdad** en
`LibraryScreen` (filtro de 4 estados simplificado, no los 7 de la web).

## `GET /api/mobile/feed` — Actividad (propia + amigos)

```json
{ "items": [ {
  "id": "act_1", "type": "platinum", "rating": null, "review": null,
  "createdAt": "2026-09-15T20:00:00.000Z",
  "user": { "id": "u1", "handle": "mario", "name": "Mario", "image": "https://..." },
  "game": { "id": "abc123", "title": "Elden Ring", "iconUrl": "https://...", "deviceLabel": "PS5" },
  "reactions": 3, "reacted": false
} ] }
```
`type`: `"review" | "rating" | "platinum" | "favorite" | "new_game"`. Máx.
50, ya ordenados por fecha descendente. **Ya enganchado de verdad**.

## `GET /api/mobile/social` — Amigos y Liga

Dos conceptos DISTINTOS, no la misma lista en otro orden:

```json
{
  "amigos": [ { "userId": "u1", "name": "Mario", "handle": "mario", "avatarUrl": "https://...", "trophyLevel": 14, "platinos": 87, "trofeos": 4312, "juegos": 214, "completadoMedio": 68 } ],
  "liga": [ { "userId": "u1", "handle": "mario", "name": "Mario", "image": "https://...", "points": 340 } ]
}
```
`amigos` no llega ordenado del backend (se ordena en el cliente por
platinos); `liga` sí, por puntos. **Ya enganchado de verdad**.

## `GET /api/mobile/games/{gameId}` — Ficha de juego

```json
{ "game": {
  "id": "abc123", "platform": "psn", "title": "Elden Ring", "...": "(mismos campos que en /library)",
  "trophiesSyncedAt": "2026-09-10T08:00:00.000Z", "notes": "Guía: empezar por...",
  "trophies": [ { "id": "t1", "name": "Elden Lord", "detail": "Consigue uno de los finales.", "grade": "platinum", "earned": true, "earnedAt": "2026-09-10T07:55:00.000Z", "rarityPercent": 4.2, "hidden": false, "iconUrl": "https://...", "isMissable": false, "xp": 300 } ]
}}
```
`grade` puede faltar en logros de Xbox/Steam sin metal. 404 si el juego no
es tuyo. **Ya enganchado de verdad** en `GameDetailScreen`.

## `POST /api/mobile/games/{gameId}/pin` — Anclar/desanclar para Modo Enfoque (NUEVO, sin enganchar)

```json
{ "pinned": true }
```
Sin body. Desancla SIEMPRE lo que hubiera antes primero.

## `POST /api/mobile/games/{gameId}/reserve` — Reservar/quitar para el próximo hito (NUEVO, sin enganchar)

```json
{ "reservado": true }
```
Sin body. "Cerrojo de Hitos": solo uno reservado a la vez.

## `GET /api/mobile/milestone` — Qué hay reservado ahora mismo (NUEVO, sin enganchar)

```json
{ "hito": { "gameId": "abc123", "titulo": "Elden Ring", "iconUrl": "https://...", "numero": 100 } }
```
`hito` es `null` si no hay nada reservado, o si ya se platinó solo.
`numero` (#25/#50/#100...) se recalcula siempre, nunca se guarda.

## `GET /api/mobile/collections` — Carpetas de juegos (NUEVO, sin enganchar)

```json
{ "collections": [ { "id": "col_1", "name": "Para el finde", "gameIds": ["abc123", "def456"] } ] }
```

## `POST /api/mobile/collections` — Crear carpeta (NUEVO, sin enganchar)

Body: `{ "name": "..." }` (máx. 40 caracteres). `{ "id": "col_1" }` o `400`.

## `PATCH /api/mobile/collections/{id}` — Renombrar carpeta (NUEVO, sin enganchar)

Body: `{ "name": "..." }`. `{ "ok": true }` o `400`.

## `DELETE /api/mobile/collections/{id}` — Borrar carpeta (NUEVO, sin enganchar)

`{ "ok": true }`. No borra los juegos, solo la carpeta.

## `POST /api/mobile/collections/{id}/games/{gameId}` — Meter/sacar un juego de la carpeta (NUEVO, sin enganchar)

```json
{ "dentro": true }
```
Sin body. `dentro: false` también si la carpeta no es tuya.

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
`configured` es si el servidor tiene ese proveedor OAuth dado de alta — no
ofrecer el botón si es `false`. Para **vincular** Google/Discord no hay un
POST: se reabre `/movil/entrar/{provider}` con sesión activa. **Ya
enganchado de verdad** en `LinkedAccountsScreen`.

## `POST /api/mobile/accounts/{platform}` — Vincular PSN/Steam/Xbox

`{platform}` es `psn`, `steam` o `xbox`. Body: `{ "input": "tu-online-id-o-gamertag" }`.

```json
{ "username": "mario_psn", "legible": true, "juegos": 214 }
```
`legible: false` si el perfil está en privado. Error `422` si la cuenta ya
está vinculada a OTRO usuario. **Ya enganchado de verdad**.

## `DELETE /api/mobile/accounts/{platform}` — Desvincular PSN/Steam/Xbox

`{ "ok": true }`. **Ya enganchado de verdad**.

## `POST /api/mobile/profile` — Ajustes del perfil

Body: `{ "name": "Mario", "image": "https://..." | null }`. `{ "ok": true }`
o `400` si `name` viene vacío. **Ya enganchado de verdad** en `SettingsScreen`.

## `POST /api/mobile/logout` — Cerrar sesión SOLO en este móvil

Sin body. `{ "ok": true }` siempre. **Ya enganchado de verdad**.
