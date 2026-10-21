"use client";

import { useState } from "react";

/**
 * Gráfico circular (donut) de Admin → Analítica (22 oct 2026), para "qué
 * parte del total es cada cosa" con pocas categorías. Criterios de la guía
 * de visualización: como mucho 5 porciones con color y el resto juntas en
 * "Otros" en gris; colores categóricos en orden fijo (--cat-1..5, validados
 * para daltonismo); 2px de hueco entre porciones; la leyenda siempre lleva
 * nombre, cifra y porcentaje, así que el color nunca va solo. Al pasar el
 * ratón por una porción o una fila, se resalta y el centro dice su cifra.
 */

export interface PorcionDonut {
  etiqueta: string;
  valor: number;
  /** Un icono o bandera delante del nombre. */
  icono?: string;
}

const MAX_PORCIONES = 5;
const R = 62;
const GROSOR = 20;
const C = 2 * Math.PI * R;

export function Donut({
  titulo,
  datos,
  unidad,
  locale,
  etiquetaOtros,
  vacio,
}: {
  titulo: string;
  datos: PorcionDonut[];
  unidad: string;
  locale: string;
  etiquetaOtros: string;
  vacio: string;
}) {
  const [activa, setActiva] = useState<number | null>(null);
  const ordenados = [...datos].filter((d) => d.valor > 0).sort((a, b) => b.valor - a.valor);
  const porciones =
    ordenados.length > MAX_PORCIONES + 1
      ? [...ordenados.slice(0, MAX_PORCIONES), { etiqueta: etiquetaOtros, valor: ordenados.slice(MAX_PORCIONES).reduce((s, d) => s + d.valor, 0) }]
      : ordenados;
  const total = porciones.reduce((s, d) => s + d.valor, 0);
  const color = (i: number) => (porciones[i].etiqueta === etiquetaOtros && i === MAX_PORCIONES ? "var(--cat-otros)" : `var(--cat-${Math.min(i + 1, 5)})`);
  const pct = (v: number) => (total > 0 ? Math.round((v / total) * 100) : 0);
  const num = (v: number) => v.toLocaleString(locale);

  // Una sola categoría o ninguna: un donut no dice nada.
  if (porciones.length < 2) {
    return (
      <figure className="min-w-0">
        <figcaption className="mb-3 text-sm font-bold">{titulo}</figcaption>
        <p className="text-sm text-muted">
          {porciones.length === 1 ? `${porciones[0].icono ?? ""} ${porciones[0].etiqueta} · ${num(porciones[0].valor)} ${unidad} (100%)` : vacio}
        </p>
      </figure>
    );
  }

  // Dónde empieza cada porción en el aro (suma de las anteriores).
  const inicios = porciones.map((_, i) => porciones.slice(0, i).reduce((s, d) => s + (d.valor / total) * C, 0));
  const sel = activa !== null ? porciones[activa] : null;

  return (
    <figure className="min-w-0">
      <figcaption className="mb-3 text-sm font-bold">{titulo}</figcaption>
      <div className="flex flex-wrap items-center gap-5">
        <svg
          viewBox="0 0 160 160"
          className="h-36 w-36 shrink-0 -rotate-90"
          role="img"
          aria-label={`${titulo}: ${porciones.map((p) => `${p.etiqueta} ${pct(p.valor)}%`).join(", ")}`}
          onPointerLeave={() => setActiva(null)}
        >
          {porciones.map((p, i) => {
            const largo = (p.valor / total) * C;
            const hueco = Math.min(2, largo / 2);
            const inicio = inicios[i];
            return (
              <circle
                key={p.etiqueta}
                cx="80"
                cy="80"
                r={R}
                fill="none"
                stroke={color(i)}
                strokeWidth={activa === i ? GROSOR + 4 : GROSOR}
                strokeDasharray={`${Math.max(0.5, largo - hueco)} ${C}`}
                strokeDashoffset={-inicio}
                opacity={activa === null || activa === i ? 1 : 0.35}
                style={{ transition: "opacity 150ms, stroke-width 150ms" }}
                onPointerEnter={() => setActiva(i)}
              />
            );
          })}
          <g className="rotate-90" style={{ transformOrigin: "80px 80px" }} pointerEvents="none">
            <text x="80" y="78" textAnchor="middle" fontSize="22" fontWeight="700" fill="var(--foreground)" className="tabular-nums">
              {sel ? `${pct(sel.valor)}%` : num(total)}
            </text>
            <text x="80" y="98" textAnchor="middle" fontSize="11" fill="var(--muted)">
              {sel ? (sel.etiqueta.length > 16 ? `${sel.etiqueta.slice(0, 15)}…` : sel.etiqueta) : unidad}
            </text>
          </g>
        </svg>
        <ul className="flex min-w-[150px] flex-1 flex-col gap-1.5 text-[0.8125rem]" onPointerLeave={() => setActiva(null)}>
          {porciones.map((p, i) => (
            <li
              key={p.etiqueta}
              className={`flex items-center gap-2 rounded-md px-1.5 py-0.5 transition-colors ${activa === i ? "bg-[var(--surface-2)]" : ""}`}
              onPointerEnter={() => setActiva(i)}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: color(i) }} aria-hidden="true" />
              <span className="min-w-0 flex-1 leading-tight [overflow-wrap:anywhere]">
                {p.icono && <span className="mr-1">{p.icono}</span>}
                {p.etiqueta}
              </span>
              <span className="shrink-0 font-semibold tabular-nums">{num(p.valor)}</span>
              <span className="w-9 shrink-0 text-right text-xs tabular-nums text-muted">{pct(p.valor)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </figure>
  );
}
