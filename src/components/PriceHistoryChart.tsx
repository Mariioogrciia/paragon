"use client";

import { useMemo, useState } from "react";
import type { PuntoPrecio } from "@/lib/itad";

/**
 * Gráfico de precio a lo largo del tiempo, en SVG a mano (sin dependencia
 * nueva, mismo patrón que ActivityHeatmap). Los datos vienen de
 * historicoPreciosSteam() (lib/itad.ts) — varias tiendas pueden cambiar de
 * precio el mismo día, así que aquí se colapsa a "el más barato de todas
 * las tiendas en cada fecha", que es lo que de verdad interesa para ver la
 * evolución (no una línea por tienda, ilegible con muchas tiendas).
 */

interface Props {
  puntos: PuntoPrecio[];
}

interface PuntoDia {
  fecha: string;
  precio: number;
  precioOriginal: number;
  tienda: string;
}

function colapsarPorDia(puntos: PuntoPrecio[]): PuntoDia[] {
  const porDia = new Map<string, PuntoDia>();
  for (const p of puntos) {
    const dia = p.fecha.slice(0, 10);
    const actual = porDia.get(dia);
    if (!actual || p.precio < actual.precio) {
      porDia.set(dia, { fecha: dia, precio: p.precio, precioOriginal: p.precioOriginal, tienda: p.tienda });
    }
  }
  return Array.from(porDia.values()).sort((a, b) => a.fecha.localeCompare(b.fecha));
}

const WIDTH = 720;
const HEIGHT = 220;
const PAD_L = 44;
const PAD_R = 12;
const PAD_T = 16;
const PAD_B = 28;

export function PriceHistoryChart({ puntos }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const dias = useMemo(() => colapsarPorDia(puntos), [puntos]);

  if (dias.length < 2) {
    return (
      <p className="rounded-xl border border-border bg-surface px-4 py-6 text-center text-sm text-muted">
        Todavía no hay suficiente histórico de precio guardado para este juego.
      </p>
    );
  }

  const precios = dias.map((d) => d.precio);
  const min = Math.min(...precios);
  const max = Math.max(...precios);
  const rango = max - min || 1;
  const innerW = WIDTH - PAD_L - PAD_R;
  const innerH = HEIGHT - PAD_T - PAD_B;

  const x = (i: number) => PAD_L + (i / (dias.length - 1)) * innerW;
  const y = (precio: number) => PAD_T + innerH - ((precio - min) / rango) * innerH;

  const linea = dias.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(d.precio).toFixed(1)}`).join(" ");
  const area = `${linea} L ${x(dias.length - 1).toFixed(1)} ${(PAD_T + innerH).toFixed(1)} L ${PAD_L} ${(PAD_T + innerH).toFixed(1)} Z`;

  const activo = hover != null ? dias[hover] : null;
  const formatoFecha = (iso: string) =>
    new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const relX = ((e.clientX - rect.left) / rect.width) * WIDTH;
          const idx = Math.round(((relX - PAD_L) / innerW) * (dias.length - 1));
          setHover(Math.min(Math.max(idx, 0), dias.length - 1));
        }}
      >
        {/* líneas guía horizontales: min y max */}
        <line x1={PAD_L} y1={y(min)} x2={WIDTH - PAD_R} y2={y(min)} stroke="var(--border)" strokeWidth={1} strokeDasharray="3 3" />
        <line x1={PAD_L} y1={y(max)} x2={WIDTH - PAD_R} y2={y(max)} stroke="var(--border)" strokeWidth={1} strokeDasharray="3 3" />
        <text x={PAD_L - 6} y={y(min) + 4} textAnchor="end" fontSize={10} fill="var(--muted)">
          {min.toFixed(2)} €
        </text>
        <text x={PAD_L - 6} y={y(max) + 4} textAnchor="end" fontSize={10} fill="var(--muted)">
          {max.toFixed(2)} €
        </text>

        <defs>
          <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.25} />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#priceFill)" />
        <path d={linea} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {hover != null && (
          <>
            <line x1={x(hover)} y1={PAD_T} x2={x(hover)} y2={PAD_T + innerH} stroke="var(--border)" strokeWidth={1} />
            <circle cx={x(hover)} cy={y(dias[hover].precio)} r={4} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} />
          </>
        )}

        <text x={PAD_L} y={HEIGHT - 8} fontSize={10} fill="var(--muted)">
          {formatoFecha(dias[0].fecha)}
        </text>
        <text x={WIDTH - PAD_R} y={HEIGHT - 8} textAnchor="end" fontSize={10} fill="var(--muted)">
          {formatoFecha(dias[dias.length - 1].fecha)}
        </text>
      </svg>

      {activo && (
        <div
          className="pointer-events-none absolute top-2 rounded-lg px-3 py-2 text-xs shadow-lg"
          style={{
            left: `${Math.min(Math.max((hover! / (dias.length - 1)) * 100, 8), 92)}%`,
            transform: "translateX(-50%)",
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
          }}
        >
          <div className="font-bold">{formatoFecha(activo.fecha)}</div>
          <div className="text-muted">
            {activo.precio.toFixed(2)} € · {activo.tienda}
          </div>
        </div>
      )}
    </div>
  );
}
