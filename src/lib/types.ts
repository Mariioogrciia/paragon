/* ------------------------------------------------------------------ *
 * Plataformas.                                                        *
 *                                                                     *
 * Una "plataforma" es un ecosistema de logros con su propia API, no    *
 * una consola: PS4 y PS5 son la misma (PSN) porque comparten trofeos.  *
 * ------------------------------------------------------------------ */

export type Platform = "psn" | "steam" | "google";

export const PLATFORMS: Platform[] = ["psn", "steam", "google"];

export const PLATFORM_LABEL: Record<Platform, string> = {
  psn: "PlayStation",
  steam: "Steam",
  google: "Google Play",
};

/** Cómo llama cada plataforma a sus logros, para no decir "trofeo" en Steam. */
export const ACHIEVEMENT_LABEL: Record<Platform, { one: string; many: string }> = {
  psn: { one: "trofeo", many: "trofeos" },
  steam: { one: "logro", many: "logros" },
  google: { one: "logro", many: "logros" },
};

/**
 * Clave de un juego en nuestra base: `<plataforma>-<id nativo>`.
 *
 * El mismo juego en PSN y en Steam son dos filas distintas a propósito: los
 * sets de logros no coinciden, ni en número ni en nombres, así que mezclarlos
 * daría porcentajes que no significan nada.
 */
export function gameKey(platform: Platform, nativeId: string): string {
  return `${platform}-${nativeId}`;
}

export function parseGameKey(id: string): { platform: Platform; nativeId: string } {
  const cut = id.indexOf("-");
  const platform = id.slice(0, cut) as Platform;
  return { platform, nativeId: id.slice(cut + 1) };
}

/* ------------------------------------------------------------------ *
 * Logros.                                                             *
 * ------------------------------------------------------------------ */

/** Los metales son cosa de PSN. En Steam un logro es un logro y ya. */
export type TrophyGrade = "bronze" | "silver" | "gold" | "platinum";

export type TrophyCounts = Record<TrophyGrade, number>;

export const GRADES: TrophyGrade[] = ["platinum", "gold", "silver", "bronze"];

export function emptyCounts(): TrophyCounts {
  return { platinum: 0, gold: 0, silver: 0, bronze: 0 };
}

export function totalCount(counts: TrophyCounts): number {
  return counts.platinum + counts.gold + counts.silver + counts.bronze;
}

export interface Trophy {
  /** Único dentro del juego: número en PSN, nombre de API en Steam. */
  id: string;
  name: string;
  detail: string;
  /** Sin metal en las plataformas que no los tienen. */
  grade?: TrophyGrade;
  earned: boolean;
  earnedAt?: string;
  /** % de jugadores del mundo que lo tienen. Más bajo = más raro. */
  rarityPercent?: number;
  hidden?: boolean;
  iconUrl?: string;
  /**
   * Hitos parciales ("31 de 48 cuervos"). Solo algunos juegos de PS5 los
   * exponen, y aun así PSN no siempre devuelve el valor actual — ver psn.ts.
   */
  progress?: { current: number; target: number };
}

/* ------------------------------------------------------------------ *
 * Juegos.                                                             *
 * ------------------------------------------------------------------ */

/**
 * Un juego tal y como se ve en la biblioteca: sin la lista de logros.
 *
 * Los totales (`definedTotal`/`earnedTotal`) son el dato común a todas las
 * plataformas; el desglose por metal solo existe en PSN y por eso es opcional.
 */
export interface Game {
  /** Clave namespaced, ver gameKey(). */
  id: string;
  platform: Platform;
  title: string;
  /** Lo que se enseña al usuario: "PS5", "PS4", "PC"... */
  deviceLabel: string;
  iconUrl?: string;
  lastPlayedAt?: string;
  rating?: number;
  progressPercent: number;
  definedTotal: number;
  earnedTotal: number;
  /** Desglose por metal. Solo PSN. */
  defined?: TrophyCounts;
  earned?: TrophyCounts;
  /** "trophy" (PS3/PS4/Vita) o "trophy2" (PS5). Hace falta para pedir el detalle. */
  service?: "trophy" | "trophy2";
  /** Minutos jugados. Solo Steam lo da. */
  playtimeMinutes?: number;

  /* Metadatos de catálogo, para agrupar y filtrar. */
  developer?: string;
  publisher?: string;
  genres?: string[];
}

export interface GameDetail extends Game {
  trophies: Trophy[];
}

/** Una cuenta vinculada de una plataforma. */
export interface PlatformAccount {
  platform: Platform;
  accountId: string;
  username: string;
  /** Nivel de trofeos en PSN; Steam no tiene equivalente. */
  level: number | null;
  avatarUrl: string | null;
  isPublic: boolean;
  syncedAt: Date | null;
}

export interface Player {
  id: string;
  /** Como le llamamos nosotros, no el nombre en ninguna plataforma. */
  name: string;
  accounts: PlatformAccount[];
  avatarUrl?: string;
  /** Nivel de PSN, si tiene PSN vinculada. */
  trophyLevel?: number;
}

export interface Library {
  player: Player;
  games: Game[];
}
