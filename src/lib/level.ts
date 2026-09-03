import { esPlatinoEquivalente } from "@/lib/stats";
import type { Game, TrophyCounts } from "@/lib/types";

export const XP_POR_GRADO: Record<keyof TrophyCounts, number> = {
  bronze: 10,
  silver: 25,
  gold: 50,
  platinum: 200,
};

export interface ParagonLevel {
  level: number;
  xp: number;
  xpEnNivel: number;
  xpParaSiguiente: number;
  progreso: number;
  restante: number;
  siguienteNivel: number;
}

export interface ParagonXpBreakdown {
  trofeos: number;
  platinos: number;
  juegosCompletados: number;
  total: number;
}

export interface ParagonProgress extends ParagonLevel {
  breakdown: ParagonXpBreakdown;
}

function xpParaNivel(level: number): number {
  return level <= 1 ? 0 : 500 * ((level - 1) * level) / 2;
}

export function paragonLevelFromXp(xp: number): ParagonLevel {
  let level = 1;
  while (xp >= xpParaNivel(level + 1)) level += 1;

  const inicio = xpParaNivel(level);
  const siguiente = xpParaNivel(level + 1);
  const xpParaSiguiente = siguiente - inicio;
  const xpEnNivel = xp - inicio;

  return {
    level,
    xp,
    xpEnNivel,
    xpParaSiguiente,
    progreso: Math.min(100, Math.round((xpEnNivel / xpParaSiguiente) * 100)),
    restante: Math.max(0, siguiente - xp),
    siguienteNivel: level + 1,
  };
}

export function paragonProgress(games: Game[]): ParagonProgress {
  const earned: TrophyCounts = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
  let juegosCompletados = 0;

  for (const game of games) {
    if (game.isWishlist) continue;
    for (const grade of ["bronze", "silver", "gold"] as const) {
      earned[grade] += game.earned?.[grade] ?? 0;
    }

    // Mutuamente excluyentes, igual que el estado en gameProgress (stats.ts):
    // un 100% de Steam cuenta como platino, no como "juego completado" aparte
    // — contarlo en los dos sería XP de más por el mismo hito.
    if (esPlatinoEquivalente(game)) {
      earned.platinum += 1;
    } else if (game.progressPercent === 100) {
      juegosCompletados += 1;
    }
  }

  const trofeos = (["bronze", "silver", "gold"] as const).reduce(
    (total, grade) => total + earned[grade] * XP_POR_GRADO[grade],
    0,
  );
  const platinos = earned.platinum * XP_POR_GRADO.platinum;
  const completados = juegosCompletados * 100;
  // Antes se quedaba fuera del total: el nivel de esta tarjeta salía más
  // bajo que el de la navbar (que sí lo suma, en paragonLevel.ts) para
  // cualquiera con algún platino, y el propio donut de abajo — que reparte
  // sus 360° entre trofeos/platinos/completados sobre este total — se
  // quedaba corto de espacio para el tramo de platinos.
  const total = trofeos + platinos + completados;

  return {
    ...paragonLevelFromXp(total),
    breakdown: {
      trofeos,
      platinos,
      juegosCompletados: completados,
      total,
    },
  };
}
