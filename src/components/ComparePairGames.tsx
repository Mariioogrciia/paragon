"use client";

import { useTranslations } from "next-intl";
import { coverGradient, monogram } from "@/lib/design";
import type { SharedGame } from "@/lib/stats";
import { FiltroJuegosComunes } from "@/components/FiltroJuegosComunes";

const OUTCOME_STYLE = {
  ganas: { bg: "rgba(78, 201, 138, 0.12)", fg: "#4ec98a", border: "rgba(78, 201, 138, 0.3)" },
  pierdes: { bg: "rgba(255, 107, 107, 0.12)", fg: "#ff8f8f", border: "rgba(255, 107, 107, 0.28)" },
  empate: { bg: "rgba(135, 148, 168, 0.12)", fg: "var(--muted)", border: "rgba(135, 148, 168, 0.25)" },
};

function outcome(a: number, b: number): keyof typeof OUTCOME_STYLE {
  if (a === b) return "empate";
  return a > b ? "ganas" : "pierdes";
}

/**
 * Filas de "Juegos en común" — antes vivía en `comparar/[handle]/page.tsx`
 * (Server Component) pasando una función como `children` a
 * `FiltroJuegosComunes` ("use client"): React no puede serializar una
 * función a través del límite servidor→cliente ("Functions cannot be
 * passed directly to Client Components"), así que la comparativa rompía
 * SIEMPRE que hubiera algún juego en común — el error real detrás del
 * "Algo se ha roto" que reportó el usuario. Mover el render-prop entero a
 * un Client Component propio arregla esto: la página del servidor solo le
 * pasa datos (planos, serializables), no una función.
 */
export function ComparePairGames({
  comunes,
  jugadores,
}: {
  comunes: SharedGame[];
  jugadores: { id: string; name: string }[];
}) {
  const t = useTranslations("Perfil");

  return (
    <FiltroJuegosComunes juegos={comunes} vacioMensaje={t("ComparePairGames.vacioMensaje")}>
      {(visibles) => (
        <div className="grid gap-2.5">
          {visibles.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-[52px_1fr] items-center gap-4 rounded-2xl p-4 sm:grid-cols-[52px_1fr_1.3fr_96px] sm:gap-5"
              style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
            >
              <span
                className="relative flex h-[52px] w-[52px] shrink-0 items-center justify-center overflow-hidden rounded-[13px]"
                style={{ background: coverGradient(row.title) }}
              >
                {row.iconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={row.iconUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <span className="font-heading text-[0.9375rem] font-bold text-white">{monogram(row.title)}</span>
                )}
              </span>

              <p className="col-span-1 truncate text-[0.9375rem] font-semibold">{row.title}</p>

              <div className="col-span-2 grid gap-2 sm:col-span-1">
                {row.progress.map((p, i) => (
                  <div key={jugadores[i].id} className="flex items-center gap-3">
                    <span
                      className="w-[52px] shrink-0 text-[0.6875rem] font-bold uppercase tracking-[0.06em]"
                      style={{ color: i === 0 ? "var(--accent-text)" : "var(--muted)" }}
                    >
                      {jugadores[i].name}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${p.percent}%`,
                          background: i === 0 ? "var(--accent-grad-h)" : "#4a5668",
                        }}
                      />
                    </div>
                    <span
                      className="w-16 shrink-0 text-right text-xs font-bold"
                      style={i === 1 ? { color: "var(--muted)" } : undefined}
                    >
                      {p.percent}%
                      {row.horas[i] !== undefined && (
                        <span className="ml-1 font-normal text-muted">{t("ComparePairGames.horasAbrev", { horas: row.horas[i]!.toFixed(0) })}</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>

              <span
                className="justify-self-end rounded-full px-[11px] py-1.5 text-[0.6875rem] font-bold uppercase tracking-[0.06em]"
                style={{
                  background: OUTCOME_STYLE[outcome(row.progress[0].percent, row.progress[1].percent)].bg,
                  color: OUTCOME_STYLE[outcome(row.progress[0].percent, row.progress[1].percent)].fg,
                  border: `1px solid ${OUTCOME_STYLE[outcome(row.progress[0].percent, row.progress[1].percent)].border}`,
                }}
              >
                {t(`ComparePairGames.outcome.${outcome(row.progress[0].percent, row.progress[1].percent)}`)}
              </span>
            </div>
          ))}
        </div>
      )}
    </FiltroJuegosComunes>
  );
}
