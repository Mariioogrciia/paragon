"use client";

import { useMemo, useState } from "react";
import { CustomSelect } from "@/components/ui/CustomSelect";
import type { PuntoPrecio } from "@/lib/itad";

/**
 * Gráfico de precio a lo largo del tiempo, en SVG a mano (sin dependencia
 * nueva, mismo patrón que ActivityHeatmap). Los datos vienen de
 * historicoPreciosSteam() (lib/itad.ts), que trae el precio por TIENDA (PC:
 * Steam, GOG, Epic, Humble...) — nunca por consola, ninguna API pública lo
 * da para PSN/Xbox/Switch, comprobado y documentado en HANDOFF.md. Por
 * defecto se colapsa a "el más barato de todas las tiendas en cada fecha";
 * el selector de tienda deja fijar una sola línea en vez de la envolvente.
 *
 * Selector de rango (7D/1M/3M/1A/Todo), como un gráfico de precio de
 * cripto: no cambia la fuente de datos, solo qué ventana de los mismos
 * puntos diarios se pinta y con qué granularidad se leen las fechas del eje
 * (día para ventanas cortas, mes o año para las largas).
 *
 * `compact`: vive en la columna derecha de la ficha de juego (300px), no en
 * el cuerpo ancho — el viewBox por defecto (720×220, muy panorámico) se
 * quedaba aplastado ahí. En compacto cambia a un aspecto más cuadrado y
 * enseña menos marcas de fecha, no es solo una reducción de escala.
 */

interface Props {
  puntos: PuntoPrecio[];
  compact?: boolean;
}

const TODAS_LAS_TIENDAS = "__todas__";

interface PuntoDia {
  fecha: string; // YYYY-MM-DD
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

type RangoKey = "7d" | "1m" | "3m" | "1a" | "todo";

const RANGOS: { key: RangoKey; label: string; dias: number | null }[] = [
  { key: "7d", label: "7D", dias: 7 },
  { key: "1m", label: "1M", dias: 30 },
  { key: "3m", label: "3M", dias: 90 },
  { key: "1a", label: "1A", dias: 365 },
  { key: "todo", label: "Todo", dias: null },
];

const MS_DIA = 86_400_000;

export function PriceHistoryChart({ puntos, compact = false }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const [rango, setRango] = useState<RangoKey>("3m");
  const [tienda, setTienda] = useState<string>(TODAS_LAS_TIENDAS);

  // Tiendas presentes en los datos de verdad — nunca una lista fija a mano,
  // que se desincroniza en cuanto ITAD añada o quite una.
  const tiendas = useMemo(() => Array.from(new Set(puntos.map((p) => p.tienda))).sort(), [puntos]);

  const puntosTienda = useMemo(
    () => (tienda === TODAS_LAS_TIENDAS ? puntos : puntos.filter((p) => p.tienda === tienda)),
    [puntos, tienda],
  );
  const todos = useMemo(() => colapsarPorDia(puntosTienda), [puntosTienda]);

  const dias = useMemo(() => {
    const spec = RANGOS.find((r) => r.key === rango)!;
    if (spec.dias == null || todos.length === 0) return todos;
    const ultimaFecha = new Date(todos[todos.length - 1].fecha).getTime();
    const corte = ultimaFecha - spec.dias * MS_DIA;
    const filtrados = todos.filter((d) => new Date(d.fecha).getTime() >= corte);
    // Si el rango corto se queda con menos de 2 puntos (el precio no cambió
    // en esa ventana), mejor enseñar todo el histórico que un gráfico vacío.
    return filtrados.length >= 2 ? filtrados : todos;
  }, [todos, rango]);

  const selectorTienda = tiendas.length > 1 && (
    <CustomSelect
      value={tienda}
      onChange={setTienda}
      options={[{ value: TODAS_LAS_TIENDAS, label: "Más barata (todas)" }, ...tiendas.map((t) => ({ value: t, label: t }))]}
    />
  );

  if (todos.length < 2) {
    return (
      <div>
        {selectorTienda && <div className="mb-3">{selectorTienda}</div>}
        <p className="rounded-xl border border-border bg-surface px-4 py-6 text-center text-sm text-muted">
          {tienda === TODAS_LAS_TIENDAS
            ? "Todavía no hay suficiente histórico de precio guardado para este juego."
            : "Esta tienda no tiene suficiente histórico propio — prueba con \"Más barata (todas)\"."}
        </p>
      </div>
    );
  }

  // Panorámico en el cuerpo ancho de la ficha; más cuadrado en la columna
  // estrecha de 300px, con menos aire de márgenes y menos marcas en el eje.
  const WIDTH = compact ? 280 : 720;
  const HEIGHT = compact ? 190 : 220;
  const PAD_L = compact ? 34 : 44;
  const PAD_R = compact ? 6 : 12;
  const PAD_T = compact ? 12 : 16;
  const PAD_B = compact ? 18 : 28;
  const FONT = compact ? 9 : 10;
  const N_TICKS = compact ? 3 : 5;

  const precios = dias.map((d) => d.precio);
  const min = Math.min(...precios);
  const max = Math.max(...precios);
  const rangoY = max - min || 1;
  const innerW = WIDTH - PAD_L - PAD_R;
  const innerH = HEIGHT - PAD_T - PAD_B;

  const x = (i: number) => (dias.length === 1 ? PAD_L + innerW / 2 : PAD_L + (i / (dias.length - 1)) * innerW);
  const y = (precio: number) => PAD_T + innerH - ((precio - min) / rangoY) * innerH;

  const linea = dias.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(d.precio).toFixed(1)}`).join(" ");
  const area = `${linea} L ${x(dias.length - 1).toFixed(1)} ${(PAD_T + innerH).toFixed(1)} L ${PAD_L} ${(PAD_T + innerH).toFixed(1)} Z`;

  const activo = hover != null ? dias[hover] : null;

  // Granularidad del eje: día para ventanas cortas, mes para medias, año
  // para "Todo" cuando de verdad abarca más de un año — igual que cualquier
  // gráfico de precio con selector de rango.
  const spanDias = (new Date(dias[dias.length - 1].fecha).getTime() - new Date(dias[0].fecha).getTime()) / MS_DIA;
  const formatoFecha = (iso: string) => {
    const d = new Date(iso);
    if (spanDias > 540) return d.toLocaleDateString("es-ES", { year: "numeric" });
    if (spanDias > 60) return d.toLocaleDateString("es-ES", { month: "short", year: "2-digit" });
    return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
  };
  const formatoTooltip = (iso: string) =>
    new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });

  const nTicks = Math.min(N_TICKS, dias.length);
  const ticks = Array.from({ length: nTicks }, (_, i) => {
    const idx = nTicks === 1 ? 0 : Math.round((i / (nTicks - 1)) * (dias.length - 1));
    return { idx, fecha: dias[idx].fecha };
  });

  // Compartida entre ratón y dedo: antes solo `onMouseMove` leía el
  // gráfico, así que en móvil (sin ratón) el día/tienda de cada punto era
  // simplemente inalcanzable — el resplandor de detalle existía pero no
  // había forma de encenderlo. `onTouchStart`/`onTouchMove` no llaman a
  // `preventDefault`, así que el scroll vertical de la página se sigue
  // pudiendo hacer con el mismo gesto, a costa de que la tira también se
  // actualice mientras tanto — el mismo compromiso que cualquier gráfico
  // con tooltip táctil.
  const actualizarHover = (clientX: number, rect: DOMRect) => {
    const relX = ((clientX - rect.left) / rect.width) * WIDTH;
    const idx = Math.round(((relX - PAD_L) / innerW) * (dias.length - 1));
    setHover(Math.min(Math.max(idx, 0), dias.length - 1));
  };

  return (
    <div>
      <div className={`mb-3 flex flex-wrap items-center gap-2 ${compact ? "flex-col items-stretch" : "justify-between"}`}>
        {selectorTienda && <div className={compact ? "" : "w-44 shrink-0"}>{selectorTienda}</div>}
        <div className={`flex flex-wrap gap-1 ${compact ? "" : "justify-end"}`}>
        {RANGOS.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => setRango(r.key)}
            aria-pressed={rango === r.key}
            className={`rounded-md font-bold uppercase tracking-wide transition-colors ${compact ? "px-1.5 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"}`}
            style={
              rango === r.key
                ? { background: "rgb(var(--accent-rgb) / 0.16)", color: "var(--accent-text)" }
                : { background: "transparent", color: "var(--muted)" }
            }
          >
            {r.label}
          </button>
        ))}
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full"
          role="img"
          aria-label={`Evolución del precio: de ${dias[0].precio.toFixed(2)} € a ${dias[dias.length - 1].precio.toFixed(2)} €, entre ${formatoTooltip(dias[0].fecha)} y ${formatoTooltip(dias[dias.length - 1].fecha)}. Mínimo ${min.toFixed(2)} €, máximo ${max.toFixed(2)} €.`}
          onMouseLeave={() => setHover(null)}
          onMouseMove={(e) => actualizarHover(e.clientX, e.currentTarget.getBoundingClientRect())}
          onTouchStart={(e) => {
            const t = e.touches[0];
            if (t) actualizarHover(t.clientX, e.currentTarget.getBoundingClientRect());
          }}
          onTouchMove={(e) => {
            const t = e.touches[0];
            if (t) actualizarHover(t.clientX, e.currentTarget.getBoundingClientRect());
          }}
        >
          {/* líneas guía horizontales: min y max */}
          <line x1={PAD_L} y1={y(min)} x2={WIDTH - PAD_R} y2={y(min)} stroke="var(--border)" strokeWidth={1} strokeDasharray="3 3" />
          <line x1={PAD_L} y1={y(max)} x2={WIDTH - PAD_R} y2={y(max)} stroke="var(--border)" strokeWidth={1} strokeDasharray="3 3" />
          <text x={PAD_L - 6} y={y(min) + 4} textAnchor="end" fontSize={FONT} fill="var(--muted)">
            {min.toFixed(2)} €
          </text>
          <text x={PAD_L - 6} y={y(max) + 4} textAnchor="end" fontSize={FONT} fill="var(--muted)">
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

          {ticks.map((t, i) => (
            <text
              key={t.fecha}
              x={x(t.idx)}
              y={HEIGHT - 6}
              textAnchor={i === 0 ? "start" : i === ticks.length - 1 ? "end" : "middle"}
              fontSize={FONT}
              fill="var(--muted)"
            >
              {formatoFecha(t.fecha)}
            </text>
          ))}
        </svg>

        {activo && (
          <div
            className="pointer-events-none absolute top-2 rounded-lg px-3 py-2 text-xs shadow-lg"
            style={{
              left: `${Math.min(Math.max((hover! / Math.max(dias.length - 1, 1)) * 100, 8), 92)}%`,
              transform: "translateX(-50%)",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
            }}
          >
            <div className="font-bold">{formatoTooltip(activo.fecha)}</div>
            <div className="text-muted">
              {activo.precio.toFixed(2)} € · {activo.tienda}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
