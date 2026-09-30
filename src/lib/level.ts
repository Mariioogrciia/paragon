import { esPlatinoEquivalente } from "@/lib/stats";
import type { Game, TrophyCounts } from "@/lib/types";

export const XP_POR_GRADO: Record<keyof TrophyCounts, number> = {
  bronze: 10,
  silver: 25,
  gold: 50,
  platinum: 200,
};

/**
 * Nivel Paragon mínimo para cada marco de avatar (`users.profileFrame`).
 * Antes solo vivía como texto en el desplegable de /ajustes ("Nivel 10+"),
 * sin que nada lo comprobara de verdad — cualquiera podía guardar "fire" a
 * nivel 1. Se usa tanto para pintar el desplegable como para validar en
 * `/api/profile/update`.
 */
export const FRAME_REQUISITOS: Record<string, number> = {
  neon: 5,
  gold: 10,
  circuito: 25,
  platinum: 50,
  fire: 100,
  cristal: 150,
};

/**
 * Marcos que no dependen del nivel sino de una insignia (lib/logros.ts): el
 * nivel 100 o 150 queda lejísimos (millones de XP) y así hay marcos que se
 * ganan de otras formas. Comprobados igual que los de nivel.
 */
export const FRAME_INSIGNIA: Record<string, string> = {
  laurel: "campeon",
  aurora: "temporada_oro",
  eclipse: "noctambulo",
};

/** `true` si ese marco se puede usar con este nivel e insignias (o no existe requisito). */
export function marcoDisponible(marco: string, nivel: number, insignias: string[]): boolean {
  if (FRAME_REQUISITOS[marco] !== undefined) return nivel >= FRAME_REQUISITOS[marco];
  if (FRAME_INSIGNIA[marco] !== undefined) return insignias.includes(FRAME_INSIGNIA[marco]);
  return false;
}

/**
 * Estilos de interfaz (lib/apariencia.ts) que se desbloquean por nivel. Los
 * de siempre (Clásico, Terminal, Vidrio, Brutalista) siguen libres: esto
 * añade algo que ganar sin quitarle a nadie lo básico. Se comprueba en el
 * cliente (selector) y al guardar (`guardarAparienciaAction`).
 */
export const ESTILO_REQUISITOS: Record<string, number> = {
  "estilo-ps5": 10,
  "estilo-xbox": 10,
  "estilo-steam": 20,
  "estilo-switch": 20,
};

/** Banners de plataforma (lib/bannerPresets.ts) con nivel mínimo, igual que los marcos. */
export const BANNER_REQUISITOS: Record<string, number> = {
  retro: 15,
  paragon: 30,
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
  /** XP de misiones semanales cumplidas (lib/missions.ts). */
  misiones: number;
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

export function paragonProgress(games: Game[], xpMisiones = 0): ParagonProgress {
  const earned: TrophyCounts = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
  let juegosCompletados = 0;
  // Steam no tiene jerarquía de metales (`game.earned` se queda a null, ver
  // lib/sync.ts) — sus logros sueltos no daban NADA de XP hasta ahora, solo
  // el bonus de "platino" del 100% (abajo). `steamTrophyXp` (calculado en
  // lib/profiles.ts/getLibrary, con `xpSteamPorRareza` de trophyScore.ts) ya
  // pesa cada logro por su rareza real — un logro que tiene el 90% de la
  // gente no es lo mismo que uno que tiene el 2%, ni de lejos el trato plano
  // que tenía esto antes.
  let steamXp = 0;
  // Xbox no tiene metales (`earned` se queda vacío para esta plataforma,
  // ver lib/sync.ts) ni bonus de "100% cuenta como platino" — solo el
  // Gamerscore real de cada logro (`xboxTrophyXp`, ver types.ts), añadido
  // el 15 de septiembre de 2026 al empezar a llegar sincronización real de
  // Xbox: antes de esto, un logro suelto sin llegar al 100% del juego no
  // daba nada de XP, a diferencia de Steam.
  let xboxXp = 0;
  // Mismo motivo que Xbox: Epic pesa por el XP real de cada logro
  // (`epicTrophyXp`, ver types.ts), añadido el 22 de septiembre de 2026 al
  // volver a sincronizar Epic de verdad.
  let epicXp = 0;

  for (const game of games) {
    if (game.isWishlist) continue;
    for (const grade of ["bronze", "silver", "gold"] as const) {
      earned[grade] += game.earned?.[grade] ?? 0;
    }

    steamXp += game.steamTrophyXp ?? 0;
    xboxXp += game.xboxTrophyXp ?? 0;
    epicXp += game.epicTrophyXp ?? 0;

    // Mutuamente excluyentes, igual que el estado en gameProgress (stats.ts):
    // un 100% de Steam cuenta como platino, no como "juego completado" aparte
    // — contarlo en los dos sería XP de más por el mismo hito.
    if (esPlatinoEquivalente(game)) {
      earned.platinum += 1;
    } else if (game.progressPercent === 100) {
      juegosCompletados += 1;
    }
  }

  const trofeos =
    (["bronze", "silver", "gold"] as const).reduce((total, grade) => total + earned[grade] * XP_POR_GRADO[grade], 0) +
    steamXp +
    xboxXp +
    epicXp;
  const platinos = earned.platinum * XP_POR_GRADO.platinum;
  const completados = juegosCompletados * 100;
  // Antes se quedaba fuera del total: el nivel de esta tarjeta salía más
  // bajo que el de la navbar (que sí lo suma, en paragonLevel.ts) para
  // cualquiera con algún platino, y el propio donut de abajo — que reparte
  // sus 360° entre trofeos/platinos/completados sobre este total — se
  // quedaba corto de espacio para el tramo de platinos.
  const total = trofeos + platinos + completados + xpMisiones;

  return {
    ...paragonLevelFromXp(total),
    breakdown: {
      trofeos,
      platinos,
      juegosCompletados: completados,
      misiones: xpMisiones,
      total,
    },
  };
}
