import Link from "@/components/Enlace";
import type { CSSProperties, ReactNode } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { CompartirImagenWrap } from "@/components/CompartirImagenWrap";
import { WrapStoriesButton } from "@/components/WrapStoriesButton";
import { type Game } from "@/lib/types";
import { gruposPorTitulo } from "@/lib/stats";
import type { Rachas } from "@/lib/history";
import type { PercentilAnio } from "@/lib/wrapPercentile";
import { TrophyIcon } from "./TrophyIcon";
import type { WrapAnual } from "@/lib/wrapAnual";
import { BarraMetales, BarrasHorizontales, BarrasMeses, Caratula } from "@/components/wrap/GraficasWrap";

/**
 * Paragon Wrap: el resumen "de póster" del perfil.
 *
 * Las tres tarjetas van SIEMPRE sobre fondo oscuro, en cualquier tema. Es un
 * póster, no una tarjeta más de la interfaz: con los tintes translúcidos que
 * tenía antes, en modo claro el texto pálido sobre fondo pálido no se leía.
 * Al fijar el fondo oscuro, el texto blanco funciona en claro, oscuro, OLED y
 * alto contraste sin depender del tema.
 */

const TARJETA =
  "relative overflow-hidden rounded-2xl p-6 shadow-lg transition-transform hover:scale-[1.01]";

/**
 * Cada tarjeta enseña un solo número ("tu género más jugado"); esto la hace
 * llevar al ranking entero de ese dato (`/u/[handle]/wrap/<métrica>`), para
 * quien quiera ver qué hay en segundo y tercer puesto. Sin `handle` (perfil
 * de ejemplo) se queda como un `div`, porque no hay datos reales a los que
 * llevar.
 */
function Tarjeta({
  href,
  style,
  className = "",
  children,
}: {
  href?: string;
  style: CSSProperties;
  className?: string;
  children: ReactNode;
}) {
  if (!href) {
    return (
      <div className={`${TARJETA} ${className}`} style={style}>
        {children}
      </div>
    );
  }

  return (
    <Link href={href} className={`${TARJETA} ${className}`} style={style}>
      {children}
    </Link>
  );
}

export interface JuegoDestacado {
  game: Game;
  /** Horas sumadas de todas las copias del juego (Steam + PSN, etc.), no solo las de `game`. */
  horasTotal: number;
}

/**
 * El juego más "exprimido": por horas si las hay (sumadas entre plataformas
 * si el mismo juego está en varias), y si no, por trofeos.
 *
 * Exportada porque la reutiliza `/api/wrap/[handle]`, que genera la misma
 * tarjeta como imagen compartible: si la lógica se duplicara ahí, un cambio
 * aquí dejaría a la imagen contando otra historia que la pantalla.
 */
export function juegoDestacado(games: Game[]): JuegoDestacado | undefined {
  if (games.length === 0) return undefined;

  const grupos = gruposPorTitulo(games);
  const conHoras = grupos.filter((g) => g.horasTotal > 0);

  if (conHoras.length > 0) {
    const top = conHoras[0]; // gruposPorTitulo ya viene ordenado por horas desc.
    return { game: top.principal, horasTotal: top.horasTotal };
  }

  const jugados = games.filter((g) => !g.isWishlist);
  // Puede quedar vacío si toda la biblioteca son deseados: sin ningún juego
  // "de verdad" no hay nada que destacar (antes esto reventaba con "Reduce
  // of empty array" en cuanto alguien tenía solo deseados).
  if (jugados.length === 0) return undefined;

  const porTrofeos = jugados.reduce((a, b) => (b.earnedTotal > a.earnedTotal ? b : a));
  return { game: porTrofeos, horasTotal: 0 };
}

export function generoTop(games: Game[]): { name: string; count: number } {
  const cuenta = new Map<string, number>();

  for (const g of games) {
    for (const genero of g.genres ?? []) {
      cuenta.set(genero, (cuenta.get(genero) ?? 0) + 1);
    }
  }

  let top = { name: "Ninguno", count: 0 };
  for (const [name, count] of cuenta) {
    if (count > top.count) top = { name, count };
  }

  return top;
}

export async function ParagonWrap({
  games,
  esteAnio,
  juegosEsteAnio,
  anual,
  handle,
  playerName,
  mejorMes,
  rachas,
  percentil,
  esMio = false,
}: {
  games: Game[];
  /** Trofeos conseguidos este año (solo los que tienen fecha registrada). */
  esteAnio: number;
  /** Juegos distintos tocados este año. NO es el tamaño de la biblioteca. */
  juegosEsteAnio: number;
  /** El año en detalle (lib/wrapAnual.ts): mes a mes, metales, top, platinos... */
  anual: WrapAnual;
  /**
   * El handle del perfil, para el botón de compartir. Opcional porque el
   * perfil de ejemplo (`/ejemplo`) no tiene una imagen que generar — ahí no
   * hay datos reales que enseñar en una imagen para compartir.
   */
  handle?: string;
  /**
   * Estos cuatro son opcionales y solo alimentan el botón "Ver Wrap
   * completo" (WrapStories, el formato Stories ampliado) — sin `playerName`
   * no se muestra el botón, porque sin nombre no hay a quién saludar en la
   * portada de las diapositivas.
   */
  playerName?: string;
  mejorMes?: { mes: string; total: number } | null;
  rachas?: Rachas;
  percentil?: PercentilAnio | null;
  /** Tu propio perfil: el mes a mes es /ritmo; en el de otro, sus estadísticas. */
  esMio?: boolean;
}) {
  const [t, locale] = await Promise.all([getTranslations("Perfil"), getLocale()]);
  const topGenre = generoTop(games);
  const topGame = juegoDestacado(games);
  const conAnio = esteAnio > 0;
  // Adónde lleva cada tarjeta (21 oct 2026): antes "Tu año" iba al ranking de
  // juegos y "Platinos del año" al de géneros, nada que ver con lo que enseñan.
  const mesAMes = esMio || !handle ? "/ritmo" : `/u/${handle}/estadisticas`;
  const extras = [
    rachas && rachas.mejor > 0 && { etiqueta: t("ParagonWrap.mejorRacha"), valor: t("ParagonWrap.dias", { n: rachas.mejor }) },
    rachas && rachas.diasActivos > 0 && { etiqueta: t("ParagonWrap.diasActivos"), valor: rachas.diasActivos.toLocaleString(locale) },
    percentil && percentil.totalUsuarios > 1 && { etiqueta: t("ParagonWrap.entreCazadores"), valor: t("ParagonWrap.top", { n: percentil.percentil }) },
  ].filter((e): e is { etiqueta: string; valor: string } => Boolean(e));

  return (
    <section className="mb-10">
      <div className="mb-5 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-heading flex items-center gap-3 text-[1.625rem] font-bold uppercase tracking-wide">
          {t("ParagonWrap.titulo")}
          <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-bold tabular-nums tracking-[0.14em] text-muted">{anual.anio}</span>
        </h2>
        <div className="flex w-full flex-wrap items-center gap-x-5 gap-y-3 sm:w-auto sm:justify-end">
          {playerName && (
            <WrapStoriesButton
              data={{
                playerName,
                topGenre,
                topGame,
                esteAnio,
                juegosEsteAnio,
                mejorMes: mejorMes ?? null,
                rachas: rachas ?? { actual: 0, mejor: 0, diasActivos: 0, hoyCuenta: false },
                percentil: percentil ?? null,
                anual,
                handle,
              }}
            />
          )}
          {handle && <CompartirImagenWrap handle={handle} />}
          <Link
            href={mesAMes}
            className="text-xs font-bold uppercase tracking-wide text-accent hover:underline"
          >
            {t("ParagonWrap.verMesAMes")}
          </Link>
        </div>
      </div>

      {/* Rediseño (21 oct 2026): antes eran tres degradados de color con un
          número cada uno. Ahora es un póster del año en mosaico: el mes a mes
          y los metales, el juego con su carátula de verdad, el top de juegos
          y los platinos del año con el trofeo más raro. */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
        <Tarjeta href={handle ? mesAMes : undefined} className="md:col-span-4" style={POSTER}>
          <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(600px 260px at 0% 0%, rgb(var(--accent-rgb) / 0.22), transparent 70%)" }} />
          <div className="relative">
            <p className={ROTULO}>{t("ParagonWrap.tuAnio", { anio: anual.anio })}</p>
            <div className="mt-1 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
              <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
                <p className="font-heading text-6xl font-bold leading-none text-white">{esteAnio.toLocaleString(locale)}</p>
                <p className="pb-1 text-sm text-white/70">
                  {conAnio ? t("ParagonWrap.trofeosEnJuegos", { count: juegosEsteAnio }) : t("ParagonWrap.sinTrofeosEsteAnio")}
                </p>
              </div>
              {/* Tres cifras de contexto: lo que el número grande no cuenta. */}
              {conAnio && extras.length > 0 && (
                <dl className="flex gap-5 pb-1">
                  {extras.map((e) => (
                    <div key={e.etiqueta} className="min-w-0">
                      <dt className="text-[0.625rem] font-bold uppercase tracking-[0.14em] text-white/50">{e.etiqueta}</dt>
                      <dd className="mt-0.5 font-heading text-lg font-bold leading-none tabular-nums text-white">{e.valor}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
            {conAnio && (
              <>
                <div className="mt-6">
                  <BarrasMeses porMes={anual.porMes} locale={locale} alto={96} etiqueta={(mes, total) => t("ParagonWrap.mesTrofeos", { mes, total })} />
                </div>
                <div className="mt-5">
                  <BarraMetales porMetal={anual.porMetal} etiquetaOtros={t("ParagonWrap.logrosSinMetal")} />
                </div>
              </>
            )}
          </div>
        </Tarjeta>

        <Tarjeta
          href={handle ? `/u/${handle}/wrap/${topGame?.horasTotal ? "horas" : "trofeos"}` : undefined}
          className="flex min-h-[260px] flex-col justify-end md:col-span-2"
          style={POSTER}
        >
          {topGame && (
            <Caratula gameId={topGame.game.id} iconUrl={topGame.game.iconUrl ?? null} titulo={topGame.game.title} className="absolute inset-0" />
          )}
          <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(8,10,15,0.1) 0%, rgba(8,10,15,0.55) 45%, rgba(8,10,15,0.95) 100%)" }} />
          <div className="relative">
            <p className={ROTULO}>{t("ParagonWrap.juegoMasExprimido")}</p>
            <p className="font-heading mt-1 line-clamp-2 text-2xl font-bold leading-tight text-white" title={topGame?.game.title}>
              {topGame?.game.title ?? t("ParagonWrap.generoNinguno")}
            </p>
            <p className="mt-1 text-sm font-medium text-white/80">
              {topGame && topGame.horasTotal > 0
                ? t("ParagonWrap.horasJugadas", { horas: Math.round(topGame.horasTotal).toLocaleString(locale) })
                : t("ParagonWrap.trofeosConseguidos", { trofeos: topGame?.game.earnedTotal ?? 0 })}
            </p>
          </div>
        </Tarjeta>

        {conAnio && anual.topJuegos.length > 0 && (
          <Tarjeta href={handle ? `/u/${handle}/wrap/trofeos?rango=anio` : undefined} className="md:col-span-3" style={POSTER}>
            <p className={ROTULO}>{t("ParagonWrap.tusJuegosDelAnio")}</p>
            <ol className="mt-4 flex flex-col gap-3">
              {anual.topJuegos.map((j, i) => (
                <li key={j.gameId} className="flex items-center gap-3">
                  <span className="w-4 shrink-0 text-center font-heading text-sm font-bold text-white/50">{i + 1}</span>
                  <Caratula gameId={j.gameId} iconUrl={j.iconUrl} titulo={j.titulo} className="h-10 w-10 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-white">{j.titulo}</span>
                      <span className="shrink-0 text-xs font-bold tabular-nums text-white/75">{j.trofeos.toLocaleString(locale)}</span>
                    </div>
                    <div className="mt-1.5 h-1 rounded-full bg-white/10">
                      <div className="h-full rounded-full" style={{ width: `${Math.max(4, (j.trofeos / anual.topJuegos[0].trofeos) * 100)}%`, background: "rgb(var(--accent-rgb))" }} />
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </Tarjeta>
        )}

        {conAnio && (
          <Tarjeta
            href={handle ? (anual.platinos.length > 0 ? `/u/${handle}/biblioteca?estado=platinado` : `/u/${handle}/wrap/generos?rango=anio`) : undefined}
            className="md:col-span-3"
            style={POSTER}
          >
            {anual.platinos.length > 0 ? (
              <>
                <div className="flex items-baseline justify-between gap-3">
                  <p className={ROTULO}>{t("ParagonWrap.platinosDelAnio")}</p>
                  <p className="font-heading text-3xl font-bold leading-none" style={{ color: "var(--platinum)" }}>{anual.platinos.length}</p>
                </div>
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {anual.platinos.slice(0, 8).map((p) => (
                    <Caratula key={p.gameId} gameId={p.gameId} iconUrl={p.iconUrl} titulo={p.titulo} className="aspect-square rounded-lg ring-1 ring-[rgb(159_212_236/0.35)]" />
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className={ROTULO}>{t("ParagonWrap.generoMasJugado")}</p>
                <div className="mt-4">
                  {anual.generos.length > 0 ? (
                    <BarrasHorizontales filas={anual.generos.map((g) => ({ clave: g.nombre, etiqueta: g.nombre, valor: g.juegos }))} />
                  ) : (
                    <p className="text-sm text-white/70">{t("ParagonWrap.sinGeneros")}</p>
                  )}
                </div>
              </>
            )}
            {anual.masRaro && (
              <div className="mt-5 flex items-center gap-3 border-t border-white/10 pt-4">
                <TrophyIcon grade={anual.masRaro.grado ?? "gold"} size={28} />
                <div className="min-w-0">
                  <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-white/55">{t("ParagonWrap.trofeoMasRaro")}</p>
                  <p className="truncate text-sm font-semibold text-white">
                    {anual.masRaro.nombre} <span className="font-normal text-white/60">· {anual.masRaro.juego}</span>
                  </p>
                </div>
                <p className="ml-auto shrink-0 font-heading text-xl font-bold text-white">
                  {anual.masRaro.rareza.toLocaleString(locale, { maximumFractionDigits: 1 })}%
                </p>
              </div>
            )}
          </Tarjeta>
        )}
      </div>
    </section>
  );
}

/** Fondo de póster: siempre oscuro, en cualquier tema (ver el comentario de arriba). */
const POSTER = { background: "linear-gradient(160deg, #141a24, #0b0f16)", border: "1px solid rgba(255,255,255,0.08)" } as const;
const ROTULO = "text-[0.75rem] font-bold uppercase tracking-[0.14em] text-white/60";
