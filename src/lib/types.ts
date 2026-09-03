/* ------------------------------------------------------------------ *
 * Plataformas.                                                        *
 *                                                                     *
 * Una "plataforma" es un ecosistema de logros con su propia API, no    *
 * una consola: PS4 y PS5 son la misma (PSN) porque comparten trofeos.  *
 * ------------------------------------------------------------------ */

/**
 * "manual" no es un ecosistema de logros como los demás: es el cajón para lo
 * que no tiene API (Switch, retro, tablero...). No participa en
 * `platformAccounts` — no hay cuenta que vincular, cada fila de `games` sale
 * directamente de que alguien la añadió a mano — pero sí es un `Game` más en
 * la biblioteca, así que vive en el mismo tipo `Platform` para no duplicar
 * medio `stats.ts` y `LibraryGrid.tsx` con un tipo paralelo.
 */
export type Platform = "psn" | "steam" | "google" | "xbox" | "epic" | "ubisoft" | "manual";

/** Las que se vinculan por cuenta. Ver el comentario de "manual" arriba. */
export type AccountPlatform = Exclude<Platform, "manual">;

export const PLATFORMS: AccountPlatform[] = ["psn", "steam", "google", "xbox", "epic", "ubisoft"];

/**
 * "unified" no es una plataforma real: es cómo se marca la ficha global de un
 * juego (`/juego/[id]`, ver GlobalGame en lib/community.ts) cuando el mismo
 * igdbId aparece en más de una plataforma a la vez (p. ej. PSN y Steam). Vive
 * aquí, junto a `Platform`, para que una sola tabla sirva tanto a `Game.platform`
 * (siempre `Platform`) como a `GlobalGame.platform` (`Platform | "unified"`).
 */
export const PLATFORM_LABEL: Record<Platform | "unified", string> = {
  psn: "PlayStation",
  steam: "Steam",
  google: "Google Play",
  xbox: "Xbox",
  epic: "Epic Games",
  ubisoft: "Ubisoft Connect",
  manual: "Añadido a mano",
  unified: "Multiplataforma",
};

/** Cómo llama cada plataforma a sus logros, para no decir "trofeo" en Steam. */
export const ACHIEVEMENT_LABEL: Record<Platform, { one: string; many: string }> = {
  psn: { one: "trofeo", many: "trofeos" },
  steam: { one: "logro", many: "logros" },
  google: { one: "logro", many: "logros" },
  xbox: { one: "logro", many: "logros" },
  epic: { one: "logro", many: "logros" },
  ubisoft: { one: "logro", many: "logros" },
  manual: { one: "hito", many: "hitos" },
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
  groupId?: string;
  groupName?: string;
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
  review?: string;
  reviewDate?: string;
  progressPercent: number;
  definedTotal: number;
  earnedTotal: number;
  /** Desglose por metal. Solo PSN. */
  defined?: TrophyCounts;
  earned?: TrophyCounts;
  isWishlist?: boolean;
  /** "trophy" (PS3/PS4/Vita) o "trophy2" (PS5). Hace falta para pedir el detalle. */
  service?: "trophy" | "trophy2";
  /** Minutos jugados. Steam y PSN pueden proporcionarlo. */
  playtimeMinutes?: number;

  /* Metadatos de catálogo, para agrupar y filtrar. */
  developer?: string;
  publisher?: string;
  genres?: string[];
  pegi?: string;
  /**
   * % de jugadores del juego que tienen su platino. Es la base de la
   * dificultad estimada (ver lib/difficulty). Solo en juegos con platino y
   * cuyo detalle se ha sincronizado.
   */
  platinumRarity?: number;
  /** Id del catálogo de IGDB, si esta fila ya se emparejó con uno. Es lo que
   * permite agrupar el mismo lanzamiento entre plataformas (ver GlobalGame en
   * lib/community.ts) y filtrar recomendaciones de lo que ya se tiene. */
  igdbId?: number | null;
}

export interface GameDetail extends Game {
  trophies: Trophy[];
}

/** Una cuenta vinculada de una plataforma. */
export interface PlatformAccount {
  platform: AccountPlatform;
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
