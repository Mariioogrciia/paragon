# App nativa (Compose) — reparto de trabajo Gemini / Claude

Documento de coordinación entre dos agentes que no se hablan directamente
(Gemini vive dentro de Android Studio, Claude en esta terminal) — el usuario
hace de puente pegando mensajes de uno a otro. Antes de tocar algo, mirar
aquí qué está marcado como "en curso" por el otro para no pisarlo. Al
terminar una tarea, marcarla y anotar quién la cerró y cuándo.

**Esta es la copia dentro de `android/`, para Gemini** — solo tiene acceso a
esta carpeta, no al resto del repo. **Fuente real: `PLAN-NATIVA.md` en la
raíz** (backend/Claude) — si algo cambia ahí, Claude actualiza esta copia en
el mismo commit; si Gemini marca algo hecho aquí, decírselo a Claude para
que lo refleje en la raíz.

Reglas de base (ya acordadas, no reabrir sin decirlo el usuario):
- **Gemini** toca los `.kt` de UI/navegación en Android Studio (donde tiene
  preview visual real) — solo ve `android/`.
- **Claude** toca el backend Next.js (`src/`, fuera de lo que Gemini puede
  ver) y el enganche de datos reales (repositorio + Retrofit + estados de
  carga/error) en las pantallas — solo entra en la UI en sí cuando el
  usuario lo pide explícitamente, nunca en un archivo que Gemini tenga
  abierto en ese momento.
- Contrato de API exacto (forma del JSON de cada endpoint): ver
  [`API-CONTRACT.md`](API-CONTRACT.md), en esta misma carpeta.

---

## Estado actual (16 de septiembre de 2026)

**Con datos reales, de punta a punta (login → Retrofit → pantalla), las 5
pantallas completas:**
- Login real (Google/Discord) vía Custom Tabs + deep link `paragon://auth`.
- **Panel**: perfil + stats reales (`/api/mobile/panel`) y "a un paso del
  platino"/"recientes" también reales, MISMO cálculo que la portada web
  (`/api/mobile/panel/highlights`, endpoint dedicado — decisión explícita
  del usuario, en vez de aproximarlo en el cliente). Solo el desglose de
  trofeos por metal sigue mock (no hay endpoint para eso todavía).
- **Biblioteca**: lista real, selector de estado filtrando de verdad,
  navegación real a la ficha de cada juego (`/api/mobile/library`).
- **Comunidad/Feed**: actividad real propia + amigos, mensaje correcto por
  tipo de evento y tiempo relativo ("hace 2h") (`/api/mobile/feed`).
- **Ligas y Amigos**: las dos pestañas con datos reales y separados
  (`/api/mobile/social`).
- **Ficha de juego**: trofeos reales agrupados por rareza
  (`/api/mobile/games/{gameId}`).

Todo compilado y verificado con `./gradlew compileDebugKotlin` tras cada
cambio, no solo escrito y dado por bueno. Auditoría de seguridad de la
autenticación por Bearer token hecha el 16/09 (ver abajo) — sin problemas
graves, un par de mejoras anotadas para más adelante.

**Todavía mock:**
- Desglose de trofeos por metal en el Panel (`PanelRepository.getMockTrophyCounts()`)
  — sin endpoint todavía, no bloquea nada más.

**Interacciones de UI, todas reales (16/09, Gemini):**
- Cerrar sesión (`tokenStore.clear()` + `activity.recreate()`).
- Buscador del `topBar` reactivo, filtra Biblioteca de verdad.
- Ordenar en Biblioteca (Progreso/A-Z/Z-A) aplicado de verdad sobre la
  lista real. Revisado y compilado por Claude — sin exagerar esta vez.

**Login sin pasar por ninguna página web (16/09, Claude)**: la Custom Tab
del login abría antes `/movil/enlazar`, que sin sesión mostraba `/entrar`
— la página web de login, con su propio diseño — durante un instante.
Ahora `AppRoot.LoginGate` tiene un botón por proveedor
("Continuar con Google"/"Continuar con Discord"), cada uno abre
`/movil/entrar/{provider}` directo, que llama a `signIn()` sin pasar por
NINGÚN HTML de Paragon — la Custom Tab va derecha a la pantalla real de
Google/Discord. `/movil/enlazar` sigue existiendo solo como paso final
(ya CON sesión) y red de seguridad.

**Alcance confirmado por el usuario (16/09) — la app nativa SÍ debe cubrir,
además de las 5 pantallas ya reales:**
- **Ajustes del perfil** (nombre, foto, lo básico de `/ajustes`).
- **Vincular/desvincular cuentas** (Google, Discord, PSN, Steam, Xbox) —
  backend YA listo y con el bug real de duplicados arreglado (ver tarea de
  Claude de hoy: `PlatformAccountAlreadyLinkedError`).
- Explícitamente FUERA por ahora (ver conversación con el usuario del
  16/09): Estadísticas completas, Descubrir, Planificador, Wrap — contenido
  denso/esporádico, mejor como enlace "Abrir en el navegador" (Custom Tab)
  que como pantalla nativa reescrita.

---

## Tareas de Gemini (UI en Compose, Android Studio)

- [x] **Ordenar en Biblioteca** (Progreso/A-Z/Z-A) — real, sobre la lista
      que ya llega de `LibraryRepository`. Compilado y revisado por Claude.
- [x] **Cerrar sesión** detrás del icono de cuenta del `topBar` — real
      (`TokenStore.clear()` + `activity.recreate()`).
- [x] **Buscador** en el `topBar` — real, `TextField` reactivo que filtra
      Biblioteca por título de verdad.
- [ ] **Pantallas de Ajustes del perfil y Vincular cuentas** (Google,
      Discord, PSN, Steam, Xbox) — confirmado por el usuario el 16/09 que
      se quedan en el alcance de la app nativa. Backend YA LISTO (ver tarea
      de Claude de hoy): `GET /api/mobile/accounts` (qué está vinculado),
      `POST`/`DELETE /api/mobile/accounts/{platform}` (psn/steam/xbox),
      `POST /api/mobile/profile` (nombre/foto). Para vincular Google/
      Discord no hace falta llamar a la API: reabrir
      `/movil/entrar/{provider}` (mismo route del login) con sesión activa
      ya vincula solo, ver API-CONTRACT.md.

## Tareas de Claude (backend + enganche de datos reales)

- [ ] Endpoint del desglose de trofeos por metal del Panel (bronce/plata/
      oro/platino) — el único dato del Panel que sigue mock. Sin prisa,
      nada más depende de esto.
- [x] Endpoints de Ajustes del perfil y Vincular/desvincular cuentas
      (16/09): `GET /api/mobile/accounts`, `POST`/`DELETE
      /api/mobile/accounts/{platform}`, `POST /api/mobile/profile` —
      reutilizando `linkAccount`/`unlinkAccount`/`setProfileInfo` ya
      existentes. `tsc`/`eslint` limpios. Sin construir la pantalla en
      Android todavía (tarea de Gemini, ver arriba) ni probados con datos
      reales de un dispositivo (solo tipado y reutilización de funciones ya
      probadas por la web).
- [x] Login directo al proveedor sin página web de por medio (16/09):
      `/movil/entrar/{provider}` (`signIn()` server-side, mismo patrón que
      `entrar/page.tsx`) + dos botones nativos en `AppRoot.LoginGate`
      ("Continuar con Google"/"Continuar con Discord"). Verificado con
      `./gradlew compileDebugKotlin`; el flujo OAuth real (con credenciales
      reales de Google/Discord) no se ha probado de punta a punta en esta
      sesión.
- [x] Arreglado un bug real (16/09): vincular una cuenta de PSN/Steam/Xbox
      ya vinculada a OTRO usuario de Paragon daba el mensaje falso "No se
      ha podido contactar con la plataforma" — la base de datos ya lo
      impedía (índice único `platform_account_identity_idx`), pero el
      error no se explicaba. Ahora `PlatformAccountAlreadyLinkedError`
      (`src/lib/profiles.ts`) da el mensaje real. Google/Discord ya
      estaban bien (clave primaria de `accounts` en Auth.js). `tsc`/
      `eslint` limpios; sin probar contra un duplicado real en la base
      (verificado leyendo el esquema y la forma del error de Postgres, no
      con una inserción de prueba).
- [ ] Revisar con el usuario si se quiere un "cerrar sesión en este
      dispositivo" de verdad (borrar solo el `sessionToken` del móvil) en
      vez de depender de cerrar sesión también en la web — detalle real
      encontrado en la auditoría de seguridad del 16/09 (ver abajo).
- [x] Los 6 endpoints (`panel`, `panel/highlights`, `library`, `feed`,
      `social`, `games/{gameId}`) + `mobileAuth.ts` + `/movil/enlazar`.
- [x] Enganche `AppRoot` → `MainScreen`, `GameDetailScreen.kt` + ruta
      `game/{gameId}` en el NavHost.
- [x] Las 5 pantallas con datos reales, repositorio propio cada una,
      compartiendo un único Retrofit (`ApiClient`). Compilado y verificado
      con `./gradlew compileDebugKotlin` en cada paso.
- [x] Auditoría de seguridad de `mobileAuth.ts`/`/movil/enlazar`/los 6
      endpoints (16/09): sin IDOR, sin fugas de información en errores,
      CORS no aplica (no hay cookie de por medio). Dos cosas anotadas para
      más adelante, sin urgencia con ~6 usuarios reales: (1) el token viaja
      en la URL del deep link — podría acabar en logcat de algunos OEMs,
      mitigable con un código de un solo uso en vez del token directo; (2)
      no hay forma de cerrar sesión SOLO en el móvil sin cerrarla también
      en la web, porque ambos comparten la misma fila de `session`.

## Pendiente de decisión (ninguno de los dos debería tocarlo sin que el
usuario lo confirme antes)

- Publicación en Play Store: descartada a propósito por ahora (ver
  HANDOFF.md, política de "minimum functionality").
- Qué pasa con `MainActivity`/el WebView de Capacitor mientras conviva con
  la app nativa (el usuario ya dijo "convivir un tiempo" — revisar cuando
  Compose cubra todas las pantallas).
- Si vale la pena el "cerrar sesión solo en el móvil" de la auditoría de
  seguridad, o es aceptable el compromiso actual (ver tarea de Claude).
