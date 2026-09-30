"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // `?v=` distinto en cada despliegue: el navegador lo trata como un script
    // nuevo, reinstala y vuelve a guardar la página offline con sus chunks.
    const registrar = () => {
      navigator.serviceWorker.register(`/sw.js?v=${process.env.NEXT_PUBLIC_BUILD_ID}`).catch((err) => {
        console.warn("No se pudo registrar el Service Worker:", err);
      });
    };

    // Si `load` ya pasó antes de hidratar (carga rápida desde caché), el
    // listener nunca saltaba y el Service Worker no se registraba.
    if (document.readyState === "complete") {
      registrar();
      return;
    }
    window.addEventListener("load", registrar, { once: true });
    return () => window.removeEventListener("load", registrar);
  }, []);

  return null;
}
