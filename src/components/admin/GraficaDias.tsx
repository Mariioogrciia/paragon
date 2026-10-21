"use client";

import { useId, useState } from "react";

/**
 * Gráfica de una serie por día para Admin → Analítica (21 oct 2026).
 * Criterios de la guía de visualización: una sola serie (el título dice qué
 * es, sin leyenda), en el color de acento; área al 10% o columnas finas con
 * el extremo redondeado; rejilla de 1px apagada; cifras con tokens de texto,
 * nunca en el color de la serie; al pasar el ratón, línea vertical y la
 * cifra del día; y la tabla de datos debajo, plegada, para quien no ve la
 * gráfica. Se adapta al tema (claro/oscuro) porque usa las variables de la app.
 */

export interface PuntoGrafica {
  dia: string;
  valor: number;
  /** Texto extra para el tooltip ("5 entradas"). */
  extra?: string;
}

const ANCHO = 640;
const MARGEN = { arriba: 12, derecha: 8, abajo: 22, izquierda: 34 };

function techoLimpio(max: number): number {
  if (max <= 4) return 4;
  const magnitud = 10 ** Math.floor(Math.log10(max));
  for (const paso of [1, 2, 2.5, 5, 10]) if (paso * magnitud >= max) return paso * magnitud;
  return 10 * magnitud;
}

function compacto(n: number, locale: string): string {
  return new Intl.NumberFormat(locale, { notation: n >= 10_000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(n);
}

export function GraficaDias({
  titulo,
  puntos,
  tipo = "area",
  unidad,
  locale,
  alto = 180,
  textoTabla,
}: {
  titulo: string;
  puntos: PuntoGrafica[];
  tipo?: "area" | "columnas";
  /** "vistas", "personas"... para el tooltip. */
  unidad: string;
  locale: string;
  alto?: number;
  textoTabla: string;
}) {
  const idGrad = useId();
  const [hover, setHover] = useState<number | null>(null);
  const n = puntos.length;
  const max = techoLimpio(Math.max(0, ...puntos.map((p) => p.valor)));
  const w = ANCHO - MARGEN.izquierda - MARGEN.derecha;
  const h = alto - MARGEN.arriba - MARGEN.abajo;
  const slot = w / Math.max(1, n);
  const x = (i: number) => MARGEN.izquierda + (tipo === "columnas" ? slot * i + slot / 2 : n === 1 ? w / 2 : (w * i) / (n - 1));
  const y = (v: number) => MARGEN.arriba + h - (v / max) * h;
  const fecha = (dia: string, opciones: Intl.DateTimeFormatOptions) => new Date(`${dia}T12:00:00`).toLocaleDateString(locale, opciones);
  const marcasX = n > 1 ? [0, Math.floor((n - 1) / 2), n - 1] : [0];

  function alMover(e: React.PointerEvent<SVGSVGElement>) {
    const caja = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - caja.left) / caja.width) * ANCHO;
    const i = tipo === "columnas" ? Math.floor((px - MARGEN.izquierda) / slot) : Math.round(((px - MARGEN.izquierda) / w) * (n - 1));
    setHover(i >= 0 && i < n ? i : null);
  }

  const linea = puntos.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(" ");
  const area = `${linea} L${x(n - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`;
  const ancho = Math.min(24, slot * 0.7);
  const total = puntos.reduce((s, p) => s + p.valor, 0);
  const activo = hover !== null ? puntos[hover] : null;

  return (
    <figure className="min-w-0">
      <figcaption className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-sm font-bold">{titulo}</span>
        <span className="text-xs tabular-nums text-muted">
          {activo ? `${fecha(activo.dia, { day: "numeric", month: "short" })} · ${activo.valor.toLocaleString(locale)} ${unidad}${activo.extra ? ` · ${activo.extra}` : ""}` : `${total.toLocaleString(locale)} ${unidad}`}
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${ANCHO} ${alto}`}
        className="w-full touch-none select-none"
        role="img"
        aria-label={`${titulo}: ${total.toLocaleString(locale)} ${unidad}`}
        onPointerMove={alMover}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={idGrad} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgb(var(--accent-rgb))" stopOpacity="0.18" />
            <stop offset="100%" stopColor="rgb(var(--accent-rgb))" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={MARGEN.izquierda} x2={ANCHO - MARGEN.derecha} y1={y(max * f)} y2={y(max * f)} stroke="var(--border)" strokeWidth={1} />
            <text x={MARGEN.izquierda - 6} y={y(max * f) + 4} textAnchor="end" fontSize={11} fill="var(--muted)">
              {compacto(max * f, locale)}
            </text>
          </g>
        ))}
        {marcasX.map((i) => (
          <text key={i} x={x(i)} y={alto - 6} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} fontSize={11} fill="var(--muted)">
            {fecha(puntos[i].dia, { day: "numeric", month: "short" })}
          </text>
        ))}
        {tipo === "area" ? (
          <>
            <path d={area} fill={`url(#${idGrad})`} />
            <path d={linea} fill="none" stroke="rgb(var(--accent-rgb))" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          </>
        ) : (
          puntos.map((p, i) => {
            if (p.valor === 0) return null;
            const alto0 = y(0) - y(p.valor);
            const r = Math.min(4, alto0 / 2, ancho / 2);
            const x0 = x(i) - ancho / 2;
            const y0 = y(p.valor);
            return (
              <path
                key={p.dia}
                d={`M${x0},${y(0)} V${y0 + r} Q${x0},${y0} ${x0 + r},${y0} H${x0 + ancho - r} Q${x0 + ancho},${y0} ${x0 + ancho},${y0 + r} V${y(0)} Z`}
                fill="rgb(var(--accent-rgb))"
                opacity={hover === null || hover === i ? 1 : 0.55}
              />
            );
          })
        )}
        {activo && hover !== null && (
          <g pointerEvents="none">
            <line x1={x(hover)} x2={x(hover)} y1={MARGEN.arriba} y2={y(0)} stroke="var(--muted)" strokeWidth={1} opacity={0.5} />
            {tipo === "area" && <circle cx={x(hover)} cy={y(activo.valor)} r={4.5} fill="rgb(var(--accent-rgb))" stroke="var(--background)" strokeWidth={2} />}
          </g>
        )}
      </svg>
      <details className="mt-1 text-xs text-muted">
        <summary className="cursor-pointer select-none hover:text-foreground">{textoTabla}</summary>
        <div className="mt-2 max-h-48 overflow-y-auto">
          <table className="w-full tabular-nums">
            <tbody>
              {[...puntos].reverse().map((p) => (
                <tr key={p.dia} className="border-b border-border/50">
                  <td className="py-1">{fecha(p.dia, { weekday: "short", day: "numeric", month: "short" })}</td>
                  <td className="py-1 text-right font-semibold text-foreground">{p.valor.toLocaleString(locale)}</td>
                  <td className="py-1 pl-3 text-right">{p.extra ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
