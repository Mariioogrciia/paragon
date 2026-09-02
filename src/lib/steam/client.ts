import "server-only";
import { gameKey, type Game, type Trophy } from "@/lib/types";

/**
 * Cliente de la Steam Web API.
 *
 * Mismo modelo que PSN: UNA credencial del servidor (STEAM_API_KEY) con la que
 * se leen los perfiles *públicos* de todos los usuarios. Nadie entrega su
 * contraseña de Steam, y vincular una cuenta es solo decir "este soy yo ahí".
 *
 * A cambio, el perfil y los detalles de juego del usuario tienen que estar en
 * público en Steam: si no, la API devuelve el perfil vacío y no hay nada que
 * sincronizar. Eso se comprueba al vincular para poder explicarlo.
 */

const API = "https://api.steampowered.com";
const STORE = "https://store.steampowered.com/api";

export class SteamNotConfiguredError extends Error {
  constructor() {
    super("El servidor no tiene configurado el acceso a Steam (falta STEAM_API_KEY).");
    this.name = "SteamNotConfiguredError";
  }
}

export class SteamProfileNotFoundError extends Error {
  constructor(input: string) {
    super(`Steam no encuentra ningún perfil con "${input}".`);
    this.name = "SteamProfileNotFoundError";
  }
}

export class SteamPrivateProfileError extends Error {
  constructor(name: string) {
    super(
      `El perfil de Steam de ${name} es privado. En Steam: Perfil → Editar perfil → ` +
        `Privacidad, pon "Mi perfil" y "Detalles del juego" en público.`,
    );
    this.name = "SteamPrivateProfileError";
  }
}

function apiKey(): string {
  const key = process.env.STEAM_API_KEY;
  if (!key) throw new SteamNotConfiguredError();
  return key;
}

/**
 * GET contra Steam devolviendo JSON.
 *
 * Steam responde 400/403 con cuerpo vacío en varios casos normales (un juego
 * sin logros, un perfil privado), así que el que llama decide si un fallo es
 * un error de verdad o un "aquí no hay nada".
 *
 * `cacheable` distingue las dos clases de llamada que hacemos: el catálogo
 * (definiciones de logros, rarezas globales, ficha de tienda) cambia de mes en
 * mes y se cachea; lo del jugador (biblioteca, logros conseguidos) NO se
 * cachea nunca, porque si no "Sincronizar ahora" devolvería lo de hace una
 * hora, que es justo lo contrario de lo que pide el botón.
 */
async function get<T>(url: string, cacheable = false): Promise<T | null> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    ...(cacheable ? { next: { revalidate: 86_400 } } : { cache: "no-store" as const }),
  });

  if (!response.ok) return null;

  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

/* --------------------------------- Perfil --------------------------------- */

export interface ResolvedSteamProfile {
  steamId: string;
  personaName: string;
  avatarUrl?: string;
  isPublic: boolean;
}

const STEAM_ID_RE = /^\d{17}$/;

/** Saca el trozo útil de lo que pegue el usuario: URL, vanity o SteamID64. */
function parseInput(input: string): { kind: "id" | "vanity"; value: string } {
  const clean = input.trim().replace(/\/+$/, "");

  const profileUrl = clean.match(/steamcommunity\.com\/profiles\/(\d{17})/i);
  if (profileUrl) return { kind: "id", value: profileUrl[1] };

  const vanityUrl = clean.match(/steamcommunity\.com\/id\/([^/?#]+)/i);
  if (vanityUrl) return { kind: "vanity", value: vanityUrl[1] };

  if (STEAM_ID_RE.test(clean)) return { kind: "id", value: clean };

  return { kind: "vanity", value: clean };
}

/** Traduce lo que escriba el usuario a un SteamID64 con su perfil público. */
export async function resolveProfile(input: string): Promise<ResolvedSteamProfile> {
  const key = apiKey();
  const parsed = parseInput(input);

  let steamId = parsed.value;

  if (parsed.kind === "vanity") {
    const resolved = await get<{ response: { success: number; steamid?: string } }>(
      `${API}/ISteamUser/ResolveVanityURL/v1/?key=${key}&vanityurl=${encodeURIComponent(parsed.value)}`,
    );

    if (resolved?.response?.success !== 1 || !resolved.response.steamid) {
      throw new SteamProfileNotFoundError(input);
    }

    steamId = resolved.response.steamid;
  }

  const summary = await get<{
    response: {
      players: {
        steamid: string;
        personaname: string;
        avatarfull?: string;
        communityvisibilitystate?: number;
      }[];
    };
  }>(`${API}/ISteamUser/GetPlayerSummaries/v2/?key=${key}&steamids=${steamId}`);

  const player = summary?.response?.players?.[0];
  if (!player) throw new SteamProfileNotFoundError(input);

  return {
    steamId: player.steamid,
    personaName: player.personaname,
    avatarUrl: player.avatarfull,
    // 3 es "público"; cualquier otro valor es amigos o privado.
    isPublic: player.communityvisibilitystate === 3,
  };
}

/**
 * ¿Podemos leer la biblioteca de esta cuenta?
 *
 * Ser público de perfil no basta: "Detalles del juego" es un ajuste aparte, y
 * es el que decide si `GetOwnedGames` devuelve algo.
 */
export async function canReadLibrary(steamId: string): Promise<boolean> {
  const owned = await get<{ response: { game_count?: number } }>(
    `${API}/IPlayerService/GetOwnedGames/v1/?key=${apiKey()}&steamid=${steamId}&include_played_free_games=1`,
  );

  return typeof owned?.response?.game_count === "number";
}

/* ------------------------------- Biblioteca ------------------------------- */

interface OwnedGame {
  appid: number;
  name?: string;
  playtime_forever?: number;
  rtime_last_played?: number;
  has_community_visible_stats?: boolean;
}

/** La carátula ancha de la tienda: es la que mejor queda en las tarjetas. */
function headerImage(appid: number): string {
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`;
}

/**
 * Biblioteca de un jugador, ordenada por lo más reciente.
 *
 * Steam no devuelve el porcentaje de logros aquí — habría que pedir los logros
 * juego a juego, que son cientos de llamadas. Los juegos salen a cero y el
 * porcentaje se rellena cuando se sincroniza el detalle (ver sync.ts).
 */
export async function fetchLibrary(steamId: string): Promise<Game[]> {
  const owned = await get<{ response: { games?: OwnedGame[] } }>(
    `${API}/IPlayerService/GetOwnedGames/v1/?key=${apiKey()}&steamid=${steamId}` +
      `&include_appinfo=1&include_played_free_games=1`,
  );

  const list = owned?.response?.games;
  if (!list) return [];

  return list
    .map((g) => ({
      id: gameKey("steam", String(g.appid)),
      platform: "steam" as const,
      title: g.name ?? `App ${g.appid}`,
      deviceLabel: "PC",
      iconUrl: headerImage(g.appid),
      lastPlayedAt: g.rtime_last_played
        ? new Date(g.rtime_last_played * 1000).toISOString()
        : undefined,
      progressPercent: 0,
      definedTotal: 0,
      earnedTotal: 0,
      playtimeMinutes: g.playtime_forever ?? 0,
    }))
    .sort((a, b) => (b.lastPlayedAt ?? "").localeCompare(a.lastPlayedAt ?? ""));
}

/* --------------------------------- Logros --------------------------------- */

interface SchemaAchievement {
  name: string;
  displayName?: string;
  description?: string;
  icon?: string;
  icongray?: string;
  hidden?: number;
}

interface PlayerAchievement {
  apiname: string;
  achieved: number;
  unlocktime?: number;
}

/**
 * Logros de un juego para un jugador.
 *
 * Tres llamadas y un cruce, igual que en PSN: la *definición* (nombres,
 * iconos) es común a todos, el *estado* es del jugador, y la *rareza* global
 * es del juego. La rareza es opcional: sin ella los logros siguen saliendo,
 * solo que sin la etiqueta de "muy raro".
 */
export async function fetchAchievements(
  steamId: string,
  appId: string,
): Promise<Trophy[]> {
  const key = apiKey();

  const [schema, player, global] = await Promise.all([
    get<{ game?: { availableGameStats?: { achievements?: SchemaAchievement[] } } }>(
      `${API}/ISteamUserStats/GetSchemaForGame/v2/?key=${key}&appid=${appId}&l=spanish`,
      true,
    ),
    get<{ playerstats?: { achievements?: PlayerAchievement[]; success?: boolean } }>(
      `${API}/ISteamUserStats/GetPlayerAchievements/v1/?key=${key}&steamid=${steamId}&appid=${appId}&l=spanish`,
    ),
    get<{
      achievementpercentages?: { achievements?: { name: string; percent: number | string }[] };
    }>(
      `${API}/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/?gameid=${appId}`,
      true,
    ),
  ]);

  const definitions = schema?.game?.availableGameStats?.achievements ?? [];
  if (definitions.length === 0) return [];

  const stateByName = new Map(
    (player?.playerstats?.achievements ?? []).map((a) => [a.apiname, a]),
  );
  // Steam devuelve el porcentaje como texto ("88.5"), no como número: sin este
  // Number() acabaría siendo una cadena en la base y reventaría al formatearla.
  const rarityByName = new Map(
    (global?.achievementpercentages?.achievements ?? []).map((a) => {
      const percent = Number(a.percent);
      return [a.name, Number.isFinite(percent) ? percent : undefined] as const;
    }),
  );

  return definitions.map((definition) => {
    const state = stateByName.get(definition.name);
    const earned = state?.achieved === 1;

    return {
      id: definition.name,
      name: definition.displayName || definition.name,
      detail: definition.description ?? "",
      // Steam no tiene metales: el grado se queda sin definir a propósito.
      grade: undefined,
      earned,
      earnedAt: state?.unlocktime
        ? new Date(state.unlocktime * 1000).toISOString()
        : undefined,
      rarityPercent: rarityByName.get(definition.name),
      hidden: definition.hidden === 1,
      // El icono gris es el del logro sin conseguir: así se ve la diferencia.
      iconUrl: earned ? definition.icon : (definition.icongray ?? definition.icon),
    };
  });
}

/* ------------------------------- Metadatos -------------------------------- */

export interface StoreMetadata {
  developer?: string;
  publisher?: string;
  genres?: string[];
}

/**
 * Desarrolladora, editora y géneros, de la API pública de la tienda.
 *
 * Va muy limitada de peticiones (unas 200 cada 5 minutos), así que se pide una
 * vez por juego y se guarda. Si falla, no pasa nada: son metadatos para
 * agrupar, no datos de progreso.
 */
export async function fetchStoreMetadata(appId: string): Promise<StoreMetadata | null> {
  const details = await get<
    Record<
      string,
      {
        success?: boolean;
        data?: {
          developers?: string[];
          publishers?: string[];
          genres?: { description: string }[];
        };
      }
    >
  >(`${STORE}/appdetails?appids=${appId}&l=spanish&cc=es`, true);

  const entry = details?.[appId];
  if (!entry?.success || !entry.data) return null;

  return {
    developer: entry.data.developers?.[0],
    publisher: entry.data.publishers?.[0],
    genres: entry.data.genres?.map((g) => g.description),
  };
}
