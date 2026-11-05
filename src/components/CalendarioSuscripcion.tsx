"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CalendarPlus, Check, Copy } from "lucide-react";

/**
 * Ajustes → Avisos → Calendario: el enlace `webcal://` al calendario
 * personal (`/api/calendario/<token>.ics`). El token lo firma el servidor
 * (lib/enlaceFirmado.ts) y llega ya hecho en `https`.
 */
export function CalendarioSuscripcion({ url }: { url: string }) {
  const t = useTranslations("Onboarding.calendario");
  const [copiado, setCopiado] = useState(false);
  const webcal = url.replace(/^https?:\/\//, "webcal://");
  const google = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      // Sin permiso de portapapeles: el campo se puede seleccionar a mano.
    }
  }

  return (
    <section className="ajustes-grupo">
      <h2 className="mb-1 font-semibold">{t("titulo")}</h2>
      <p className="mb-4 text-sm text-muted">{t("descripcion")}</p>
      <div className="mb-3 flex flex-wrap gap-2">
        <a
          href={webcal}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-90"
        >
          <CalendarPlus size={16} /> {t("abrir")}
        </a>
        <a
          href={google}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-border px-4 py-2 text-sm font-semibold transition-colors hover:border-accent hover:text-[var(--accent-text)]"
        >
          {t("google")}
        </a>
      </div>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          aria-label={t("enlace")}
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs"
        />
        <button
          type="button"
          onClick={copiar}
          aria-label={t("enlace")}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border transition-colors hover:border-accent hover:text-[var(--accent-text)]"
        >
          {copiado ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
      <p className="mt-3 text-xs text-muted">{t("privado")}</p>
    </section>
  );
}
