"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { clienteAdSense, slotAdSense } from "@/lib/publicidad";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * Un hueco fijo para un anuncio (19 oct 2026, ver lib/publicidad.ts): solo
 * aparece con `NEXT_PUBLIC_ADSENSE_CLIENT` y `NEXT_PUBLIC_ADSENSE_SLOT`
 * puestas. Lleva el rótulo "Publicidad" encima, para que no se confunda con
 * el contenido de Paragon. Va en páginas de contenido (Descubrir, la ficha
 * de un juego), nunca en Ajustes ni en el perfil de alguien.
 */
export function HuecoAnuncio({ className = "" }: { className?: string }) {
  const t = useTranslations("Shell.Footer");
  const cliente = clienteAdSense();
  const slot = slotAdSense();
  const pedido = useRef(false);

  useEffect(() => {
    if (!cliente || !slot || pedido.current) return;
    pedido.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Bloqueador de anuncios o AdSense aún sin cargar: el hueco se queda vacío.
    }
  }, [cliente, slot]);

  if (!cliente || !slot) return null;
  return (
    <aside className={`my-8 ${className}`} aria-label={t("publicidad")}>
      <p className="mb-1 text-center text-[0.625rem] font-bold uppercase tracking-[0.12em] text-muted">{t("publicidad")}</p>
      <ins
        className="adsbygoogle block"
        style={{ display: "block" }}
        data-ad-client={cliente}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
