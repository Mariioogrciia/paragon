import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { analitica } from "@/lib/trafico";
import { resumenRegistro24h } from "@/lib/registro";
import { GraficaDias } from "@/components/admin/GraficaDias";

/**
 * Admin → Analítica (21 oct 2026): el tráfico propio (lib/trafico.ts), la
 * gente activa, las altas y las sincronizaciones, con gráficas por día y
 * selector de periodo. Server component: las gráficas son la única parte
 * de cliente (por el ratón).
 */

const PERIODOS = [7, 30, 90] as const;
const CARD = { border: "1px solid var(--border)", background: "linear-gradient(var(--surface), var(--background))" };

function Variacion({ actual, anterior, dias, t }: { actual: number; anterior: number; dias: number; t: Awaited<ReturnType<typeof getTranslations>> }) {
  if (anterior === 0) return <p className="mt-1 text-xs text-muted">{t("analitica.sinAnterior")}</p>;
  const pct = Math.round(((actual - anterior) / anterior) * 100);
  // La flecha y el signo dicen la dirección; el color solo acompaña.
  return (
    <p className={`mt-1 text-xs font-semibold ${pct >= 0 ? "text-green-500" : "text-red-400"}`}>
      {pct >= 0 ? "▲ +" : "▼ "}
      {t("analitica.vsAnterior", { pct, n: dias })}
    </p>
  );
}

function Kpi({ label, valor, children }: { label: string; valor: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-[14px] p-4" style={CARD}>
      <p className="text-xs font-bold uppercase tracking-[0.06em] text-muted">{label}</p>
      <p className="mt-1.5 font-heading text-3xl font-bold tabular-nums leading-none">{valor}</p>
      {children}
    </div>
  );
}

export async function AnaliticaAdmin({ dias, locale }: { dias: number; locale: string }) {
  const [t, datos, registro] = await Promise.all([getTranslations("Admin"), analitica(dias), resumenRegistro24h()]);
  const num = (n: number) => n.toLocaleString(locale);
  const pctMovil = datos.totales.vistas > 0 ? Math.round((datos.totales.movil / datos.totales.vistas) * 100) : 0;
  const maxRuta = Math.max(1, ...datos.topRutas.map((r) => r.vistas));
  const maxOrigen = Math.max(1, ...datos.topOrigenes.map((o) => o.entradas));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        {PERIODOS.map((p) => (
          <Link
            key={p}
            href={`/admin?tab=analitica&dias=${p}`}
            aria-current={p === dias ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${p === dias ? "text-[var(--background)]" : "text-muted hover:text-foreground"}`}
            style={p === dias ? { background: "rgb(var(--accent-rgb))" } : { border: "1px solid var(--border)" }}
          >
            {t("analitica.dias", { n: p })}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Kpi label={t("analitica.vistas")} valor={num(datos.totales.vistas)}>
          <Variacion actual={datos.totales.vistas} anterior={datos.anteriores.vistas} dias={dias} t={t} />
        </Kpi>
        <Kpi label={t("analitica.entradas")} valor={num(datos.totales.entradas)}>
          <Variacion actual={datos.totales.entradas} anterior={datos.anteriores.entradas} dias={dias} t={t} />
        </Kpi>
        <Kpi label={t("analitica.activos")} valor={`${num(datos.activos.hoy)} · ${num(datos.activos.semana)} · ${num(datos.activos.mes)}`}>
          <p className="mt-1 text-xs text-muted">{t("analitica.activosDetalle")}</p>
        </Kpi>
        <Kpi label={t("analitica.altas")} valor={num(datos.totales.altas)}>
          <Variacion actual={datos.totales.altas} anterior={datos.anteriores.altas} dias={dias} t={t} />
        </Kpi>
        <Kpi label={t("analitica.trofeosNuevos")} valor={num(datos.totales.trofeosNuevos)}>
          <p className="mt-1 text-xs text-muted">{t("analitica.syncs", { n: datos.totales.syncs })}</p>
        </Kpi>
        <Kpi label={t("analitica.errores24h")} valor={num(registro.errores)}>
          <p className="mt-1 text-xs text-muted">
            {t("analitica.avisos24h", { n: registro.avisos })} ·{" "}
            <Link href="/admin?tab=registro" className="font-semibold text-accent hover:underline">
              {t("analitica.verRegistro")}
            </Link>
          </p>
        </Kpi>
      </div>

      {datos.totales.vistas === 0 && <p className="text-sm text-muted">{t("analitica.sinDatos")}</p>}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {[
          {
            titulo: t("analitica.graficaVistas"),
            puntos: datos.vistasPorDia.map((p) => ({ dia: p.dia, valor: p.valor, extra: t("analitica.extraEntradas", { n: p.entradas }) })),
            tipo: "area" as const,
            unidad: t("analitica.unidadVistas"),
          },
          { titulo: t("analitica.graficaActivos"), puntos: datos.activosPorDia, tipo: "columnas" as const, unidad: t("analitica.unidadPersonas") },
          { titulo: t("analitica.graficaAltas"), puntos: datos.altasPorDia, tipo: "columnas" as const, unidad: t("analitica.unidadAltas") },
          {
            titulo: t("analitica.graficaSync"),
            puntos: datos.syncPorDia.map((p) => ({ dia: p.dia, valor: p.valor, extra: t("analitica.extraTrofeos", { n: p.trofeos }) })),
            tipo: "columnas" as const,
            unidad: t("analitica.unidadSync"),
          },
        ].map((g) => (
          <div key={g.titulo} className="rounded-[14px] p-4" style={CARD}>
            <GraficaDias titulo={g.titulo} puntos={g.puntos} tipo={g.tipo} unidad={g.unidad} locale={locale} textoTabla={t("analitica.verTabla")} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="rounded-[14px] p-4" style={CARD}>
          <h3 className="mb-3 text-sm font-bold">{t("analitica.paginas")}</h3>
          <ul className="flex flex-col gap-2.5">
            {datos.topRutas.map((r) => (
              <li key={r.ruta}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <code className="min-w-0 truncate text-xs">{r.ruta}</code>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {num(r.vistas)} <span className="text-xs font-normal text-muted">· {t("analitica.extraEntradas", { n: r.entradas })}</span>
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-[var(--surface-2)]">
                  <div className="h-full rounded-full" style={{ width: `${Math.max(2, (r.vistas / maxRuta) * 100)}%`, background: "rgb(var(--accent-rgb))" }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-[14px] p-4" style={CARD}>
          <h3 className="mb-3 text-sm font-bold">{t("analitica.origenes")}</h3>
          <ul className="flex flex-col gap-2.5">
            {datos.topOrigenes.map((o) => (
              <li key={o.origen}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">{o.origen === "directo" ? t("analitica.directo") : o.origen}</span>
                  <span className="shrink-0 font-semibold tabular-nums">{num(o.entradas)}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-[var(--surface-2)]">
                  <div className="h-full rounded-full" style={{ width: `${Math.max(2, (o.entradas / maxOrigen) * 100)}%`, background: "rgb(var(--accent-rgb))" }} />
                </div>
              </li>
            ))}
          </ul>
          {datos.totales.vistas > 0 && (
            <p className="mt-4 text-xs text-muted">
              {t("analitica.movil")}: <strong className="text-foreground">{pctMovil}%</strong> {t("analitica.movilDetalle")}
            </p>
          )}
        </section>
      </div>

      <p className="max-w-3xl text-xs text-muted">{t("analitica.nota")}</p>
    </div>
  );
}
