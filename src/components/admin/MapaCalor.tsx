"use client";

import { useState } from "react";

/**
 * Mapa de calor día de la semana × hora (22 oct 2026) para "¿cuándo se usa
 * Paragon?". Una sola magnitud, así que una sola tonalidad (el acento) de
 * más clara a más intensa; las celdas vacías quedan en el fondo. Al pasar
 * el ratón, la cifra exacta arriba; debajo, la tabla para quien no ve el
 * color. La hora es la de Madrid.
 */
export function MapaCalor({
  titulo,
  datos,
  dias,
  unidad,
  locale,
  textoTabla,
  textoHora,
}: {
  titulo: string;
  /** [día 0 = lunes][hora 0-23] */
  datos: number[][];
  /** Nombres cortos de los días, empezando en lunes. */
  dias: string[];
  unidad: string;
  locale: string;
  textoTabla: string;
  textoHora: string;
}) {
  const [hover, setHover] = useState<[number, number] | null>(null);
  const max = Math.max(1, ...datos.flat());
  const total = datos.flat().reduce((s, v) => s + v, 0);
  const porHora = Array.from({ length: 24 }, (_, h) => datos.reduce((s, fila) => s + fila[h], 0));
  const horaPunta = porHora.indexOf(Math.max(...porHora));
  const num = (v: number) => v.toLocaleString(locale);
  const valor = hover ? datos[hover[0]][hover[1]] : null;

  return (
    <figure className="min-w-0">
      <figcaption className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-bold">{titulo}</span>
        <span className="text-xs tabular-nums text-muted">
          {hover && valor !== null
            ? `${dias[hover[0]]} ${String(hover[1]).padStart(2, "0")}:00 · ${num(valor)} ${unidad}`
            : total > 0
              ? textoHora.replace("{h}", `${String(horaPunta).padStart(2, "0")}:00`)
              : `0 ${unidad}`}
        </span>
      </figcaption>
      <div className="overflow-x-auto">
        <div className="grid min-w-[520px] gap-[3px]" style={{ gridTemplateColumns: "28px repeat(24, minmax(0, 1fr))" }} onPointerLeave={() => setHover(null)}>
          {datos.map((fila, d) => (
            <div key={d} className="contents">
              <span className="self-center text-[0.6875rem] font-semibold text-muted">{dias[d]}</span>
              {fila.map((v, h) => (
                <span
                  key={h}
                  className="h-5 rounded-[3px]"
                  style={{
                    background: v === 0 ? "var(--surface-2)" : `rgb(var(--accent-rgb) / ${0.18 + 0.82 * (v / max)})`,
                    outline: hover && hover[0] === d && hover[1] === h ? "2px solid var(--foreground)" : undefined,
                  }}
                  onPointerEnter={() => setHover([d, h])}
                  aria-hidden="true"
                />
              ))}
            </div>
          ))}
          <span />
          {Array.from({ length: 24 }, (_, h) => (
            <span key={h} className="text-center text-[0.625rem] tabular-nums text-muted">
              {h % 6 === 0 ? h : ""}
            </span>
          ))}
        </div>
      </div>
      <details className="mt-2 text-xs text-muted">
        <summary className="cursor-pointer select-none hover:text-foreground">{textoTabla}</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full tabular-nums">
            <tbody>
              {datos.map((fila, d) => (
                <tr key={d} className="border-b border-border/50">
                  <th className="py-1 pr-2 text-left font-semibold">{dias[d]}</th>
                  {fila.map((v, h) => (
                    <td key={h} className="px-0.5 py-1 text-center" title={`${String(h).padStart(2, "0")}:00`}>
                      {v || "·"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
