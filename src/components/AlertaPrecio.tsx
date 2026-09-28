"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Bell, BellOff } from "lucide-react";
import { borrarAlertaPrecioAction, guardarAlertaPrecioAction } from "@/app/actions";

/**
 * Precio actual en Steam España y "avísame cuando baje de X €" — ver
 * lib/priceAlerts.ts. El aviso lo manda el cron.
 */
export function AlertaPrecio({
  steamAppId,
  gameId,
  titulo,
  precio,
  alerta,
  conSesion,
}: {
  steamAppId: string;
  gameId: string;
  titulo: string;
  precio: { final: number; inicial: number; descuento: number } | null;
  alerta: number | null;
  conSesion: boolean;
}) {
  const t = useTranslations("Biblioteca.JuegoPage.alertaPrecio");
  const locale = useLocale();
  // "24,99 €" en español/alemán/francés, "€24.99" en inglés.
  const eur = (n: number) => n.toLocaleString(locale, { style: "currency", currency: "EUR" });
  // Propuesta inicial: un 30% por debajo del precio actual, que es una
  // rebaja típica de Steam.
  const [objetivo, setObjetivo] = useState(() =>
    (alerta ?? (precio ? Math.max(0.01, Math.floor(precio.final * 0.7 * 100) / 100) : 10)).toFixed(2),
  );
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  function guardar() {
    const valor = Number(objetivo.replace(",", "."));
    if (!Number.isFinite(valor) || valor < 0.01 || valor > 999) {
      setError(t("invalido"));
      return;
    }
    setError(null);
    startTransition(async () => {
      const r = await guardarAlertaPrecioAction(steamAppId, gameId, titulo, valor);
      if (r.error) setError(r.error);
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl p-5" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
      <h2 className="font-heading text-lg font-bold">{t("titulo")}</h2>
      {precio ? (
        <p className="flex flex-wrap items-baseline gap-2">
          <span className="font-heading text-2xl font-bold tabular-nums">{eur(precio.final)}</span>
          {precio.descuento > 0 && (
            <>
              <span className="text-sm text-muted line-through">{eur(precio.inicial)}</span>
              <span className="text-sm font-bold text-good">-{precio.descuento}%</span>
            </>
          )}
        </p>
      ) : (
        <p className="text-sm text-muted">{t("gratis")}</p>
      )}

      {!conSesion ? (
        <p className="text-xs text-muted">{t("conSesion")}</p>
      ) : alerta !== null ? (
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-2 text-sm font-semibold text-[var(--accent-text)]">
            <Bell size={15} /> {t("activa", { precio: eur(alerta) })}
          </p>
          <button
            type="button"
            disabled={pendiente}
            onClick={() => startTransition(() => borrarAlertaPrecioAction(steamAppId, gameId))}
            className="flex w-fit items-center gap-1.5 text-xs font-semibold text-muted transition-colors hover:text-danger disabled:opacity-50"
          >
            <BellOff size={13} /> {t("quitar")}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-muted" htmlFor="alerta-precio">
            {t("avisame")}
          </label>
          <div className="flex items-center gap-2">
            <div className="relative w-28">
              <input
                id="alerta-precio"
                inputMode="decimal"
                value={objetivo}
                onChange={(e) => setObjetivo(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-2 py-2 pl-3 pr-7 text-sm tabular-nums focus:border-accent focus:outline-none"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">€</span>
            </div>
            <button
              type="button"
              disabled={pendiente}
              onClick={guardar}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold text-background transition-all hover:-translate-y-0.5 hover:shadow-[0_0_16px_rgb(var(--accent-rgb)/0.4)] disabled:opacity-50"
              style={{ background: "var(--accent-grad)" }}
            >
              <Bell size={14} /> {t("guardar")}
            </button>
          </div>
          {error && <p className="text-xs font-semibold text-danger">{error}</p>}
          <p className="text-[0.6875rem] text-muted">{t("ayuda")}</p>
        </div>
      )}
    </div>
  );
}
