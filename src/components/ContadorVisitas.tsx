"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useReportWebVitals } from "next/web-vitals";

/**
 * Cuenta las páginas vistas para Admin → Analítica (21 oct 2026, ver
 * lib/trafico.ts). Manda la ruta con `sendBeacon`, que no espera respuesta
 * ni retrasa nada. No usa cookies ni guarda nada en el navegador; respeta
 * "No rastrear" (Do Not Track / Global Privacy Control) si está activado.
 *
 * Desde el 21 oct 2026, en la primera página de la visita manda también el
 * idioma del navegador, el ancho de pantalla, si usa tema oscuro y la
 * campaña (utm_source), y las medidas de Web Vitals de cada página. El
 * servidor lo reduce todo a etiquetas (lib/traficoRutas.ts).
 *
 * Las Web Vitals se juntan y salen en UN solo aviso al ocultar la página
 * (antes, hasta cinco llamadas por página: cada una es CPU en Vercel).
 */

function sinRastreo(): boolean {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return nav.doNotTrack === "1" || nav.globalPrivacyControl === true;
}

/** Manda un aviso al contador. Exportado para la página de "no encontrado". */
export function avisarContador(cuerpo: Record<string, unknown>) {
  if (sinRastreo()) return;
  try {
    navigator.sendBeacon("/api/v", new Blob([JSON.stringify(cuerpo)], { type: "application/json" }));
  } catch {
    // Sin sendBeacon (navegadores muy viejos): no se cuenta.
  }
}

const pendientes = new Map<string, { n: string; v: number; c: string }>();

function enviarVitales() {
  if (pendientes.size === 0) return;
  avisarContador({ k: "wv", m: [...pendientes.values()] });
  pendientes.clear();
}

export function ContadorVisitas() {
  const ruta = usePathname();
  const primera = useRef(true);

  useReportWebVitals((m) => {
    // La última medida de cada métrica es la que vale (CLS e INP se actualizan).
    pendientes.set(m.name, { n: m.name, v: m.name === "CLS" ? Math.round(m.value * 1000) / 1000 : Math.round(m.value), c: m.rating });
  });

  useEffect(() => {
    const alOcultar = () => {
      if (document.visibilityState === "hidden") enviarVitales();
    };
    document.addEventListener("visibilitychange", alOcultar);
    return () => document.removeEventListener("visibilitychange", alOcultar);
  }, []);

  useEffect(() => {
    const esPrimera = primera.current;
    primera.current = false;
    avisarContador(
      esPrimera
        ? {
            r: ruta,
            e: true,
            ref: document.referrer,
            l: navigator.language,
            w: window.screen?.width,
            t: window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "oscuro" : "claro",
            u: new URLSearchParams(location.search).get("utm_source") ?? undefined,
          }
        : { r: ruta, e: false },
    );
  }, [ruta]);

  return null;
}
