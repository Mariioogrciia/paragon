import {
  getProfileFromUserName,
  getTitleTrophies,
  getUserTitles,
  getUserTrophiesEarnedForTitle,
  getUserTrophyProfileSummary,
  type TrophyTitle,
  type TrophyCounts as PsnCounts,
} from "psn-api";
import { getAuthorization } from "./auth";
import {
  gameKey,
  totalCount,
  type Game,
  type Trophy,
  type TrophyCounts,
  type TrophyGrade,
} from "@/lib/types";

export class PsnProfileNotFoundError extends Error {
  constructor(onlineId: string) {
    super(`PSN no encuentra ningún perfil con el ID "${onlineId}".`);
    this.name = "PsnProfileNotFoundError";
  }
}

export interface ResolvedProfile {
  onlineId: string;
  accountId: string;
  trophyLevel: number | null;
  avatarUrl?: string;
}

/** Traduce un online ID público al accountId numérico que pide el resto de la API. */
export async function resolveProfile(onlineId: string): Promise<ResolvedProfile> {
  const auth = await getAuthorization();

  let response;
  try {
    response = await getProfileFromUserName(auth, onlineId);
  } catch {
    throw new PsnProfileNotFoundError(onlineId);
  }

  const { profile } = response;

  return {
    onlineId: profile.onlineId,
    accountId: profile.accountId,
    // trophySummary.level viene a 0 para cuentas ajenas: el nivel de verdad
    // está en el endpoint de resumen de trofeos, que además puede denegarnos
    // el acceso. Por eso va aparte y puede quedarse en null.
    trophyLevel: await fetchTrophyLevel(profile.accountId),
    // Los avatares vienen en varios tamaños; nos vale el mayor disponible.
    avatarUrl: profile.avatarUrls.at(-1)?.avatarUrl,
  };
}

async function fetchTrophyLevel(accountId: string): Promise<number | null> {
  try {
    const auth = await getAuthorization();
    const summary = await getUserTrophyProfileSummary(auth, accountId);
    // PSN devuelve el nivel como texto en unos endpoints y como número en otros.
    const level = Number(summary.trophyLevel);
    return Number.isFinite(level) ? level : null;
  } catch {
    return null;
  }
}

/**
 * ¿Podemos leer los trofeos de esta cuenta?
 *
 * PSN solo nos deja ver la cuenta con la que autenticamos y sus amigos de
 * PlayStation. Con cualquier otra, `getUserTitles` falla. Merece la pena
 * comprobarlo al vincular y no al pintar la biblioteca, para poder explicarlo.
 */
export async function canReadTrophies(accountId: string): Promise<boolean> {
  try {
    const auth = await getAuthorization();
    await getUserTitles(auth, accountId, { limit: 1 });
    return true;
  } catch {
    return false;
  }
}

function toCounts(counts: PsnCounts): TrophyCounts {
  return {
    platinum: counts.platinum,
    gold: counts.gold,
    silver: counts.silver,
    bronze: counts.bronze,
  };
}

function toGame(title: TrophyTitle): Game {
  const defined = toCounts(title.definedTrophies);
  const earned = toCounts(title.earnedTrophies);

  return {
    id: gameKey("psn", title.npCommunicationId),
    platform: "psn",
    title: title.trophyTitleName,
    deviceLabel: title.trophyTitlePlatform,
    iconUrl: title.trophyTitleIconUrl,
    lastPlayedAt: title.lastUpdatedDateTime,
    progressPercent: title.progress,
    definedTotal: totalCount(defined),
    earnedTotal: totalCount(earned),
    defined,
    earned,
    service: title.npServiceName,
  };
}

/**
 * Biblioteca de un jugador, ordenada por lo más reciente.
 *
 * PSN pagina de 100 en 100. Recorremos hasta el final porque una biblioteca de
 * años pasa de 100 juegos con facilidad, pero con un tope duro: si algo va mal
 * en la paginación, preferimos devolver de menos a girar en un bucle infinito.
 */
export async function fetchLibrary(accountId: string): Promise<Game[]> {
  const auth = await getAuthorization();
  const games: Game[] = [];

  let offset = 0;
  const PAGE = 100;
  const MAX_PAGES = 20;

  for (let page = 0; page < MAX_PAGES; page++) {
    const response = await getUserTitles(auth, accountId, {
      limit: PAGE,
      offset,
    });

    games.push(...response.trophyTitles.map(toGame));

    if (response.trophyTitles.length < PAGE) break;
    offset += PAGE;
  }

  return games.sort((a, b) =>
    (b.lastPlayedAt ?? "").localeCompare(a.lastPlayedAt ?? ""),
  );
}

/**
 * PS5 devuelve el progreso parcial de un trofeo ("31 de 48") en un campo que
 * los tipos de psn-api no declaran, aunque venga en el JSON. Lo leemos con
 * cuidado en vez de fingir que no existe: es el dato que hace útil la vista de
 * "próximos pasos".
 */
function readProgress(
  earned: unknown,
  targetValue: string | undefined,
): Trophy["progress"] {
  if (!targetValue) return undefined;

  const target = Number(targetValue);
  if (!Number.isFinite(target) || target <= 0) return undefined;

  const raw = (earned as { progress?: string | number } | null)?.progress;
  const current = Number(raw ?? 0);

  return {
    current: Number.isFinite(current) ? current : 0,
    target,
  };
}

/**
 * Trofeos de un juego para un jugador.
 *
 * Hacen falta dos llamadas y un cruce: PSN separa la *definición* del set de
 * trofeos (nombres y descripciones, iguales para todos) del *estado* de ese
 * jugador (ganado o no). Se cruzan por trophyId.
 */
export async function fetchTrophies(
  accountId: string,
  npCommunicationId: string,
  service: "trophy" | "trophy2" = "trophy2",
): Promise<Trophy[]> {
  const auth = await getAuthorization();

  // Los títulos que no son de PS5 exigen declarar el servicio explícitamente.
  const options = service === "trophy" ? { npServiceName: "trophy" as const } : {};

  const [definitions, earnedList] = await Promise.all([
    getTitleTrophies(auth, npCommunicationId, "all", options),
    getUserTrophiesEarnedForTitle(auth, accountId, npCommunicationId, "all", options),
  ]);

  const earnedById = new Map(
    earnedList.trophies.map((t) => [t.trophyId, t]),
  );

  return definitions.trophies.map((definition) => {
    // La definición trae nombre, descripción e icono; el estado del jugador
    // trae si lo tiene, la rareza y el objetivo del hito parcial.
    const earned = earnedById.get(definition.trophyId);
    const rarity = Number(earned?.trophyEarnedRate);

    return {
      // El id nativo de PSN es el número; la unicidad es por juego, no global.
      id: String(definition.trophyId),
      name: definition.trophyName ?? "Trofeo oculto",
      detail: definition.trophyDetail ?? "",
      grade: (definition.trophyType ?? "bronze") as TrophyGrade,
      earned: Boolean(earned?.earned),
      earnedAt: earned?.earnedDateTime,
      rarityPercent: Number.isFinite(rarity) ? rarity : undefined,
      hidden: definition.trophyHidden,
      iconUrl: definition.trophyIconUrl,
      progress: earned?.earned
        ? undefined
        : readProgress(earned, earned?.trophyProgressTargetValue),
    };
  });
}
