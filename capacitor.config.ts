import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Shell nativo de Paragon (Nivel 2, ver HANDOFF) — NO empaqueta la web
 * localmente. Next.js usa server actions, streaming, cron, auth con
 * cookies de sesión... nada de eso sobrevive a un `next export` estático,
 * así que en vez de reescribir la app, `server.url` hace que la WebView
 * nativa cargue la web de producción de verdad, tal cual, dentro de un
 * shell instalable. Es el mismo patrón que una Trusted Web Activity de
 * Android o una app "wrapper", solo que con Capacitor da también el lado
 * de iOS.
 *
 * Cambiar `server.url` a mano en cuanto haya un dominio propio — hoy
 * apunta al dominio de Vercel tal cual lo dio el usuario.
 */
const config: CapacitorConfig = {
  appId: "com.paragon.app",
  appName: "Paragon",
  webDir: "capacitor-www",
  server: {
    url: "https://platinos-nine.vercel.app",
    // Sin esto Android sirve el contenido remoto sobre un origen
    // `http://localhost` interno y todas las cookies de sesión (auth) y el
    // Service Worker (push, offline) se pierden por mismatch de origen.
    androidScheme: "https",
    cleartext: false,
  },
  ios: {
    // WKWebView, a diferencia de Safari normal, no pregunta por los
    // permisos de notificación de la misma forma — el Web Push que ya
    // usa Paragon puede no funcionar aquí dentro sin más trabajo (ver
    // aviso en HANDOFF). No es un fallo de esta configuración, es una
    // limitación conocida de WKWebView.
    contentInset: "automatic",
  },
};

export default config;
