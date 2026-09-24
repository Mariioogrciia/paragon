"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { TrophyPhoto } from "@/components/TrophyList";
import { gradeLabel } from "@/components/TrophyIcon";
import { rarity, relativeDate } from "@/lib/design";
import type { TrofeoDelMes } from "@/lib/history";

/**
 * Lista de trofeos de `/ritmo` — antes SIEMPRE con `TrophyTile` (el
 * cuadrado de color por metal), nunca la foto real del logro, y sin más
 * vista que la lista plana. Pedido explícito: misma foto real que ya usa
 * `TrophyList`/`RecentTrophies` (`TrophyPhoto`, con el cuadrado de color
 * como respaldo solo cuando de verdad no hay icono), y un selector de
 * vista Lista/Cuadrícula como el de la ficha de un juego — aquí sin
 * Árbol/Cronología porque esta lista mezcla juegos distintos, esas dos
 * vistas solo tienen sentido dentro de un juego concreto.
 */
export function RitmoTrophyList({ trofeos }: { trofeos: TrofeoDelMes[] }) {
  const t = useTranslations("Analitica.ritmoPage");
  const [vista, setVista] = useState<"lista" | "cuadricula">("lista");

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-3">
          <h2 className="font-heading text-2xl font-bold">{t("oneByOne")}</h2>
          <span className="text-[0.8125rem] text-muted">{t("trophyCount", { count: trofeos.length })}</span>
        </div>

        <div
          className="inline-flex gap-1 rounded-[10px] p-1"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <ViewButton active={vista === "lista"} onClick={() => setVista("lista")} label={t("viewList")}>
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </ViewButton>
          <ViewButton active={vista === "cuadricula"} onClick={() => setVista("cuadricula")} label={t("viewGrid")}>
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </ViewButton>
        </div>
      </div>

      {vista === "lista" ? (
        <div className="space-y-2">
          {trofeos.map((trofeo) => {
            const r = trofeo.rarityPercent !== null ? rarity(trofeo.rarityPercent) : null;

            return (
              <div
                key={`${trofeo.gameId}-${trofeo.trophyId}`}
                className="flex items-center gap-3.5 rounded-xl p-3.5"
                style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
              >
                <TrophyPhoto trophy={trofeo} size={38} />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.875rem] font-semibold">{trofeo.nombre}</p>
                  <p className="truncate text-[0.75rem] text-muted">
                    {trofeo.juego}
                    {trofeo.detalle && ` · ${trofeo.detalle}`}
                  </p>
                </div>

                {r && (
                  <span
                    className="hidden shrink-0 rounded-full px-2.5 py-1 text-[0.625rem] font-bold uppercase tracking-[0.08em] sm:inline-block"
                    style={{ background: r.bg, color: r.fg }}
                  >
                    {trofeo.rarityPercent!.toFixed(1)}%
                  </span>
                )}

                <span className="shrink-0 text-right text-[0.6875rem] text-muted">
                  {t("dayShort", { dia: new Date(trofeo.earnedAt).getUTCDate() })}
                  <span className="block">{relativeDate(trofeo.earnedAt)}</span>
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-3">
          {trofeos.map((trofeo) => (
            <div
              key={`${trofeo.gameId}-${trofeo.trophyId}`}
              className="flex flex-col items-center gap-2 rounded-xl p-3 text-center"
              style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
              title={`${trofeo.nombre} · ${trofeo.juego}`}
            >
              <TrophyPhoto trophy={trofeo} size={56} />
              <p className="line-clamp-2 text-[0.6875rem] font-semibold leading-tight">{trofeo.nombre}</p>
              <p className="truncate text-[0.625rem] text-muted" style={{ maxWidth: "100%" }}>
                {trofeo.juego}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ViewButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className="rounded-md p-1.5 transition-colors"
      style={
        active
          ? { background: "rgb(var(--accent-rgb) / 0.16)", color: "var(--accent-text)" }
          : { background: "transparent", color: "var(--muted)" }
      }
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </button>
  );
}
