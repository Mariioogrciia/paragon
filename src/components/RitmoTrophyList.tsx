"use client";

import { useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { FilaLista, TarjetaCuadricula } from "@/components/TrophyList";
import { TrophyGuideModal } from "@/components/TrophyGuideModal";
import { TrophyTimeline } from "@/components/TrophyTimeline";
import { TrophyTree } from "@/components/TrophyTree";
import { SelectorVistaTrofeos, useVistaTrofeos } from "@/components/VistasTrofeos";
import type { DesgloseMes, TrofeoDelMes } from "@/lib/history";
import type { Trophy } from "@/lib/types";

/** Un trofeo del mes con la forma de los de la ficha del juego, para pintarlo con las mismas vistas. */
interface TrofeoMes {
  /** `gameId:trophyId`: el id de un trofeo solo es único dentro de su juego. */
  clave: string;
  gameId: string;
  juego: string;
  dia: string;
  trophy: Trophy;
}

function aTrofeoMes(tr: TrofeoDelMes): TrofeoMes {
  return {
    clave: `${tr.gameId}:${tr.trophyId}`,
    gameId: tr.gameId,
    juego: tr.juego,
    dia: tr.earnedAt.slice(0, 10),
    trophy: {
      id: tr.trophyId,
      name: tr.nombre,
      detail: tr.detalle,
      grade: tr.grade ?? undefined,
      earned: true,
      earnedAt: tr.earnedAt,
      rarityPercent: tr.rarityPercent ?? undefined,
      iconUrl: tr.iconUrl ?? undefined,
    },
  };
}

/**
 * Calendario del mes + trofeos de `/ritmo`, como un único componente
 * cliente: el filtro por día es estado local (todos los trofeos del mes ya
 * están en memoria), sin viaje al servidor.
 *
 * Los trofeos se ven con las MISMAS cuatro vistas que en la ficha de un
 * juego (components/VistasTrofeos.tsx), con sus mismas filas y tarjetas:
 * lista y cuadrícula agrupadas por día (como la ficha agrupa por DLC), árbol
 * uno por juego (su forma solo tiene sentido dentro de un juego) y la
 * cronología de todo el mes. Tocar un trofeo abre su guía, igual que allí.
 */
export function RitmoTrophyList({
  porDia,
  trofeos: trofeosDelMes,
}: {
  porDia: DesgloseMes["porDia"];
  trofeos: TrofeoDelMes[];
}) {
  const idioma = useLocale();
  const t = useTranslations("Analitica.ritmoPage");
  const [dia, setDia] = useState<string | null>(null);
  const [vista, setVista] = useVistaTrofeos();
  const [activo, setActivo] = useState<TrofeoMes | null>(null);

  const maxDia = Math.max(...porDia.map((d) => d.total), 1);
  const trofeos = useMemo(
    () => (dia ? trofeosDelMes.filter((tr) => tr.earnedAt.startsWith(dia)) : trofeosDelMes).map(aTrofeoMes),
    [dia, trofeosDelMes],
  );
  const porDiaAgrupado = useMemo(() => agrupar(trofeos, (m) => m.dia), [trofeos]);
  const porJuego = useMemo(() => agrupar(trofeos, (m) => m.gameId), [trofeos]);
  const fechaDia = (d: string) =>
    new Date(`${d}T12:00:00Z`).toLocaleDateString(idioma, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

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
          <SelectorVistaTrofeos vista={vista} onChange={setVista} />
        </div>

        {vista === "arbol" ? (
          <div className="space-y-6">
            {porJuego.map(([gameId, lista]) => (
              <div key={gameId}>
                <Cabecera titulo={lista[0].juego} total={lista.length} />
                <div className="overflow-hidden rounded-[20px] border border-[#1f2937] bg-[#0a0d14] shadow-lg">
                  <TrophyTree
                    trophies={lista.map((m) => m.trophy)}
                    onTrophyClick={(tr) => setActivo(lista.find((m) => m.trophy.id === tr.id) ?? null)}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : vista === "cronologia" ? (
          // Mezcla juegos: id compuesto para que dos "trofeo 1" de juegos distintos no choquen.
          <TrophyTimeline trophies={trofeos.map((m) => ({ ...m.trophy, id: m.clave }))} />
        ) : (
          <div className="space-y-8">
            {porDiaAgrupado.map(([d, lista]) => (
              <div key={d}>
                <Cabecera titulo={fechaDia(d)} total={lista.length} />
                {vista === "lista" ? (
                  <ul className="guia-lista">
                    {lista.map((m) => (
                      <FilaLista key={m.clave} trophy={m.trophy} juego={m.juego} atenuarHechos={false} onClick={() => setActivo(m)} />
                    ))}
                  </ul>
                ) : (
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-2 sm:gap-3">
                    {lista.map((m) => (
                      <TarjetaCuadricula key={m.clave} trophy={m.trophy} juego={m.juego} onClick={() => setActivo(m)} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {activo && (
        <TrophyGuideModal gameTitle={activo.juego} gameId={activo.gameId} trophy={activo.trophy} esMio onClose={() => setActivo(null)} />
      )}
    </>
  );
}

/** Misma cabecera que los grupos (juego base / DLC) de la ficha del juego. */
function Cabecera({ titulo, total }: { titulo: string; total: number }) {
  return (
    <h3 className="mb-3 flex items-baseline gap-3 border-b-2 border-[var(--border)] px-1 pb-2 font-heading text-lg font-bold uppercase tracking-wide">
      <span className="min-w-0 flex-1 truncate">{titulo}</span>
      <span className="carreras-cifra shrink-0 text-sm text-muted">{total}</span>
    </h3>
  );
}

/** Agrupa conservando el orden de llegada (los trofeos vienen del más reciente al más antiguo). */
function agrupar<T>(lista: T[], clave: (x: T) => string): [string, T[]][] {
  const grupos = new Map<string, T[]>();
  for (const x of lista) {
    const k = clave(x);
    const g = grupos.get(k);
    if (g) g.push(x);
    else grupos.set(k, [x]);
  }
  return [...grupos.entries()];
}
