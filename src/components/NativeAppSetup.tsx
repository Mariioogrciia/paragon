"use client";

import { useEffect } from "react";

/**
 * Los toques que hacen que el shell de Capacitor (android/, ios/) se sienta
 * nativo de verdad y no "una web dentro de un marco" — pedido explícito del
 * usuario (16 de septiembre de 2026): "es como una web, quiero que se
 * sienta nativa de verdad". Nada de esto toca la web normal: todo empieza
 * comprobando `Capacitor.isNativePlatform()`, así que en cualquier
 * navegador de verdad (incluido el de un móvil sin la app instalada) este
 * componente no hace absolutamente nada.
 *
 * Sin paquetes de npm (5 oct 2026): `@capacitor/*` salió del package.json
 * al pasar las apps a kmp/, pero el shell de Capacitor que aún queda en
 * ios/ sigue cargando esta web. Dentro de ese WebView el propio runtime
 * nativo inyecta `window.Capacitor` con sus plugins registrados, así que se
 * leen de ahí; en un navegador normal no existe y esto no hace nada.
 */

interface PluginsCapacitor {
  StatusBar?: { setOverlaysWebView(o: { overlay: boolean }): Promise<void>; setStyle(o: { style: string }): Promise<void> };
  SplashScreen?: { hide(): Promise<void> };
  App?: {
    addListener(evento: "backButton", cb: (e: { canGoBack: boolean }) => void): Promise<{ remove(): void }>;
    exitApp(): Promise<void>;
  };
  Haptics?: { impact(o: { style: string }): Promise<void> };
}

function capacitorNativo(): PluginsCapacitor | null {
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?(): boolean; Plugins?: PluginsCapacitor } }).Capacitor;
  return cap?.isNativePlatform?.() ? (cap.Plugins ?? {}) : null;
}
export function NativeAppSetup() {
  useEffect(() => {
    let cleanupBackButton: (() => void) | undefined;
    let cleanupHaptics: (() => void) | undefined;

    (async () => {
      const plugins = capacitorNativo();
      if (!plugins) return;

      // --- Barra de estado transparente y "edge-to-edge" (dibujada por encima
      // de la app, en lugar de empujar el contenido hacia abajo) para aprovechar
      // toda la pantalla como una verdadera app nativa. `Style.Dark` = iconos claros. ---
      try {
        // Overlay true: el WebView se dibuja debajo de la barra de estado.
        await plugins.StatusBar?.setOverlaysWebView({ overlay: true });
        await plugins.StatusBar?.setStyle({ style: "DARK" });
      } catch (error) {
        console.error("[NativeAppSetup] status bar", error);
      }

      // --- Oculta el splash a mano, con `launchAutoHide: false` puesto en
      // capacitor.config.ts — sin esto Capacitor lo esconde en cuanto
      // termina de cargar el HTML inicial, antes de que la página remota
      // haya pintado nada de verdad, y se ve un parpadeo en blanco/oscuro
      // liso entre el splash y el contenido real. ---
      try {
        await plugins.SplashScreen?.hide();
      } catch (error) {
        console.error("[NativeAppSetup] splash screen", error);
      }

      // --- Botón atrás físico/gesto de Android: por defecto Capacitor
      // cierra la app entera si no hay historial de WebView, que no es
      // "atrás" de una app de verdad — una app nativa vuelve a la pantalla
      // anterior de SU PROPIA navegación. Como esto es una SPA de Next.js
      // dentro del WebView, "su navegación" es el historial del propio
      // navegador (`history.back()`), no el de Capacitor. ---
      try {
        const App = plugins.App;
        if (App) {
          const listener = await App.addListener("backButton", ({ canGoBack }) => {
            if (canGoBack) {
              window.history.back();
            } else {
              App.exitApp();
            }
          });
          cleanupBackButton = () => listener.remove();
        }
      } catch (error) {
        console.error("[NativeAppSetup] back button", error);
      }

      // --- Vibración háptica ligera al tocar algo interactivo. No hay
      // forma razonable de añadir esto botón a botón en toda la app (son
      // cientos), así que se engancha una vez al documento entero: solo
      // dispara si el toque cae de verdad sobre un `button`/`a`/`[role=
      // button]`, no en cualquier parte de la pantalla. ---
      try {
        const Haptics = plugins.Haptics;
        if (!Haptics) throw new Error("sin plugin Haptics");
        const handler = (event: PointerEvent) => {
          const target = event.target as Element | null;
          if (target?.closest('button, a, [role="button"]')) {
            Haptics.impact({ style: "LIGHT" }).catch(() => {});
          }
        };
        document.addEventListener("pointerdown", handler, { passive: true });
        cleanupHaptics = () => document.removeEventListener("pointerdown", handler);
      } catch (error) {
        console.error("[NativeAppSetup] haptics", error);
      }
    })();

    return () => {
      cleanupBackButton?.();
      cleanupHaptics?.();
    };
  }, []);

  return null;
}
