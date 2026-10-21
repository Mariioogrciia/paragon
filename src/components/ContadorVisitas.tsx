"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Cuenta las páginas vistas para Admin → Analítica (21 oct 2026, ver
 * lib/trafico.ts). Manda la ruta con `sendBeacon`, que no espera respuesta
 * ni retrasa nada. No usa cookies ni guarda nada en el navegador; respeta
 * "No rastrear" (Do Not Track / Global Privacy Control) si está activado.
 */
export function ContadorVisitas() {
  const ruta = usePathname();
  const primera = useRef(true);

  useEffect(() => {
    const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
    if (nav.doNotTrack === "1" || nav.globalPrivacyControl) return;
    const cuerpo = JSON.stringify({ r: ruta, e: primera.current, ref: primera.current ? document.referrer : undefined });
    primera.current = false;
    try {
      navigator.sendBeacon("/api/v", new Blob([cuerpo], { type: "application/json" }));
    } catch {
      // Sin sendBeacon (navegadores muy viejos): esa vista no se cuenta.
    }
  }, [ruta]);

  return null;
}
