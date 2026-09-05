import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { CompartirImagenWrap } from "@/components/CompartirImagenWrap";
import { WrapStoriesButton } from "@/components/WrapStoriesButton";
import { type Game } from "@/lib/types";
import { coverGradient } from "@/lib/design";
import { gruposPorTitulo } from "@/lib/stats";
import type { Rachas } from "@/lib/history";
import type { PercentilAnio } from "@/lib/wrapPercentile";
import { TrophyIcon } from "./TrophyIcon";

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
  "relative overflow-hidden rounded-2xl p-6 shadow-lg transition-transform hover:scale-[1.02]";

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
  children,
}: {
  href?: string;
  style: CSSProperties;
  children: ReactNode;
}) {
  if (!href) {
    return (
      <div className={TARJETA} style={style}>
        {children}
      </div>
    );
  }

  return (
    <Link href={href} className={TARJETA} style={style}>
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

export function ParagonWrap({
  games,
  esteAnio,
  juegosEsteAnio,
  handle,
  playerName,
  mejorMes,
  rachas,
  percentil,
}: {
  games: Game[];
  /** Trofeos conseguidos este año (solo los que tienen fecha registrada). */
  esteAnio: number;
  /** Juegos distintos tocados este año. NO es el tamaño de la biblioteca. */
  juegosEsteAnio: number;
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
}) {
  const topGenre = generoTop(games);
  const topGame = juegoDestacado(games);

  return (
    <section className="mb-10">
      <div className="mb-5 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-heading text-[26px] font-bold uppercase tracking-wide flex items-center gap-2">
          <span className="text-xl">✨</span> Paragon Wrap
        </h2>
        <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto sm:justify-end sm:gap-4">
          {playerName && (
            <WrapStoriesButton
              data={{
                playerName,
                topGenre,
                topGame,
                esteAnio,
                juegosEsteAnio,
                mejorMes: mejorMes ?? null,
                rachas: rachas ?? { actual: 0, mejor: 0, diasActivos: 0 },
                percentil: percentil ?? null,
                handle,
              }}
            />
          )}
          {handle && <CompartirImagenWrap handle={handle} />}
          <Link
            href="/ritmo"
            className="text-xs font-bold uppercase tracking-wide text-accent hover:underline"
          >
            Ver mes a mes
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Tarjeta
          href={handle ? `/u/${handle}/wrap/generos` : undefined}
          style={{
            background: "linear-gradient(140deg, #3b1d6e, #1c1040 70%, #120a26)",
            border: "1px solid rgba(167, 139, 250, 0.35)",
          }}
        >
          <div className="absolute -right-4 -top-4 text-[80px] opacity-10">🎮</div>
          <h3 className="mb-1 text-[13px] font-bold uppercase tracking-widest" style={{ color: "#c4b5fd" }}>
            Género más jugado
          </h3>
          <p className="font-heading mb-2 text-3xl font-bold text-white">{topGenre.name}</p>
          <p className="text-sm" style={{ color: "rgba(233, 226, 255, 0.8)" }}>
            {topGenre.count === 0
              ? "Todavía no hay géneros en tu catálogo"
              : `Tienes ${topGenre.count} títulos de este género`}
          </p>
        </Tarjeta>

        <Tarjeta
          href={handle ? `/u/${handle}/wrap/${topGame?.horasTotal ? "horas" : "trofeos"}` : undefined}
          style={{
            background: topGame ? coverGradient(topGame.game.id) : "#131a26",
            border: "1px solid rgba(125, 179, 255, 0.35)",
          }}
        >
          <div className="absolute inset-0 bg-black/55" />
          <div className="relative z-10">
            <h3 className="mb-1 text-[13px] font-bold uppercase tracking-widest" style={{ color: "#a8ccff" }}>
              Juego más exprimido
            </h3>
            <p
              className="font-heading mb-2 truncate text-2xl font-bold leading-tight text-white"
              title={topGame?.game.title}
            >
              {topGame?.game.title ?? "Ninguno"}
            </p>
            <p className="text-sm font-medium" style={{ color: "rgba(219, 234, 254, 0.9)" }}>
              {topGame && topGame.horasTotal > 0
                ? `${topGame.horasTotal.toFixed(1)} horas jugadas`
                : `${topGame?.game.earnedTotal ?? 0} trofeos conseguidos`}
            </p>
          </div>
        </Tarjeta>

        <Tarjeta
          href={handle ? `/u/${handle}/wrap/trofeos?rango=anio` : undefined}
          style={{
            background: "linear-gradient(140deg, #5a3410, #3a1f08 70%, #241305)",
            border: "1px solid rgba(251, 191, 36, 0.35)",
          }}
        >
          <div className="absolute bottom-2 right-2 opacity-20">
            <TrophyIcon grade="gold" size={60} />
          </div>
          <h3 className="mb-1 text-[13px] font-bold uppercase tracking-widest" style={{ color: "#fcd34d" }}>
            Resumen del año
          </h3>
          <div className="mb-2 flex items-end gap-2">
            <p className="font-heading text-4xl font-bold text-white">{esteAnio}</p>
            <p className="mb-1 text-sm" style={{ color: "rgba(254, 240, 199, 0.8)" }}>
              trofeos
            </p>
          </div>
          {/* Antes aquí salía el tamaño de la biblioteca entera, que no tiene
              nada que ver con este año. */}
          <p className="text-sm" style={{ color: "rgba(254, 240, 199, 0.8)" }}>
            {juegosEsteAnio === 0
              ? "Aún no hay trofeos con fecha de este año"
              : `Repartidos en ${juegosEsteAnio} ${juegosEsteAnio === 1 ? "juego" : "juegos"}`}
          </p>
        </Tarjeta>
      </div>
    </section>
  );
}
