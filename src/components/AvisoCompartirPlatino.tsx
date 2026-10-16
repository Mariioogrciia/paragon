"use client";

/* eslint-disable @next/next/no-img-element -- la vista previa es la propia imagen generada por /api/trophy-card, no una foto que optimizar */
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { X } from "lucide-react";
import { marcarPlatinoPreguntadoAction } from "@/app/actions";
import { CompartirImagen } from "@/components/CompartirImagen";

/**
 * "¡Platino! ¿Lo compartes?" (16 oct 2026, ver lib/compartirPlatino.ts):
 * una tarjeta flotante abajo a la derecha (abajo del todo en el móvil) con
 * la imagen vertical para Stories ya generada y el botón de compartir. Sale
 * una vez por platino: "Ahora no", la X o compartir lo dan por preguntado.
 */
export function AvisoCompartirPlatino({ gameId, titulo, handle }: { gameId: string; titulo: string; handle: string }) {
  const t = useTranslations("Perfil");
  const locale = useLocale();
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  const imagen = `/api/trophy-card/${encodeURIComponent(handle)}/${encodeURIComponent(gameId)}?formato=historia&lang=${locale}`;

  function cerrar() {
    setVisible(false);
    void marcarPlatinoPreguntadoAction(gameId);
  }

  return (
    <div
      role="dialog"
      aria-labelledby="aviso-platino-titulo"
      className="fixed inset-x-3 bottom-3 z-50 flex gap-4 rounded-[20px] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.5)] sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[400px]"
      style={{ border: "1px solid rgb(159 212 236 / 0.35)", background: "linear-gradient(160deg, var(--surface), var(--background))" }}
    >
      <img
        src={imagen}
        alt={t("compartirPlatino.alt", { juego: titulo })}
        width={96}
        height={171}
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
        className="h-[171px] w-[96px] shrink-0 rounded-xl object-cover"
        style={{ border: "1px solid var(--border)", background: "var(--surface-2)" }}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start gap-2">
          <p id="aviso-platino-titulo" className="font-heading flex-1 text-[1.0625rem] font-bold leading-tight text-platinum">
            {t("compartirPlatino.titulo", { juego: titulo })}
          </p>
          <button type="button" onClick={cerrar} aria-label={t("compartirPlatino.ahoraNo")} className="rounded-md p-1 text-muted hover:bg-[var(--surface-2)] hover:text-foreground">
            <X size={16} />
          </button>
        </div>
        <p className="mt-1.5 text-[0.8125rem] text-muted">{t("compartirPlatino.texto")}</p>
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-3">
          <CompartirImagen
            url={imagen}
            nombreArchivo={`paragon-platino-${gameId}.png`}
            tituloCompartir={t("compartirPlatino.titulo", { juego: titulo })}
            onCompartido={cerrar}
            className="rounded-xl px-4 py-2.5 text-sm font-bold text-background disabled:opacity-50"
            style={{ background: "var(--accent-grad)" }}
          >
            {t("compartirPlatino.compartir")}
          </CompartirImagen>
          <button type="button" onClick={cerrar} className="rounded-md px-1 text-[0.8125rem] font-semibold text-muted hover:text-foreground">
            {t("compartirPlatino.ahoraNo")}
          </button>
        </div>
      </div>
    </div>
  );
}
