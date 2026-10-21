"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Play } from "lucide-react";

/** El nombre del servicio del reproductor, para el aviso. */
function servicioDe(src: string): string {
  if (/twitch\.tv/i.test(src)) return "Twitch";
  if (/youtube(-nocookie)?\.com|youtu\.be/i.test(src)) return "YouTube";
  if (/kick\.com/i.test(src)) return "Kick";
  try {
    return new URL(src).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * Reproductor del directo. No se carga hasta que se pulsa (21 oct 2026): el
 * reproductor de Twitch/YouTube/Kick pone sus propias cookies nada más
 * cargarse, y la normativa de cookies (LSSI, guía de la AEPD) no deja
 * ponerlas sin una acción de quien visita. El botón dice qué se va a cargar;
 * pulsarlo es esa acción. El documento ajeno pinta blanco mientras carga: se
 * queda invisible sobre el fondo negro hasta que termina, y entra fundido.
 */
export function DirectoIncrustado({ src, titulo }: { src: string; titulo: string }) {
  const t = useTranslations("Descubrir.EsportsPartido");
  const [cargar, setCargar] = useState(false);
  const [listo, setListo] = useState(false);
  return (
    <div className="aspect-video overflow-hidden rounded-2xl border border-border bg-black">
      {cargar ? (
        <iframe
          src={src}
          title={titulo}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          onLoad={() => setListo(true)}
          style={{ colorScheme: "dark" }}
          className={`h-full w-full bg-black transition-opacity duration-500 motion-reduce:transition-none ${listo ? "opacity-100" : "opacity-0"}`}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
          <button
            type="button"
            onClick={() => setCargar(true)}
            className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
            style={{ background: "var(--accent-grad)" }}
          >
            <Play size={16} aria-hidden="true" /> {t("directoCargar")}
          </button>
          <p className="max-w-[36ch] text-xs text-white/60">{t("directoAviso", { servicio: servicioDe(src) })}</p>
        </div>
      )}
    </div>
  );
}
