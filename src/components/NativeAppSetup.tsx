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
 * Import dinámico de `@capacitor/core` (y de cada plugin dentro del if):
 * son dependencias reales del proyecto, pero cargarlas de golpe en el
 * bundle de la WEB (que sirve a muchísimos más visitantes que la app)
 * sería peso muerto para quien nunca va a estar dentro de un WebView.
 */
export function NativeAppSetup() {
  useEffect(() => {
    let cleanupBackButton: (() => void) | undefined;
    let cleanupHaptics: (() => void) | undefined;

    (async () => {
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform()) return;

      // --- Barra de estado transparente y "edge-to-edge" (dibujada por encima
      // de la app, en lugar de empujar el contenido hacia abajo) para aprovechar
      // toda la pantalla como una verdadera app nativa. `Style.Dark` = iconos claros. ---
      try {
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        // Overlay true: el WebView se dibuja debajo de la barra de estado.
        await StatusBar.setOverlaysWebView({ overlay: true });
        await StatusBar.setStyle({ style: Style.Dark });
      } catch (error) {
        console.error("[NativeAppSetup] status bar", error);
      }

      // --- Oculta el splash a mano, con `launchAutoHide: false` puesto en
      // capacitor.config.ts — sin esto Capacitor lo esconde en cuanto
      // termina de cargar el HTML inicial, antes de que la página remota
      // haya pintado nada de verdad, y se ve un parpadeo en blanco/oscuro
      // liso entre el splash y el contenido real. ---
      try {
        const { SplashScreen } = await import("@capacitor/splash-screen");
        await SplashScreen.hide();
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
        const { App } = await import("@capacitor/app");
        const listener = await App.addListener("backButton", ({ canGoBack }) => {
          if (canGoBack) {
            window.history.back();
          } else {
            App.exitApp();
          }
        });
        cleanupBackButton = () => listener.remove();
      } catch (error) {
        console.error("[NativeAppSetup] back button", error);
      }

      // --- Vibración háptica ligera al tocar algo interactivo. No hay
      // forma razonable de añadir esto botón a botón en toda la app (son
      // cientos), así que se engancha una vez al documento entero: solo
      // dispara si el toque cae de verdad sobre un `button`/`a`/`[role=
      // button]`, no en cualquier parte de la pantalla. ---
      try {
        const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
        const handler = (event: PointerEvent) => {
          const target = event.target as Element | null;
          if (target?.closest('button, a, [role="button"]')) {
            Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
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
