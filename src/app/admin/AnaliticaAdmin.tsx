import { Suspense } from "react";
import Link from "@/components/Enlace";
import { getTranslations } from "next-intl/server";
import { analitica, audiencia } from "@/lib/trafico";
import { datosPlataforma } from "@/lib/analiticaPlataforma";
import { resumenRegistro24h } from "@/lib/registro";
import { GraficaDias } from "@/components/admin/GraficaDias";
import { Donut, type PorcionDonut } from "@/components/admin/Donut";
import { MapaCalor } from "@/components/admin/MapaCalor";
import { BarrasLista, Embudo, TablaCohortes, TarjetaVital } from "@/components/admin/GraficasPanel";
import { PLATFORM_LABEL } from "@/lib/types";

/**
 * Admin → Analítica (21 oct 2026): el tráfico propio (lib/trafico.ts), la
 * gente activa, las altas y las sincronizaciones, con gráficas por día y
 * selector de periodo. Server component: las gráficas son la única parte
 * de cliente (por el ratón).
 *
 * Ampliado el 22 oct 2026 ("todo lo que se pueda sacar de analíticas, con
 * gráficas y gráficos circulares"): audiencia (país, navegador, sistema,
 * dispositivo, idioma, pantalla, tema, campañas), cuándo (mapa de calor),
 * web frente a app, rendimiento (Web Vitals), usuarios (embudo, retención,
 * registro, plataformas, avisos), comunidad y calidad (404 y bots).
 */

const SECCIONES = ["trafico", "audiencia", "cuando", "rendimiento", "usuarios", "comunidad", "calidad"] as const;

/** Bandera a partir del código de país (🇪🇸). */
function bandera(codigo: string): string {
  return /^[A-Z]{2}$/.test(codigo) ? String.fromCodePoint(...[...codigo].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)) : "🏳️";
}

function Seccion({ id, titulo, children }: { id: string; titulo: string; children: React.ReactNode }) {
  return (
    <section id={`a-${id}`} className="scroll-mt-24 space-y-5">
      <h2 className="font-heading border-b border-border pb-2 text-lg font-bold uppercase tracking-wide">{titulo}</h2>
      {children}
    </section>
  );
}

function Tarjeta({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 rounded-[14px] p-4 ${className}`} style={CARD}>
      {children}
    </div>
  );
}

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

type Parte = (typeof SECCIONES)[number];

/**
 * La pestaña se pinta al momento y cada grupo de secciones llega por su
 * cuenta (Suspense): antes se esperaba a las ~28 consultas antes de enseñar
 * nada, y con el pool de 5 conexiones a veces no llegaba a cargar.
 */
export async function AnaliticaAdmin({ dias, locale }: { dias: number; locale: string }) {
  const t = await getTranslations("Admin");
  const grupos: Parte[][] = [["trafico"], ["audiencia", "cuando", "rendimiento"], ["usuarios", "comunidad"], ["calidad"]];
  return (
    <div className="space-y-10">
      <nav aria-label={t("analitica.secciones")} className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold uppercase tracking-wide">
        {SECCIONES.map((s) => (
          <a key={s} href={`#a-${s}`} className="text-muted hover:text-[var(--accent-text)]">
            {t(`analitica.seccion.${s}`)}
          </a>
        ))}
      </nav>
      {grupos.map((partes) => (
        <Suspense
          key={partes.join("-")}
          fallback={
            <div className="space-y-5" aria-busy="true">
              <p className="font-heading border-b border-border pb-2 text-lg font-bold uppercase tracking-wide text-muted">{t(`analitica.seccion.${partes[0]}`)}</p>
              <div className="h-48 animate-pulse rounded-[14px] bg-[var(--surface-2)]" />
            </div>
          }
        >
          <Bloque dias={dias} locale={locale} partes={partes} />
        </Suspense>
      ))}
      <p className="max-w-3xl text-xs text-muted">{t("analitica.nota")}</p>
    </div>
  );
}

/** Un grupo de secciones: solo pide los datos que esas secciones usan. */
async function Bloque({ dias, locale, partes }: { dias: number; locale: string; partes: Parte[] }) {
  const quiere = (...p: Parte[]) => p.some((x) => partes.includes(x));
  const t = await getTranslations("Admin");
  const datos = quiere("trafico", "comunidad") ? await analitica(dias) : null;
  const registro = quiere("trafico") ? await resumenRegistro24h() : null;
  const aud = quiere("audiencia", "cuando", "rendimiento", "calidad") ? await audiencia(dias) : null;
  const plat = quiere("usuarios", "comunidad") ? await datosPlataforma(dias) : null;
  const num = (n: number) => n.toLocaleString(locale);
  const pctMovil = datos && datos.totales.vistas > 0 ? Math.round((datos.totales.movil / datos.totales.vistas) * 100) : 0;
  const maxRuta = Math.max(1, ...(datos?.topRutas.map((r) => r.vistas) ?? []));
  const maxOrigen = Math.max(1, ...(datos?.topOrigenes.map((o) => o.entradas) ?? []));

  const nombrePais = new Intl.DisplayNames([locale], { type: "region" });
  const nombreIdioma = new Intl.DisplayNames([locale], { type: "language" });
  const seguro = (f: () => string, otro: string) => {
    try {
      return f();
    } catch {
      return otro;
    }
  };
  const rep = (tipo: string) => aud?.reparto[tipo] ?? [];
  const donut = (tipo: string, etiqueta: (v: string) => string, icono?: (v: string) => string): PorcionDonut[] =>
    rep(tipo).map((r) => ({ etiqueta: etiqueta(r.valor), valor: r.n, icono: icono?.(r.valor) }));
  const comun = { locale, etiquetaOtros: t("analitica.otros"), vacio: t("analitica.sinDatosCorto") };
  const plataforma = (v: string) => PLATFORM_LABEL[v as keyof typeof PLATFORM_LABEL] ?? v;
  const proveedor = (v: string) => ({ google: "Google", discord: "Discord", epic: "Epic Games" })[v] ?? v;
  const vitales = ["LCP", "INP", "CLS", "FCP", "TTFB"].map((m) => aud?.rendimiento.find((r) => r.metrica === m)).filter((r) => r !== undefined);

  return (
    <div className="space-y-10">

      {partes.includes("trafico") && datos && registro && (
      <Seccion id="trafico" titulo={t("analitica.seccion.trafico")}>
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

      </Seccion>
      )}

      {partes.includes("audiencia") && aud && (
      <Seccion id="audiencia" titulo={t("analitica.seccion.audiencia")}>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          <Tarjeta>
            <Donut titulo={t("analitica.paises")} unidad={t("analitica.unidadVisitas")} {...comun}
              datos={donut("pais", (v) => seguro(() => nombrePais.of(v) ?? v, v), bandera)} />
          </Tarjeta>
          <Tarjeta>
            <Donut titulo={t("analitica.dispositivos")} unidad={t("analitica.unidadVisitas")} {...comun}
              datos={donut("dispositivo", (v) => t(`analitica.dispositivo.${v === "movil" || v === "tablet" ? v : "escritorio"}`))} />
          </Tarjeta>
          <Tarjeta>
            <Donut titulo={t("analitica.navegadores")} unidad={t("analitica.unidadVisitas")} {...comun} datos={donut("navegador", (v) => v)} />
          </Tarjeta>
          <Tarjeta>
            <Donut titulo={t("analitica.sistemas")} unidad={t("analitica.unidadVisitas")} {...comun} datos={donut("sistema", (v) => v)} />
          </Tarjeta>
          <Tarjeta>
            <Donut titulo={t("analitica.idiomas")} unidad={t("analitica.unidadVisitas")} {...comun}
              datos={donut("idioma", (v) => (v === "otro" ? t("analitica.otros") : seguro(() => nombreIdioma.of(v) ?? v, v)))} />
          </Tarjeta>
          <Tarjeta>
            <Donut titulo={t("analitica.temas")} unidad={t("analitica.unidadVisitas")} {...comun}
              datos={donut("tema", (v) => t(`analitica.tema.${v === "claro" ? "claro" : "oscuro"}`))} />
          </Tarjeta>
          <Tarjeta>
            <h3 className="mb-3 text-sm font-bold">{t("analitica.pantallas")}</h3>
            <BarrasLista locale={locale} vacio={t("analitica.sinDatosCorto")}
              filas={["< 640", "640–1023", "1024–1439", "1440–1919", "≥ 1920"].map((v) => ({ clave: v, etiqueta: `${v} px`, valor: rep("pantalla").find((r) => r.valor === v)?.n ?? 0 })).filter((f) => f.valor > 0)} />
          </Tarjeta>
          <Tarjeta>
            <h3 className="mb-3 text-sm font-bold">{t("analitica.campanas")}</h3>
            <BarrasLista locale={locale} vacio={t("analitica.sinCampanas")} filas={rep("campana").slice(0, 10).map((r) => ({ clave: r.valor, etiqueta: r.valor, valor: r.n }))} />
          </Tarjeta>
          <Tarjeta>
            <Donut titulo={t("analitica.conSesion")} unidad={t("analitica.unidadVistas")} {...comun}
              datos={donut("sesion", (v) => t(`analitica.sesion.${v === "con" ? "con" : "sin"}`))} />
          </Tarjeta>
        </div>
      </Seccion>
      )}

      {partes.includes("cuando") && aud && (
      <Seccion id="cuando" titulo={t("analitica.seccion.cuando")}>
        <Tarjeta>
          <MapaCalor
            titulo={t("analitica.mapaCalor")}
            datos={aud.semanaHora}
            dias={t("analitica.diasSemana").split(",")}
            unidad={t("analitica.unidadVistas")}
            locale={locale}
            textoTabla={t("analitica.verTabla")}
            textoHora={t("analitica.horaPunta", { h: "{h}" })}
          />
        </Tarjeta>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Tarjeta>
            <GraficaDias titulo={t("analitica.graficaApp")} puntos={aud.appPorDia} tipo="columnas" unidad={t("analitica.unidadPersonas")} locale={locale} textoTabla={t("analitica.verTabla")} />
          </Tarjeta>
          <Tarjeta>
            <Donut titulo={t("analitica.webApp")} unidad={t("analitica.unidadPersonas")} {...comun}
              datos={[{ etiqueta: t("analitica.web"), valor: aud.usuariosWeb }, { etiqueta: t("analitica.app"), valor: aud.usuariosApp }]} />
            <p className="mt-3 text-xs text-muted">{t("analitica.webAppNota")}</p>
          </Tarjeta>
        </div>
      </Seccion>
      )}

      {partes.includes("rendimiento") && aud && (
      <Seccion id="rendimiento" titulo={t("analitica.seccion.rendimiento")}>
        {vitales.length === 0 ? (
          <p className="text-sm text-muted">{t("analitica.sinVitales")}</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
            {vitales.map((v) => (
              <TarjetaVital key={v.metrica} {...v} nombre={t(`analitica.vital.${v.metrica}`)} locale={locale}
                textos={{ bien: t("analitica.bien"), regular: t("analitica.regular"), mal: t("analitica.mal"), medidas: t("analitica.medidas", { n: "{n}" }) }} />
            ))}
          </div>
        )}
        <p className="max-w-3xl text-xs text-muted">{t("analitica.vitalesNota")}</p>
      </Seccion>
      )}

      {partes.includes("usuarios") && plat && (
      <Seccion id="usuarios" titulo={t("analitica.seccion.usuarios")}>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Tarjeta>
            <h3 className="mb-3 text-sm font-bold">{t("analitica.embudo")}</h3>
            <Embudo locale={locale} textoDelAnterior={t("analitica.delAnterior", { pct: "{pct}" })}
              pasos={[
                { etiqueta: t("analitica.paso.registrados"), valor: plat.embudo.registrados },
                { etiqueta: t("analitica.paso.conPerfil"), valor: plat.embudo.conPerfil },
                { etiqueta: t("analitica.paso.conPlataforma"), valor: plat.embudo.conPlataforma },
                { etiqueta: t("analitica.paso.sincronizados"), valor: plat.embudo.sincronizados },
                { etiqueta: t("analitica.paso.conLogros"), valor: plat.embudo.conLogros },
                { etiqueta: t("analitica.paso.conPlatino"), valor: plat.embudo.conPlatino },
              ]} />
          </Tarjeta>
          <Tarjeta>
            <h3 className="mb-1 text-sm font-bold">{t("analitica.retencion")}</h3>
            <p className="mb-3 text-xs text-muted">{t("analitica.retencionAyuda")}</p>
            <TablaCohortes cohortes={plat.cohortes} locale={locale}
              textos={{ semana: t("analitica.semanaAlta"), altas: t("analitica.altas"), vacio: t("analitica.sinCohortes"), columna: t("analitica.semanaN", { n: "{n}" }) }} />
          </Tarjeta>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <Tarjeta>
            <Donut titulo={t("analitica.proveedores")} unidad={t("analitica.unidadPersonas")} {...comun} datos={plat.proveedores.map((p) => ({ etiqueta: proveedor(p.valor), valor: p.n }))} />
          </Tarjeta>
          <Tarjeta>
            <Donut titulo={t("analitica.plataformasVinculadas")} unidad={t("analitica.unidadCuentas")} {...comun} datos={plat.plataformas.map((p) => ({ etiqueta: plataforma(p.valor), valor: p.n }))} />
          </Tarjeta>
          <Tarjeta>
            <Donut titulo={t("analitica.multiplataforma")} unidad={t("analitica.unidadPersonas")} {...comun}
              datos={plat.multiplataforma.map((p) => ({ etiqueta: t("analitica.nPlataformas", { n: Number(p.valor) }), valor: p.n }))} />
          </Tarjeta>
          <Tarjeta>
            <h3 className="mb-3 text-sm font-bold">{t("analitica.avisosActivados")}</h3>
            <BarrasLista locale={locale} vacio={t("analitica.sinDatosCorto")} porcentaje={false}
              filas={[
                { clave: "web", etiqueta: t("analitica.avisoWeb"), valor: plat.avisos.webPush },
                { clave: "app", etiqueta: t("analitica.avisoApp"), valor: plat.avisos.app },
              ]} />
            <p className="mt-3 text-xs text-muted">
              {t("analitica.avisosTotal", { n: plat.avisos.usuarios, pct: plat.embudo.registrados > 0 ? Math.round((plat.avisos.usuarios / plat.embudo.registrados) * 100) : 0 })}
            </p>
          </Tarjeta>
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Tarjeta>
            <Donut titulo={t("analitica.trofeosPorPlataforma")} unidad={t("analitica.unidadTrofeos")} {...comun} datos={plat.trofeosPeriodo.map((p) => ({ etiqueta: plataforma(p.valor), valor: p.n }))} />
          </Tarjeta>
          <Tarjeta>
            <Donut titulo={t("analitica.syncsPorPlataforma")} unidad={t("analitica.unidadSync")} {...comun} datos={plat.syncsPeriodo.map((p) => ({ etiqueta: plataforma(p.valor), valor: p.n }))} />
          </Tarjeta>
          <Tarjeta>
            <h3 className="mb-3 text-sm font-bold">{t("analitica.topJuegos")}</h3>
            <BarrasLista locale={locale} vacio={t("analitica.sinDatosCorto")} porcentaje={false}
              filas={plat.topJuegos.map((j) => ({ clave: `${j.plataforma}-${j.titulo}`, etiqueta: <>{j.titulo} <span className="text-xs text-muted">· {plataforma(j.plataforma)}</span></>, valor: j.jugadores }))} />
          </Tarjeta>
        </div>
      </Seccion>
      )}

      {partes.includes("comunidad") && plat && datos && (
      <Seccion id="comunidad" titulo={t("analitica.seccion.comunidad")}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
          <Kpi label={t("analitica.catalogoJuegos")} valor={num(plat.catalogo.juegos)} />
          <Kpi label={t("analitica.catalogoTrofeos")} valor={num(plat.catalogo.trofeos)} />
          <Kpi label={t("analitica.trofeosGanados")} valor={num(plat.catalogo.ganados)} />
          {["amistades", "clanes", "ligas", "guias", "colecciones", "comentarios", "reacciones", "sesiones"].map((k) => (
            <Kpi key={k} label={t(`analitica.comunidad.${k}`)} valor={num(plat.comunidad[k] ?? 0)} />
          ))}
          <Kpi label={t("analitica.pegajosidad")} valor={datos.activos.mes > 0 ? `${Math.round((datos.activos.hoy / datos.activos.mes) * 100)}%` : "—"}>
            <p className="mt-1 text-xs text-muted">{t("analitica.pegajosidadAyuda")}</p>
          </Kpi>
        </div>
      </Seccion>
      )}

      {partes.includes("calidad") && aud && (
      <Seccion id="calidad" titulo={t("analitica.seccion.calidad")}>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Tarjeta>
            <h3 className="mb-3 text-sm font-bold">{t("analitica.noEncontradas")}</h3>
            <BarrasLista locale={locale} vacio={t("analitica.sin404")} filas={aud.noEncontradas.map((r) => ({ clave: r.valor, etiqueta: <code className="text-xs">{r.valor}</code>, valor: r.n }))} />
          </Tarjeta>
          <Tarjeta>
            <Donut titulo={t("analitica.bots")} unidad={t("analitica.unidadAvisos")} {...comun} vacio={t("analitica.sinBots")} datos={aud.bots.map((b) => ({ etiqueta: b.valor, valor: b.n }))} />
            <p className="mt-3 text-xs text-muted">{t("analitica.botsNota")}</p>
          </Tarjeta>
        </div>
      </Seccion>
      )}
    </div>
  );
}
