# App nativa (Compose) — reparto de trabajo Gemini / Claude

Documento de coordinación entre dos agentes que no se hablan directamente
(Gemini vive dentro de Android Studio, Claude en esta terminal) — el usuario
hace de puente pegando mensajes de uno a otro. Antes de tocar algo, mirar
aquí qué está marcado como "en curso" por el otro para no pisarlo. Al
terminar una tarea, marcarla y anotar quién la cerró y cuándo.

**Copia real para Gemini en [`android/PLAN-NATIVA.md`](android/PLAN-NATIVA.md)**
— Gemini solo tiene acceso a la carpeta `android/`, no a este archivo ni al
resto del repo. Si algo cambia aquí, Claude actualiza esa copia en el mismo
commit; si Gemini marca algo hecho en su copia, decírselo a Claude para que
lo refleje aquí.

Reglas de base (ya acordadas, no reabrir sin decirlo el usuario):
- **Gemini** toca los `.kt` de UI/navegación en Android Studio (donde tiene
  preview visual real) — solo ve `android/`.
- **Claude** toca el backend Next.js (`src/`) y el enganche de datos reales
  (repositorio + Retrofit + estados de carga/error) en las pantallas — solo
  entra en la UI en sí cuando el usuario lo pide explícitamente, nunca en un
  archivo que Gemini tenga abierto en ese momento.
- Contrato de API exacto (forma del JSON de cada endpoint): ver
  [`src/app/api/mobile/CONTRACT.md`](src/app/api/mobile/CONTRACT.md) (o su
  copia [`android/API-CONTRACT.md`](android/API-CONTRACT.md)).
- **Importante**: el backend (`src/`) solo funciona en la app una vez
  comiteado Y PUESTO EN `origin/master` — la app apunta a
  `platinos-nine.vercel.app`, no a este disco. Un endpoint sin `git push`
  da 404 real en el móvil (pasó el 16/09 con el login). El código Android
  no necesita push para probarse, pero sí una `.apk` nueva compilada.

---

## Estado (16 de septiembre de 2026) — paridad básica con la web alcanzada

**Las 7 pantallas + login, todas con datos reales de punta a punta:**
Login (directo a Google/Discord, sin página web de por medio) → Panel →
Biblioteca (filtro+orden reales) → Comunidad/Feed → Ligas y Amigos →
Ficha de juego → Ajustes (editar nombre) → Cuentas Vinculadas (vincular/
desvincular PSN/Steam/Xbox, vincular Google/Discord reabriendo el login).

- Cierre de sesión **solo en este móvil**: la app ya no depende de la
  cookie del navegador — `mintMobileSession` (backend) le da un
  `sessionToken` propio en cuanto llega el primer login, y borra el
  prestado. Cerrar sesión en la app no afecta a la sesión web, y viceversa.
- Login con iconos de marca reales (Google 4 colores, Discord `#5865F2`),
  mismos SVG que la web, como vector drawable.
- Todo compilado y verificado con `./gradlew compileDebugKotlin` en cada
  paso — incluye un bug real encontrado y arreglado por Claude el 16/09:
  `LinkedAccountsScreen` se quedaba bloqueada en la pantalla de error para
  siempre tras un solo fallo, aunque una recarga posterior tuviera éxito
  (`errorMessage` nunca se limpiaba al reintentar).
- Auditoría de seguridad del backend móvil hecha el 16/09: sin problemas
  graves.

**Todavía mock:** el desglose de trofeos por metal en el Panel (bronce/
plata/oro/platino) — sin endpoint todavía, no bloquea nada.

**Alcance final acordado con el usuario (16/09), tras repasar TODAS las
rutas reales de `src/app/` una por una — no solo lo que ya estaba
construido:**

Dentro (además de las 7 pantallas ya reales):
- **Estadísticas** (`/u/[handle]/estadisticas`) — el usuario lo pidió
  explícitamente tras verlo mencionado como excluido.
- **Juego anclado/reservado para el próximo platino** (Modo Enfoque/
  Cerrojo de Hitos en la web).
- **Carpetas de juegos** — viven dentro de `/planificador` en la web
  (`CarpetasManager`), aquí van sueltas, sin el resto del planificador.
- **Modo Enfoque** (`/u/[handle]/[gameId]/enfoque`) — propuesto por Claude:
  pantalla a pantalla completa para cazar trofeos con el mando en la mano,
  el uso que más sentido de "app nativa" tiene de toda la lista.
- **Comparar con amigos** (`/comparar`) — propuesto por Claude: ligero,
  social, reutiliza la lista de amigos que ya existe en Ligas y Amigos.

Fuera a propósito, con motivo (no es "no dio tiempo", es criterio):
- **Wrap**, **Hoja de servicios/CV** — uso de una vez al año o para
  compartir hacia fuera; mejor un enlace "Abrir en el navegador" que una
  pantalla nativa mantenida para 5 minutos de uso.
- **Tu ritmo** (`/ritmo`) — se solapa con Estadísticas, no aparte.
- **Planificador** (la parte de "estado de ánimo", las carpetas SÍ entran
  sueltas, ver arriba) — nicho, uso esporádico.
- **Ajustes → Apariencia** — la app nativa solo tiene tema oscuro fijo hoy,
  nada que ajustar todavía.
- **Ajustes → Ocultar** — es un concepto de la navegación WEB (esconder
  ítems del menú lateral); la app nativa tiene una barra fija de 4
  pestañas, no aplica.
- **Ajustes → Seguridad** — ya cubierto por Cuentas Vinculadas + Cerrar
  sesión, que hacen lo mismo.
- **Muro social global** (`/feed`, no el tuyo+amigos) — con ~6 usuarios
  reales no aporta sobre el feed personal que ya hay.
- **Descubrir, Noticias** — ya descartados antes, confirmado.
- **Landing, Cómo funciona, Ejemplo, Admin** — marketing/panel de
  desarrollador, irrelevantes una vez instalada la app.

**Hueco real encontrado, sin construir todavía y sin prisa**: `/bienvenida`
(onboarding de primera vez — elegir handle, vincular la primera cuenta) no
tiene equivalente nativo. Con el grupo cerrado de ~6 usuarios ya
configurados desde la web no es urgente, pero es el primer sitio donde
rompería si entrara alguien nuevo solo desde el móvil.

Sin backend `/api/mobile/*` todavía para ninguna de las piezas nuevas.

**3 bugs visuales reales encontrados probando en un dispositivo (16/09),
arreglados por Claude:**
- Carátulas en blanco: `iconUrl` viene `null` para muchos juegos de verdad
  (dato normal, ni un fallo) — la web ya lo trataba con un degradado de
  respaldo (`LibraryGrid.tsx`), el móvil no. Añadido el mismo respaldo
  (inicial del juego sobre degradado) en `GameCards.kt`.
- La barra de navegación inferior no reservaba espacio para la barra de
  gestos del sistema (`enableEdgeToEdge()` + un BOM de Compose
  2024.02.00, de antes de que `NavigationBar` hiciera esto sola) —
  `windowInsetsPadding(WindowInsets.navigationBars)` en `MainScreen.kt`.
- El "smear" raro en la cabecera del Panel probablemente era el mismo
  problema de carátula rota — pendiente de confirmar con una `.apk` nueva.

---

## Tareas de Gemini (UI en Compose, Android Studio)

- [x] Ordenar en Biblioteca, Cerrar sesión, Buscador reactivo.
- [x] Pantallas de Ajustes del perfil y Cuentas Vinculadas — con sus
      repositorios de red (Retrofit) contra los 4 endpoints reales. Repasado
      y compilado por Claude el 16/09, un bug pequeño encontrado y
      arreglado (ver arriba).
- [ ] 5 piezas nuevas en el alcance (16/09, ver detalle arriba): Estadísticas,
      juego anclado/reservado, carpetas de juegos, Modo Enfoque, Comparar
      con amigos. Todas necesitan su endpoint primero (tarea de Claude,
      abajo) — empezando por juego anclado + carpetas.

## Tareas de Claude (backend + enganche de datos reales)

- [x] Endpoints de juego anclado/reservado y carpetas (16/09): `POST
      /api/mobile/games/{gameId}/pin`, `POST .../reserve`, `GET
      /api/mobile/milestone`, y CRUD completo de `/api/mobile/collections`
      — reutilizando `togglePinGameAction`/`toggleReservarHitoAction` de
      `actions.ts` (extraídas a `profiles.ts`/`milestones.ts` para no
      duplicar lógica) y `lib/collections.ts` tal cual, sin tocarlo.
      `tsc`/`eslint` limpios. Sin construir la pantalla en Android todavía.
- [ ] Estadísticas, Modo Enfoque, Comparar — las otras 3 piezas del
      alcance del 16/09, sin empezar todavía.
- [ ] Endpoint del desglose de trofeos por metal del Panel — el único dato
      que sigue mock. Sin prisa, nada más depende de esto.
- [x] 3 bugs visuales reales arreglados (16/09): carátulas en blanco sin
      degradado de respaldo, barra de navegación sin inset del sistema —
      ver detalle arriba. Compilado y verificado.
- [x] Los 9 endpoints (`panel`, `panel/highlights`, `library`, `feed`,
      `social`, `games/{gameId}`, `accounts`, `accounts/{platform}`,
      `profile`, `logout`) + `mobileAuth.ts` + `/movil/enlazar` +
      `/movil/entrar/{provider}` — comiteados y en `origin/master`.
- [x] Cierre de sesión solo en el móvil (`mintMobileSession`,
      `revokeMobileSession`) — sesión del móvil independiente de la web
      desde el primer login.
- [x] Login directo al proveedor sin página web de por medio.
- [x] Bug arreglado: vincular una cuenta de PSN/Steam/Xbox ya vinculada a
      OTRO usuario daba un mensaje falso — ahora explica el conflicto real
      (`PlatformAccountAlreadyLinkedError`).
- [x] Todas las pantallas con datos reales, un repositorio propio cada una,
      compartiendo un único Retrofit (`ApiClient`).
- [x] Auditoría de seguridad completa del backend móvil.

## Pendiente de decisión (ninguno de los dos debería tocarlo sin que el
usuario lo confirme antes)

- Publicación en Play Store: descartada a propósito por ahora (ver
  HANDOFF.md, política de "minimum functionality").
- Qué pasa con `MainActivity`/el WebView de Capacitor mientras conviva con
  la app nativa (el usuario ya dijo "convivir un tiempo").
- Qué pantalla o mejora toca ahora que hay paridad básica — sin decidir
  todavía.
