/**
 * Gráficos sin interacción de Admin → Analítica (22 oct 2026): listas de
 * barras, embudo de activación, retención por semanas de alta y Web Vitals.
 * Componentes de servidor; los que necesitan el ratón están en Donut,
 * MapaCalor y GraficaDias. Una sola serie por gráfico, en el acento; las
 * cifras siempre escritas, nunca solo el color.
 */

export interface FilaBarra {
  clave: string;
  etiqueta: React.ReactNode;
  valor: number;
  /** Texto pequeño tras la cifra ("· 12 entradas"). */
  extra?: string;
}

/** Barras horizontales ordenadas, con la cifra y el % del total. */
export function BarrasLista({ filas, locale, vacio, porcentaje = true }: { filas: FilaBarra[]; locale: string; vacio: string; porcentaje?: boolean }) {
  if (filas.length === 0) return <p className="text-sm text-muted">{vacio}</p>;
  const max = Math.max(1, ...filas.map((f) => f.valor));
  const total = filas.reduce((s, f) => s + f.valor, 0);
  return (
    <ul className="flex flex-col gap-2.5">
      {filas.map((f) => (
        <li key={f.clave}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">{f.etiqueta}</span>
            <span className="shrink-0 font-semibold tabular-nums">
              {f.valor.toLocaleString(locale)}
              {porcentaje && total > 0 && <span className="ml-1.5 text-xs font-normal text-muted">{Math.round((f.valor / total) * 100)}%</span>}
              {f.extra && <span className="ml-1.5 text-xs font-normal text-muted">· {f.extra}</span>}
            </span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-[var(--surface-2)]">
            <div className="h-full rounded-full" style={{ width: `${Math.max(2, (f.valor / max) * 100)}%`, background: "rgb(var(--accent-rgb))" }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Embudo: cada paso con su cifra, el % sobre el primero y el % que pasa desde el anterior. */
export function Embudo({ pasos, locale, textoDelAnterior }: { pasos: { etiqueta: string; valor: number }[]; locale: string; textoDelAnterior: string }) {
  const base = Math.max(1, pasos[0]?.valor ?? 1);
  return (
    <ol className="flex flex-col gap-3">
      {pasos.map((p, i) => {
        const anterior = i > 0 ? pasos[i - 1].valor : null;
        return (
          <li key={p.etiqueta}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">
                <span className="mr-2 font-heading font-bold text-muted">{i + 1}</span>
                {p.etiqueta}
              </span>
              <span className="shrink-0 font-semibold tabular-nums">
                {p.valor.toLocaleString(locale)}
                <span className="ml-1.5 text-xs font-normal text-muted">{Math.round((p.valor / base) * 100)}%</span>
              </span>
            </div>
            <div className="mt-1 h-3 rounded-[4px] bg-[var(--surface-2)]">
              <div className="h-full rounded-[4px]" style={{ width: `${Math.max(1, (p.valor / base) * 100)}%`, background: "rgb(var(--accent-rgb))" }} />
            </div>
            {anterior !== null && anterior > 0 && (
              <p className="mt-0.5 text-[0.6875rem] text-muted">↳ {textoDelAnterior.replace("{pct}", String(Math.round((p.valor / anterior) * 100)))}</p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Retención: una fila por semana de alta; cada celda, el % que volvió esa semana (más intenso, más alto). */
export function TablaCohortes({
  cohortes,
  locale,
  textos,
}: {
  cohortes: { semana: string; altas: number; retencion: (number | null)[] }[];
  locale: string;
  textos: { semana: string; altas: string; vacio: string; columna: string };
}) {
  if (cohortes.length === 0) return <p className="text-sm text-muted">{textos.vacio}</p>;
  const columnas = cohortes[0]?.retencion.length ?? 0;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-xs tabular-nums">
        <thead>
          <tr className="text-muted">
            <th className="py-1.5 pr-3 text-left font-semibold">{textos.semana}</th>
            <th className="py-1.5 pr-3 text-right font-semibold">{textos.altas}</th>
            {Array.from({ length: columnas }, (_, i) => (
              <th key={i} className="px-1 py-1.5 text-center font-semibold">
                {textos.columna.replace("{n}", String(i))}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cohortes.map((c) => (
            <tr key={c.semana}>
              <td className="py-1 pr-3 font-semibold">{new Date(`${c.semana}T12:00:00`).toLocaleDateString(locale, { day: "numeric", month: "short" })}</td>
              <td className="py-1 pr-3 text-right">{c.altas.toLocaleString(locale)}</td>
              {c.retencion.map((r, i) => (
                <td key={i} className="p-0.5">
                  {r === null ? (
                    <span className="block h-7" />
                  ) : (
                    <span
                      className="flex h-7 items-center justify-center rounded-[4px] font-semibold"
                      style={{
                        background: r === 0 ? "var(--surface-2)" : `rgb(var(--accent-rgb) / ${0.15 + 0.85 * (r / 100)})`,
                        color: r > 55 ? "var(--background)" : "var(--foreground)",
                      }}
                    >
                      {r}%
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const UMBRALES: Record<string, { unidad: string; formato: (v: number) => string }> = {
  LCP: { unidad: "s", formato: (v) => (v / 1000).toFixed(2) },
  FCP: { unidad: "s", formato: (v) => (v / 1000).toFixed(2) },
  TTFB: { unidad: "ms", formato: (v) => String(Math.round(v)) },
  INP: { unidad: "ms", formato: (v) => String(Math.round(v)) },
  CLS: { unidad: "", formato: (v) => v.toFixed(3) },
};

/** Una métrica de Web Vitals: media y reparto bueno/regular/malo con icono y texto (el color no va solo). */
export function TarjetaVital({
  metrica,
  nombre,
  n,
  media,
  buenas,
  regulares,
  malas,
  locale,
  textos,
}: {
  metrica: string;
  nombre: string;
  n: number;
  media: number;
  buenas: number;
  regulares: number;
  malas: number;
  locale: string;
  textos: { bien: string; regular: string; mal: string; medidas: string };
}) {
  const u = UMBRALES[metrica] ?? { unidad: "", formato: (v: number) => v.toFixed(1) };
  const total = Math.max(1, buenas + regulares + malas);
  const tramos = [
    { clave: "bien", valor: buenas, color: "var(--estado-bien)", icono: "✓", texto: textos.bien },
    { clave: "regular", valor: regulares, color: "var(--estado-regular)", icono: "!", texto: textos.regular },
    { clave: "mal", valor: malas, color: "var(--estado-mal)", icono: "✕", texto: textos.mal },
  ];
  return (
    <div className="rounded-[14px] p-4" style={{ border: "1px solid var(--border)", background: "linear-gradient(var(--surface), var(--background))" }}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-[0.06em] text-muted" title={nombre}>
          {metrica}
        </p>
        <p className="text-[0.6875rem] text-muted">{textos.medidas.replace("{n}", n.toLocaleString(locale))}</p>
      </div>
      <p className="mt-1 truncate text-[0.6875rem] text-muted">{nombre}</p>
      <p className="mt-1.5 font-heading text-2xl font-bold tabular-nums leading-none">
        {u.formato(media)}
        <span className="ml-1 text-sm font-semibold text-muted">{u.unidad}</span>
      </p>
      <div className="mt-3 flex h-2 gap-[2px] overflow-hidden rounded-full">
        {tramos.filter((t) => t.valor > 0).map((t) => (
          <div key={t.clave} style={{ flexGrow: t.valor, background: t.color }} />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[0.6875rem] tabular-nums">
        {tramos.map((t) => (
          <li key={t.clave} className="flex items-center gap-1">
            <span className="font-bold" style={{ color: t.color }} aria-hidden="true">
              {t.icono}
            </span>
            {t.texto} {Math.round((t.valor / total) * 100)}%
          </li>
        ))}
      </ul>
    </div>
  );
}
