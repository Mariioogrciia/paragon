/**
 * Qué juegos te puedes platinar (8 nov 2026): «A un paso del platino» del
 * panel enseñaba solo los 3 con menos trofeos pendientes, y solo si tenían
 * platino de verdad (fuera Steam y Xbox). Ahora son dos listas:
 *
 * - `cerca`: lo que menos te queda (porcentaje alto o pocos trofeos), sin
 *   mirar cuándo lo jugaste.
 * - `jugando`: lo que has jugado en los últimos dos meses y está a tu
 *   alcance, primero lo más avanzado y reciente.
 *
 * El objetivo es el platino donde lo hay y el 100 % donde no (Steam, Xbox,
 * RetroAchievements…), como en `esPlatinoEquivalente`. Módulo puro:
 * `tests/platinables.test.ts`.
 */
import type { Game } from "@/lib/types";
import { esPlatinoEquivalente } from "@/lib/stats";
import { dispositivosDe } from "@/lib/retiradosReglas";

export interface Platinable {
  game: Game;
  /** Trofeos o logros que faltan. */
  faltan: number;
  percent: number;
  /** Días desde la última vez que se jugó; null si no se sabe. */
  diasDesdeJugado: number | null;
  /** Horas que quedan según HowLongToBeat (al 100 %) menos lo jugado; null sin datos. */
  horasRestantes: number | null;
  /** Consolas del juego ("PS4", "PSVITA"…), para filtrar por la que tienes encendida. */
  dispositivos: string[];
  /** De PS Plus o Game Pass: se puede ir del catálogo. */
  suscripcion: "ps_plus" | "game_pass" | null;
  /** Marcado como instalado ahora (lib/retirados.ts). */
  instalado: boolean;
  /** % de jugadores con el platino (o el 100 %), si se sabe. */
  rarezaPlatino: number | null;
}

const DIA_MS = 86_400_000;
/** "Jugando ahora": tocado en estos días. */
export const DIAS_RECIENTE = 60;
const MAX_CERCA = 12;
const MAX_JUGANDO = 8;

function aPlatinable(g: Game, ahora: number, instalados: Set<string>): Platinable {
  const jugado = g.lastPlayedAt ? new Date(g.lastPlayedAt).getTime() : NaN;
  const completo = g.hltb?.completionist;
  return {
    game: g,
    faltan: Math.max(0, g.definedTotal - g.earnedTotal),
    percent: g.progressPercent,
    diasDesdeJugado: Number.isFinite(jugado) ? Math.max(0, Math.floor((ahora - jugado) / DIA_MS)) : null,
    horasRestantes: completo ? Math.max(0, Math.round(completo - (g.playtimeMinutes ?? 0) / 60)) : null,
    dispositivos: dispositivosDe(g.deviceLabel),
    suscripcion: g.acquisitionFormat === "ps_plus" || g.acquisitionFormat === "game_pass" ? g.acquisitionFormat : null,
    instalado: instalados.has(g.id),
    rarezaPlatino: g.platinumRarity ?? null,
  };
}

/** Empezado, sin platino (o 100 %) y de una plataforma con trofeos de verdad. */
function candidato(g: Game): boolean {
  return (
    !g.isWishlist &&
    g.platform !== "manual" &&
    g.definedTotal > 0 &&
    g.earnedTotal > 0 &&
    !esPlatinoEquivalente(g)
  );
}

/** Más arriba cuanto más avanzado y más reciente, y menos cuanto más falta. */
function puntuacion(p: Platinable): number {
  const reciente = p.diasDesdeJugado === null ? 0 : p.diasDesdeJugado <= 7 ? 20 : p.diasDesdeJugado <= 21 ? 12 : p.diasDesdeJugado <= DIAS_RECIENTE ? 5 : 0;
  return p.percent + reciente - Math.min(p.faltan, 60) * 0.4;
}

/** Platinos fáciles sin empezar: los que se acaban en pocas horas o que saca mucha gente. */
const HORAS_FACIL = 25;
const RAREZA_FACIL = 25;
const MAX_FACILES = 10;

export function platinables(
  games: Game[],
  ahora = Date.now(),
  instalados: Set<string> = new Set(),
): { cerca: Platinable[]; jugando: Platinable[]; faciles: Platinable[] } {
  const todos = games.filter(candidato).map((g) => aPlatinable(g, ahora, instalados));

  const cerca = todos
    // Pocos trofeos solo cuenta si ya vas por la mitad: un juego corto al 30 % no está "cerca".
    .filter((p) => p.percent >= 70 || (p.faltan <= 8 && p.percent >= 50))
    .sort((a, b) => a.faltan - b.faltan || b.percent - a.percent || (a.diasDesdeJugado ?? 9e9) - (b.diasDesdeJugado ?? 9e9))
    .slice(0, MAX_CERCA);

  // Aquí también entran los de `cerca` que estás jugando: es "qué platino
  // me saco con lo que tengo entre manos", no el resto de la lista.
  const jugando = todos
    .filter((p) => p.diasDesdeJugado !== null && p.diasDesdeJugado <= DIAS_RECIENTE && p.percent >= 20)
    .sort((a, b) => puntuacion(b) - puntuacion(a))
    .slice(0, MAX_JUGANDO);

  // Sin empezar (8 nov 2026): lo que tienes en la estantería y se platina rápido.
  const faciles = games
    .filter((g) => !g.isWishlist && g.platform !== "manual" && g.definedTotal > 0 && g.earnedTotal === 0 && !esPlatinoEquivalente(g))
    .map((g) => aPlatinable(g, ahora, instalados))
    .filter((p) => (p.horasRestantes !== null && p.horasRestantes <= HORAS_FACIL) || (p.rarezaPlatino !== null && p.rarezaPlatino >= RAREZA_FACIL))
    .sort((a, b) => (a.horasRestantes ?? 999) - (b.horasRestantes ?? 999) || (b.rarezaPlatino ?? 0) - (a.rarezaPlatino ?? 0))
    .slice(0, MAX_FACILES);

  return { cerca, jugando, faciles };
}
