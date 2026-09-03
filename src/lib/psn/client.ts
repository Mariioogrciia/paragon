import {
  getProfileFromUserName,
  getTitleTrophies,
  getTitleTrophyGroups,
  getUserPlayedGames,
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

function claveTitulo(title: string): string {
  return title
    // Espacio, no vacío: PSN escribe "EA SPORTS™UFC®4" en la lista de trofeos
    // y "EA SPORTS™ UFC® 4" en el historial de juego. Borrando el símbolo
    // queda "sportsufc4" contra "sports ufc 4", y no casan nunca.
    .replace(/[™®©]/g, " ")
    // El historial añade la consola: "Grand Theft Auto V (PlayStation®5)".
    .replace(/\(playstation[^)]*\)/gi, "")
    // Y la lista de trofeos añade el sufijo del set: "FIFA 22 Trophies".
    .replace(/\s*\b(trophy set|trophy list|trophies)\s*$/i, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    // "UFC4" y "UFC 4" son el mismo juego.
    .replace(/([a-z])(\d)/g, "$1 $2")
    .replace(/(\d)([a-z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

function duracionEnMinutos(duration: string | undefined): number {
  if (!duration) return 0;

  const partes = duration.match(/^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/);
  if (!partes) return 0;

  const dias = Number(partes[1] ?? 0);
  const horas = Number(partes[2] ?? 0);
  const minutos = Number(partes[3] ?? 0);
  const segundos = Number(partes[4] ?? 0);
  return Math.round(dias * 1_440 + horas * 60 + minutos + segundos / 60);
}

async function horasJugadas(accountId: string): Promise<Map<string, number>> {
  const auth = await getAuthorization();
  const jugados = new Map<string, number>();
  const PAGE = 100;

  for (let offset = 0; ; offset += PAGE) {
    const response = await getUserPlayedGames(auth, accountId, { limit: PAGE, offset });
    for (const title of response.titles) {
      jugados.set(claveTitulo(title.name), duracionEnMinutos(title.playDuration));
    }
    if (response.titles.length < PAGE) break;
  }

  return jugados;
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

  try {
    const jugados = await horasJugadas(accountId);
    // PSN da UNA cifra de horas por nombre de juego, no por versión: la
    // misma "Grand Theft Auto V" en PS4, PS5 y PS3 son tres filas nuestras
    // (trofeos distintos por diseño), pero una sola entrada en `jugados`.
    // Sin este `delete`, las tres se llevaban la cifra entera y un juego
    // con versión en varias consolas aparecía con las mismas horas
    // multiplicadas por cada copia al sumarlas en cualquier sitio. Se
    // asigna a la más reciente (así vienen ordenados los `games` que llegan
    // aquí) y el resto se queda sin dato, no a cero — cero diría "nunca
    // jugado", que no es verdad.
    for (const game of games) {
      const clave = claveTitulo(game.title);
      if (jugados.has(clave)) {
        game.playtimeMinutes = jugados.get(clave)!;
        jugados.delete(clave);
      }
    }
  } catch (error) {
    // La privacidad de actividad puede bloquear este endpoint; la biblioteca
    // de trofeos sigue siendo válida aunque no haya horas disponibles.
    console.error("No se pudieron obtener las horas jugadas de PSN", error);
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

  const groupNamesById = new Map<string, string>();
  if (definitions.hasTrophyGroups) {
    try {
      const groupsResponse = await getTitleTrophyGroups(auth, npCommunicationId, options);
      for (const group of groupsResponse.trophyGroups) {
        groupNamesById.set(group.trophyGroupId, group.trophyGroupName);
      }
    } catch (e) {
      console.error("No se pudieron obtener los grupos de trofeos para " + npCommunicationId, e);
    }
  }

  const earnedById = new Map(
    earnedList.trophies.map((t) => [t.trophyId, t]),
  );

  return definitions.trophies.map((definition) => {
    // La definición trae nombre, descripción e icono; el estado del jugador
    // trae si lo tiene, la rareza y el objetivo del hito parcial.
    const earned = earnedById.get(definition.trophyId);
    const rarity = Number(earned?.trophyEarnedRate);

    // psn-api no declara trophyGroupId en su tipo base de Trophy (o lo hace de forma opaca)
    // pero sí está en el payload real si hasTrophyGroups es true.
    const groupId = (definition as { trophyGroupId?: string }).trophyGroupId ?? "default";

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
      groupId,
      groupName: groupNamesById.get(groupId),
      progress: earned?.earned
        ? undefined
        : readProgress(earned, earned?.trophyProgressTargetValue),
    };
  });
}
