/* eslint-disable @next/next/no-img-element -- carátulas de CDNs externos (PSN, Steam, Xbox...), como en el resto de la web: next/image gastaría la cuota de optimización del plan Hobby */
import { coverGradient } from "@/lib/design";
import { TrophyIcon } from "@/components/TrophyIcon";
import type { WrapAnual } from "@/lib/wrapAnual";

/**
 * Las piezas visuales del Wrap (21 oct 2026), compartidas por las tarjetas
 * del perfil (`ParagonWrap`) y las historias a pantalla completa
 * (`WrapStories`). Sin hooks: valen en servidor y en cliente.
 *
 * Siempre sobre fondo oscuro (el Wrap es un póster, ver ParagonWrap).
 * Criterios de la guía de visualización: barras finas con el extremo
 * redondeado y la base recta, una sola serie en el mes a mes (destacado el
 * mejor mes y rotulado solo ese), y en los metales cada tramo lleva su
 * icono y su cifra al lado, nunca solo el color.
 */

/** Colores de metal (los de la app) y un gris azulado para los logros sin metal (Steam/Xbox). */
export const COLOR_METAL = {
  platinum: "var(--platinum)",
  gold: "var(--gold)",
  silver: "var(--silver)",
  bronze: "var(--bronze)",
  otros: "#7d8bb5",
} as const;

const ORDEN_METALES = ["platinum", "gold", "silver", "bronze", "otros"] as const;

/** El mejor mes del año; con empate, el más reciente. Lo usan la gráfica y el texto, para que digan lo mismo. */
export function mejorMesDe(porMes: WrapAnual["porMes"]): { mes: number; total: number } | null {
  let mejor: { mes: number; total: number } | null = null;
  for (const m of porMes) if (m.total > 0 && (!mejor || m.total >= mejor.total)) mejor = m;
  return mejor;
}

/** Mes a mes del año: columnas finas, el mejor mes en el acento lleno y rotulado. */
export function BarrasMeses({
  porMes,
  locale,
  etiqueta,
  alto = 120,
  animar = false,
}: {
  porMes: WrapAnual["porMes"];
  locale: string;
  /** Texto del tooltip/lector de pantalla: recibe el mes y el total. */
  etiqueta: (mes: string, total: number) => string;
  alto?: number;
  animar?: boolean;
}) {
  const max = Math.max(1, ...porMes.map((m) => m.total));
  const mejor = mejorMesDe(porMes);
  const corto = new Intl.DateTimeFormat(locale, { month: "narrow" });
  const largo = new Intl.DateTimeFormat(locale, { month: "long" });
  const nombre = (mes: number) => largo.format(new Date(2026, mes - 1, 1));

  return (
    <div role="img" aria-label={porMes.map((m) => etiqueta(nombre(m.mes), m.total)).join(", ")}>
      <div className="flex items-end gap-[2px] pt-5" style={{ height: alto }}>
        {porMes.map((m, i) => {
          const esMejor = mejor !== null && m.mes === mejor.mes;
          const pct = m.total === 0 ? 0 : Math.max(4, (m.total / max) * 100);
          return (
            <div key={m.mes} className="group relative flex h-full flex-1 flex-col items-center justify-end" title={etiqueta(nombre(m.mes), m.total)}>
              {/* La cifra del mejor mes va encima de la barra sin ocupar sitio
                  en la columna: si ocupara, encogería justo la barra más alta. */}
              {esMejor && (
                <span className="absolute left-1/2 -translate-x-1/2 text-[0.6875rem] font-bold tabular-nums text-white" style={{ bottom: `calc(${pct}% + 4px)` }}>
                  {m.total}
                </span>
              )}
              <div
                className={`w-full max-w-[24px] rounded-t-[4px] ${animar ? "wrap-barra" : ""}`}
                style={{
                  height: `${pct}%`,
                  minHeight: m.total > 0 ? 3 : 0,
                  background: esMejor ? "rgb(var(--accent-rgb))" : "rgb(var(--accent-rgb) / 0.42)",
                  animationDelay: animar ? `${i * 45}ms` : undefined,
                }}
              />
              <div className="h-px w-full bg-white/15" />
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-[2px]">
        {porMes.map((m) => (
          <span key={m.mes} className="flex-1 text-center text-[0.625rem] font-semibold uppercase text-white/50">
            {corto.format(new Date(2026, m.mes - 1, 1))}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Reparto por metales: barra apilada con 2px de hueco y, debajo, icono + cifra de cada metal. */
export function BarraMetales({
  porMetal,
  etiquetaOtros,
  grosor = 10,
}: {
  porMetal: WrapAnual["porMetal"];
  etiquetaOtros: string;
  grosor?: number;
}) {
  const total = ORDEN_METALES.reduce((s, k) => s + porMetal[k], 0);
  if (total === 0) return null;
  const presentes = ORDEN_METALES.filter((k) => porMetal[k] > 0);
  return (
    <div>
      <div className="flex w-full gap-[2px] overflow-hidden rounded-[4px]" style={{ height: grosor }}>
        {presentes.map((k) => (
          <div key={k} style={{ flexGrow: porMetal[k], background: COLOR_METAL[k] }} title={`${porMetal[k]}`} />
        ))}
      </div>
      <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
        {presentes.map((k) => (
          <li key={k} className="flex items-center gap-1.5 text-xs font-semibold text-white/85">
            {k === "otros" ? (
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: COLOR_METAL.otros }} aria-hidden="true" />
            ) : (
              <TrophyIcon grade={k} size={16} />
            )}
            <span className="tabular-nums">{porMetal[k].toLocaleString()}</span>
            {k === "otros" && <span className="text-white/55">{etiquetaOtros}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Carátula cuadrada; sin imagen, el degradado del juego (el mismo de toda la app). */
export function Caratula({ gameId, iconUrl, titulo, className = "" }: { gameId: string; iconUrl: string | null; titulo: string; className?: string }) {
  return (
    <div className={`${/\babsolute\b/.test(className) ? "" : "relative"} overflow-hidden ${className}`} style={{ background: coverGradient(gameId) }}>
      {iconUrl && <img src={iconUrl} alt={titulo} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />}
    </div>
  );
}

/** Barras horizontales de una sola serie (top de juegos, géneros), con la cifra al final de cada una. */
export function BarrasHorizontales({ filas }: { filas: { clave: string; etiqueta: React.ReactNode; valor: number }[] }) {
  const max = Math.max(1, ...filas.map((f) => f.valor));
  return (
    <ul className="flex flex-col gap-2.5">
      {filas.map((f) => (
        <li key={f.clave} className="min-w-0">
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-semibold text-white">{f.etiqueta}</span>
            <span className="shrink-0 font-bold tabular-nums text-white/80">{f.valor.toLocaleString()}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/10">
            <div className="h-full rounded-full" style={{ width: `${Math.max(3, (f.valor / max) * 100)}%`, background: "rgb(var(--accent-rgb))" }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
