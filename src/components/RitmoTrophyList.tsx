"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { TrophyPhoto } from "@/components/TrophyList";
import { rarity, relativeDate } from "@/lib/design";
import type { DesgloseMes, TrofeoDelMes } from "@/lib/history";

/**
 * Calendario del mes + lista de trofeos de `/ritmo`, como un único
 * componente cliente.
 *
 * El filtro por día antes vivía en la URL (`?dia=`) y recargaba la página
 * en el servidor al pinchar una barra — con todos los trofeos del mes ya
 * en memoria (los mismos que llegan aquí), ese viaje de ida y vuelta no
 * aportaba nada más que esperar: el filtrado es puramente local, así que
 * ahora es estado de React y se aplica al instante, sin spinner porque no
 * hay nada que cargar.
 */
export function RitmoTrophyList({
  porDia,
  trofeos: trofeosDelMes,
}: {
  porDia: DesgloseMes["porDia"];
  trofeos: TrofeoDelMes[];
}) {
  const t = useTranslations("Analitica.ritmoPage");
  const [dia, setDia] = useState<string | null>(null);
  const [vista, setVista] = useState<"lista" | "cuadricula">("lista");

  const maxDia = Math.max(...porDia.map((d) => d.total), 1);
  const trofeos = useMemo(
    () => (dia ? trofeosDelMes.filter((tr) => tr.earnedAt.startsWith(dia)) : trofeosDelMes),
    [dia, trofeosDelMes],
  );

  return (
    <>
      <section
        className="rounded-[18px] p-6"
        style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
            {t("dayByDay")}
          </h2>
          {dia && (
            <button
              onClick={() => setDia(null)}
              className="text-[0.6875rem] font-bold uppercase tracking-[0.03em] text-accent hover:underline"
            >
              {t("clearDayFilter")}
            </button>
          )}
        </div>
        <div className="flex h-[90px] items-end gap-[3px]">
          {porDia.map((d) => {
            const activo = d.dia === dia;
            const barra = (
              <span
                className="block rounded-t-[3px] transition-all"
                style={{
                  height: d.total === 0 ? 2 : `max(3px, ${Math.round((d.total / maxDia) * 100)}%)`,
                  background: d.total === 0 ? "var(--border)" : activo ? "var(--accent)" : "rgb(var(--accent-rgb) / 0.55)",
                  boxShadow: activo ? "0 0 10px rgb(var(--accent-rgb) / 0.6)" : undefined,
                }}
              />
            );
            return (
              <div key={d.dia} className="group relative flex h-full flex-1 flex-col justify-end">
                {d.total > 0 ? (
                  <button
                    onClick={() => setDia(activo ? null : d.dia)}
                    className="flex h-full w-full flex-col justify-end"
                    aria-label={t("dayTooltip", { dia: Number(d.dia.slice(8)), total: d.total })}
                    aria-pressed={activo}
                  >
                    {barra}
                  </button>
                ) : (
                  barra
                )}
                <span
                  className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md px-2 py-1 text-[0.6875rem] group-hover:block"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
                >
                  {t("dayTooltip", { dia: Number(d.dia.slice(8)), total: d.total })}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-1.5 flex justify-between text-[0.625rem] text-muted">
          <span>1</span>
          <span>{porDia.length}</span>
        </div>
      </section>

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
    </>
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
