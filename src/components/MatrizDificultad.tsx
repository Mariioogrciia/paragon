"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { PuntoMatriz } from "@/lib/discover";

type Cuadrante = "facilCorto" | "facilLargo" | "dificilCorto" | "dificilLargo";

// Escalas logarítmicas: la rareza va de 20 % (fácil, izquierda) a 0,1 % (difícil,
// derecha; PSN no baja de 0,1 %) y las horas de 0,5 h (abajo) a 2000 h (arriba).
// Medido en la base (1 oct 2026): rareza del platino entre 0,1 % y 16 %, mediana 0,8 %.
const ejeX = (rareza: number) => {
  const max = Math.log10(20);
  return Math.min(1, Math.max(0, (max - Math.log10(Math.max(rareza, 0.1))) / (max - Math.log10(0.1))));
};
/** Desplazamiento fijo por juego (±1,5 %) para que los que comparten valor no se tapen. */
function desplazamiento(id: string, eje: number): number {
  let h = 2166136261 ^ eje;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return (((h >>> 0) % 1000) / 1000 - 0.5) * 3;
}
const ejeY = (horas: number) => {
  const min = Math.log10(0.5);
  const max = Math.log10(2000);
  return Math.min(1, Math.max(0, (Math.log10(Math.max(horas, 0.5)) - min) / (max - min)));
};
const cuadranteDe = (p: PuntoMatriz): Cuadrante =>
  `${ejeX(p.rareza) < 0.5 ? "facil" : "dificil"}${ejeY(p.horas) < 0.5 ? "Corto" : "Largo"}` as Cuadrante;

const POSICION: Record<Cuadrante, string> = {
  facilLargo: "left-3 top-3",
  dificilLargo: "right-3 top-3 text-right",
  facilCorto: "left-3 bottom-3",
  dificilCorto: "right-3 bottom-3 text-right",
};

/**
 * Descubrir: los juegos de la comunidad en un plano dificultad × horas para
 * elegir el próximo platino por el hueco que tengas. Tocar un cuadrante lista
 * sus juegos al lado.
 */
export function MatrizDificultad({ puntos }: { puntos: PuntoMatriz[] }) {
  const t = useTranslations("Descubrir.DescubrirPage.matriz");
  const locale = useLocale();
  const [elegido, setElegido] = useState<Cuadrante>("facilCorto");

  if (puntos.length < 10) return null;

  const lista = puntos
    .filter((p) => cuadranteDe(p) === elegido)
    .sort((a, b) => b.rareza - a.rareza)
    .slice(0, 12);
  const num = (n: number) => n.toLocaleString(locale, { maximumFractionDigits: n < 10 ? 1 : 0 });

  return (
    <section className="mt-16" aria-labelledby="matriz-titulo">
      <h2 id="matriz-titulo" className="font-heading text-[clamp(1.5rem,4vw,2.25rem)] font-bold uppercase leading-tight">
        {t("titulo")}
      </h2>
      <p className="mt-2 max-w-[60ch] text-sm text-muted">{t("descripcion")}</p>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          <div className="matriz-plano relative aspect-square overflow-hidden rounded-2xl border border-border sm:aspect-[16/10]">
            {(Object.keys(POSICION) as Cuadrante[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setElegido(c)}
                aria-pressed={elegido === c}
                className={`absolute z-20 rounded-lg px-2 py-1 text-[0.6875rem] font-bold uppercase tracking-wide transition-colors hover:bg-[var(--surface-2)] ${POSICION[c]}`}
                style={elegido === c ? { background: "var(--accent)", color: "var(--background)" } : { color: "var(--muted)" }}
              >
                {t(`cuadrantes.${c}`)}
              </button>
            ))}
            <span className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-[var(--border)]" aria-hidden="true" />
            <span className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-[var(--border)]" aria-hidden="true" />
            {puntos.map((p) => {
              const enElegido = cuadranteDe(p) === elegido;
              return (
                <Link
                  key={p.id}
                  href={`/juego/${p.id}`}
                  title={t("tooltip", { titulo: p.titulo, rareza: num(p.rareza), horas: num(p.horas) })}
                  className="matriz-punto absolute z-10 -translate-x-1/2 translate-y-1/2"
                  style={{ left: `${(4 + ejeX(p.rareza) * 92 + desplazamiento(p.id, 1)).toFixed(2)}%`, bottom: `${(4 + ejeY(p.horas) * 92 + desplazamiento(p.id, 2)).toFixed(2)}%`, opacity: enElegido ? 1 : 0.35 }}
                >
                  {p.icono ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.icono} alt="" loading="lazy" className="h-full w-full rounded-md object-cover" />
                  ) : (
                    <span className="block h-full w-full rounded-md bg-[var(--surface-2)]" />
                  )}
                </Link>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-[0.6875rem] font-semibold text-muted">
            <span>{t("ejeY")}</span>
            <span>{t("ejeX")}</span>
          </div>
        </div>

        <div className="min-w-0 rounded-2xl border border-border bg-[var(--surface)] p-4">
          <p className="font-heading text-sm font-bold uppercase tracking-wide">{t(`cuadrantes.${elegido}`)}</p>
          {lista.length === 0 ? (
            <p className="mt-3 text-sm text-muted">{t("vacio")}</p>
          ) : (
            <ul className="mt-3 grid gap-1">
              {lista.map((p) => (
                <li key={p.id}>
                  <Link href={`/juego/${p.id}`} className="flex items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-[var(--surface-2)]">
                    {p.icono ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.icono} alt="" loading="lazy" className="h-9 w-9 shrink-0 rounded-md object-cover" />
                    ) : (
                      <span className="h-9 w-9 shrink-0 rounded-md bg-[var(--surface-2)]" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{p.titulo}</span>
                      <span className="block text-xs text-muted">{t("fila", { rareza: num(p.rareza), horas: num(p.horas) })}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
