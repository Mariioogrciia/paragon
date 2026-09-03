import Link from "next/link";
import { type Game } from "@/lib/types";
import { coverGradient } from "@/lib/design";
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
 * El juego más "exprimido": por horas si las hay, y si no, por trofeos.
 *
 * Exportada porque la reutiliza `/api/wrap/[handle]`, que genera la misma
 * tarjeta como imagen compartible: si la lógica se duplicara ahí, un cambio
 * aquí dejaría a la imagen contando otra historia que la pantalla.
 */
export function juegoDestacado(games: Game[]): Game | undefined {
  if (games.length === 0) return undefined;

  // Si hay horas de alguna plataforma, se compara por horas entre esos juegos;
  // si no hay ninguna, se compara por trofeos.
  const conHoras = games.filter((g) => (g.playtimeMinutes ?? 0) > 0);

  if (conHoras.length > 0) {
    return conHoras.reduce((a, b) =>
      (b.playtimeMinutes ?? 0) > (a.playtimeMinutes ?? 0) ? b : a,
    );
  }

  return games.reduce((a, b) => (b.earnedTotal > a.earnedTotal ? b : a));
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
}) {
  const topGenre = generoTop(games);
  const topGame = juegoDestacado(games);

  return (
    <section className="mb-10">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h2 className="font-heading text-[26px] font-bold uppercase tracking-wide flex items-center gap-2">
          <span className="text-xl">✨</span> Paragon Wrap
        </h2>
        {handle && (
          <a
            href={`/api/wrap/${handle}`}
            download={`paragon-wrap-${handle}.png`}
            className="ml-auto text-xs font-bold uppercase tracking-wide text-accent hover:underline"
          >
            Compartir imagen
          </a>
        )}
        <Link
          href="/ritmo"
          className={handle ? "text-xs font-bold uppercase tracking-wide text-accent hover:underline" : "ml-auto text-xs font-bold uppercase tracking-wide text-accent hover:underline"}
        >
          Ver mes a mes
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div
          className={TARJETA}
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
        </div>

        <div
          className={TARJETA}
          style={{
            background: topGame ? coverGradient(topGame.id) : "#131a26",
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
              title={topGame?.title}
            >
              {topGame?.title ?? "Ninguno"}
            </p>
            <p className="text-sm font-medium" style={{ color: "rgba(219, 234, 254, 0.9)" }}>
              {topGame?.playtimeMinutes
                ? `${(topGame.playtimeMinutes / 60).toFixed(1)} horas jugadas`
                : `${topGame?.earnedTotal ?? 0} trofeos conseguidos`}
            </p>
          </div>
        </div>

        <div
          className={TARJETA}
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
        </div>
      </div>
    </section>
  );
}
