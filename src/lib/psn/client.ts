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

interface HorasJugadas {
  /**
   * "ps4_game" | "ps5_native_game" | "pspc_game" | "ps3_game" | "unknown"…
   * — de qué versión concreta es esta sesión, para poder repartirla si hace
   * falta (ver `categoriaEsDelDispositivo`).
   */
  categoria: string;
  minutos: number;
}

/**
 * Horas jugadas, agrupadas por nombre — SIN colapsar a una sola cifra.
 *
 * El endpoint de PSN da una fila por CADA versión que se ha jugado de
 * verdad: "Grand Theft Auto V" en PS4 y su versión "PlayStation®5" nativa
 * son dos filas con horas propias (1620 h y 95 h en un caso real que
 * motivó este código), no la misma cifra repetida. Se guardan todas y es
 * `repartirHoras` quien decide, fila a fila, si hay que sumarlas o
 * repartirlas.
 */
async function horasJugadas(accountId: string): Promise<Map<string, HorasJugadas[]>> {
  const auth = await getAuthorization();
  const jugados = new Map<string, HorasJugadas[]>();
  const PAGE = 100;

  for (let offset = 0; ; offset += PAGE) {
    const response = await getUserPlayedGames(auth, accountId, { limit: PAGE, offset });
    for (const title of response.titles) {
      const clave = claveTitulo(title.name);
      const entrada = { categoria: title.category, minutos: duracionEnMinutos(title.playDuration) };
      jugados.set(clave, [...(jugados.get(clave) ?? []), entrada]);
    }
    if (response.titles.length < PAGE) break;
  }

  return jugados;
}

/** Si una sesión de "ps4_game"/"ps5_native_game"/etc. es de esta ficha, por su deviceLabel ("PS4", "PS5", "PS3"...). */
function categoriaEsDelDispositivo(categoria: string, deviceLabel: string): boolean {
  const d = deviceLabel.toLowerCase();
  if (categoria === "ps5_native_game") return d.includes("ps5");
  if (categoria === "ps4_game") return d.includes("ps4");
  if (categoria === "ps3_game") return d.includes("ps3");
  if (categoria === "pspc_game") return d.includes("pc");
  return false; // "unknown" u otra categoría nueva: no se reparte con confianza.
}

/**
 * Reparte las horas jugadas entre las fichas de trofeos de un mismo nombre.
 *
 * Dos casos reales, distintos:
 * 1. Una sola ficha para varias sesiones (típico cross-gen: la lista de
 *    trofeos de PS4 vale también jugando en PS5) → se SUMAN todas.
 * 2. Varias fichas — trofeos distintos por generación de verdad — → cada
 *    sesión va a la ficha cuyo `deviceLabel` encaja con su categoría; lo
 *    que no encaje con ninguna se le añade a la que se quede sin dato,
 *    antes que perderlo.
 */
function repartirHoras(fichas: Game[], sesiones: HorasJugadas[]): void {
  if (fichas.length === 1) {
    fichas[0].playtimeMinutes = sesiones.reduce((total, s) => total + s.minutos, 0);
    return;
  }

  const sinAsignar = [...sesiones];
  for (const ficha of fichas) {
    let total = 0;
    for (let i = sinAsignar.length - 1; i >= 0; i--) {
      if (categoriaEsDelDispositivo(sinAsignar[i].categoria, ficha.deviceLabel)) {
        total += sinAsignar[i].minutos;
        sinAsignar.splice(i, 1);
      }
    }
    if (total > 0) ficha.playtimeMinutes = total;
  }

  if (sinAsignar.length > 0) {
    const sinDatos = fichas.find((f) => f.playtimeMinutes === undefined);
    if (sinDatos) sinDatos.playtimeMinutes = sinAsignar.reduce((total, s) => total + s.minutos, 0);
  }
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

    // Agrupar nuestras fichas por el mismo nombre normalizado que usan las
    // horas, para poder repartir sesión a sesión (ver repartirHoras).
    const fichasPorNombre = new Map<string, Game[]>();
    for (const game of games) {
      const clave = claveTitulo(game.title);
      fichasPorNombre.set(clave, [...(fichasPorNombre.get(clave) ?? []), game]);
    }

    for (const [clave, sesiones] of jugados) {
      const fichas = fichasPorNombre.get(clave);
      if (fichas && fichas.length > 0) repartirHoras(fichas, sesiones);
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
