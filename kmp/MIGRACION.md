# Migración de la app móvil a Compose Multiplatform

Objetivo: una sola app (Kotlin + Compose) para Android y iOS nativo, compilando
iOS sin Mac en GitHub Actions. Decisión del usuario, 5 oct 2026. Cuenta de
Apple **gratuita** por ahora (Sideloadly, 7 días, sin push).

## Estrategia: trasladar, no reescribir

1. **Fase 1 — `kmp/androidApp`**: copia de `android/app` compilando dentro de
   `kmp/` (Kotlin 2.4, sin Capacitor). Android completo desde el primer día.
   `android/` queda congelada: ningún cambio nuevo ahí.
2. **Fase 2 — datos a `shared/commonMain`**: DTO a kotlinx.serialization,
   Retrofit → Ktor, Room KMP, sesión (`TokenStore`) con multiplatform-settings,
   `EnlaceSeguro` (AES-GCM) con cryptography-kotlin, `java.time` →
   kotlinx-datetime. Cada repositorio movido lo usan Android e iOS a la vez.
3. **Fase 3 — pantallas a `shared/commonMain`**: tema, componentes comunes y
   pantallas una a una. `LocalContext` → `expect`/`actual`, textos →
   Compose Resources (`android/i18n/generar.mjs` adaptado).
4. **Fase 4 — lo propio de cada plataforma**: login (Custom Tab /
   `ASWebAuthenticationSession`), deep link `paragon://auth`, sensor de la
   ruleta (CoreMotion en iOS), vibraciones, compartir. Solo Android: FCM,
   widget Glance, WorkManager, iconos alternativos. Solo iOS: Siri/Atajos,
   Core Haptics (y, con cuenta de pago, Dynamic Island y widgets).
5. **Fase 5 — retirar** `android/` y el proyecto Capacitor de `ios/`.

## Versiones

Kotlin 2.4.20 · Compose Multiplatform 1.12.1 · AGP 9.4.1 (Kotlin integrado: sin
`kotlin("android")`) · Gradle 9.8.0 · compileSdk 37 / targetSdk 36 ·
KSP 2.3.12 · Room 2.8.5 · Ktor 3.6.0 · Coil 3.6.3 · navigation-compose
(JetBrains) 2.9.2.

## Progreso

- [x] Prueba mínima en iPhone (iOS 26.6): red, JSON, imágenes, insets.
- [x] Vibraciones (Core Haptics): probadas en el iPhone.
- [ ] Siri (App Intents): compila, pero iOS no registra las frases (en diagnóstico:
  faltaban icono y nombre en el Info.plist).
- [x] Fase 1 — androidApp: compila y arranca en el emulador (modo demo: panel,
  biblioteca, estadísticas, comunidad, ligas). Textos: `kmp/i18n/textos.json` →
  `node kmp/i18n/generar.mjs` genera los strings.xml de androidApp y
  `shared/.../i18n/TextosGenerados.kt` (`stringResource(T.clave)` común).
- [ ] Fase 2 — datos
  - [x] Red: los 63 endpoints en `shared/.../red` (Ktor + kotlinx.serialization,
    convertidos con un script desde Retrofit). `ClienteParagon` (motor por
    plataforma), `HttpException` con `code()` y `paragonErrorMessage()` como
    Retrofit. Android usa el motor OkHttp (caché HTTP + modo demo). Probado en
    el emulador con el modo demo: panel, biblioteca, ficha, estadísticas,
    comunidad, ligas, ajustes. Ojo: Ktor necesita `Content-Type: application/json`
    en la respuesta (el servidor lo manda; el modo demo no lo mandaba).
  - [ ] Sesión (`TokenStore`), `EnlaceSeguro`, repositorios, Room
- [ ] Fase 3 — pantallas
- [ ] Fase 4 — plataforma
- [ ] Fase 5 — retirar lo viejo
