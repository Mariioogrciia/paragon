import "server-only";
import { gameKey, type Game, type Trophy } from "@/lib/types";

/**
 * Cliente de OpenXBL (xbl.io), no de una API oficial de Microsoft.
 *
 * Xbox Live no tiene una API pública que deje leer el perfil de cualquier
 * jugador con solo su gamertag — la oficial (XSAPI) exige que CADA usuario
 * haga login con su propia cuenta Microsoft, justo el patrón que este
 * proyecto evita ("nadie entrega contraseñas ni tokens"). OpenXBL es un
 * servicio de un tercero que envuelve esa API privada con una única clave
 * de servidor — mismo modelo que PSN_NPSSO/STEAM_API_KEY en la forma de
 * usarlo, pero **no** en la garantía: no es de Microsoft, puede romperse,
 * cambiar de condiciones o cerrar sin avisar. Riesgo asumido a propósito
 * (ver HANDOFF.md), no un descuido.
 *
 * Todo esto se comprobó a mano contra la API real antes de escribir el
 * código (gamertag "TalkyLicense530", 4 de septiembre de 2026):
 * - `GET /api/v2/search/{gamertag}` resuelve el XUID — a diferencia de
 *   `/api/v2/player/gamertag/{gamertag}`, que devolvió un 404 "no route
 *   matches" con un gamertag inventado en vez de un "no encontrado" limpio.
 *   Por eso `resolveProfile` usa `search`, no `player/gamertag`.
 * - Sin la cabecera `Accept-Language` con un locale real, la API devuelve
 *   400 ("invalid locale value: *") en los endpoints de logros. Hace falta
 *   mandarla siempre.
 * - Xbox no tiene metales (bronce/plata/oro/platino) como PSN: cada logro
 *   da Gamerscore, más parecido a Steam.
 */

const API = "https://xbl.io/api/v2";

export class XblNotConfiguredError extends Error {
  constructor() {
    super("El servidor no tiene configurado el acceso a Xbox (falta XBL_API_KEY).");
    this.name = "XblNotConfiguredError";
  }
}

export class XblProfileNotFoundError extends Error {
  constructor(gamertag: string) {
    super(`Xbox no encuentra ningún gamertag "${gamertag}".`);
    this.name = "XblProfileNotFoundError";
  }
}

function apiKey(): string {
  const key = process.env.XBL_API_KEY;
  if (!key) throw new XblNotConfiguredError();
  return key;
}

/**
 * GET contra OpenXBL. Nunca se cachea (a diferencia de steam/client.ts, que
 * sí cachea su catálogo): aquí todo es progreso del jugador, que es
 * justamente lo que "Sincronizar ahora" quiere fresco.
 */
async function get<T>(path: string): Promise<T | null> {
  const key = apiKey();
  const response = await fetch(`${API}${path}`, {
    headers: {
      "X-Authorization": key,
      Accept: "application/json",
      // Sin esto, los endpoints de logros devuelven 400 — comprobado contra
      // la API real, no está en ninguna documentación pública.
      "Accept-Language": "en-US",
    },
    cache: "no-store",
  });

  if (!response.ok) return null;

  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

/* --------------------------------- Perfil --------------------------------- */

export interface ResolvedXblProfile {
  xuid: string;
  gamertag: string;
  avatarUrl?: string;
  gamerscore: number;
}

interface SearchResponse {
  content?: {
    people?: {
      xuid: string;
      gamertag: string;
      displayPicRaw?: string;
      gamerScore?: string;
    }[];
  };
}

/** Traduce un gamertag a su XUID y trae el perfil público asociado. */
export async function resolveProfile(gamertag: string): Promise<ResolvedXblProfile> {
  const data = await get<SearchResponse>(`/search/${encodeURIComponent(gamertag.trim())}`);
  const persona = data?.content?.people?.[0];
  if (!persona) throw new XblProfileNotFoundError(gamertag);

  return {
    xuid: persona.xuid,
    gamertag: persona.gamertag,
    avatarUrl: persona.displayPicRaw,
    gamerscore: Number(persona.gamerScore ?? 0),
  };
}

/**
 * ¿Podemos leer el historial de logros de este XUID?
 *
 * A diferencia de PSN/Steam (donde "perfil privado" es un error explícito
 * de la API), aquí no hay forma de distinguir "de verdad no ha jugado a
 * nada" de "tiene el historial de juegos oculto en su privacidad de Xbox" —
 * solo se ha podido probar contra una cuenta propia y pública. Se trata como
 * legible siempre que la petición responda una lista (aunque esté vacía);
 * solo se marca como no legible si la API falla de verdad (clave inválida,
 * XUID mal formado...).
 */
export async function canReadAchievements(xuid: string): Promise<boolean> {
  const data = await get<{ content?: { titles?: unknown[] } }>(`/achievements/player/${xuid}`);
  return Array.isArray(data?.content?.titles);
}

/* ------------------------------- Biblioteca ------------------------------- */

interface TitleEntry {
  titleId: string;
  name: string;
  displayImage?: string;
  devices?: string[];
  titleHistory?: { lastTimePlayed?: string };
}

const DEVICE_LABEL: Record<string, string> = {
  XboxSeries: "Xbox Series X|S",
  XboxOne: "Xbox One",
  Xbox360: "Xbox 360",
  PC: "PC",
  Win32: "PC",
};

/** El dispositivo "más Xbox" de la lista, para no enseñar "PC" de un juego que también tiene versión de consola. */
function deviceLabelFor(devices: string[] | undefined): string {
  const orden = ["XboxSeries", "XboxOne", "Xbox360", "PC", "Win32"];
  for (const d of orden) {
    if (devices?.includes(d)) return DEVICE_LABEL[d];
  }
  return "Xbox";
}

/**
 * Biblioteca de un jugador, a partir de su historial de logros — Xbox no
 * tiene un endpoint de "juegos poseídos" separado del de logros como Steam.
 *
 * Igual que Steam: aquí NO se calcula el progreso ni el total de logros.
 * `achievement.totalAchievements` de esta llamada ha salido a 0 en juegos
 * que sí tienen logros conseguidos (comprobado a mano) — un campo que no es
 * de fiar. El detalle real se trae juego a juego en la sincronización (ver
 * sync.ts), igual que ya se hace con Steam por el mismo motivo.
 */
export async function fetchLibrary(xuid: string): Promise<Game[]> {
  const data = await get<{ content?: { titles?: TitleEntry[] } }>(`/achievements/player/${xuid}`);
  const titles = data?.content?.titles;
  if (!titles) return [];

  return titles
    .map((t) => ({
      id: gameKey("xbox", t.titleId),
      platform: "xbox" as const,
      title: t.name,
      deviceLabel: deviceLabelFor(t.devices),
      iconUrl: t.displayImage,
      lastPlayedAt: t.titleHistory?.lastTimePlayed,
      progressPercent: 0,
      definedTotal: 0,
      earnedTotal: 0,
    }))
    .sort((a, b) => (b.lastPlayedAt ?? "").localeCompare(a.lastPlayedAt ?? ""));
}

/* --------------------------------- Logros --------------------------------- */

interface XblAchievement {
  id: string;
  name: string;
  description?: string;
  lockedDescription?: string;
  isSecret?: boolean;
  progressState: "Achieved" | "NotStarted" | "InProgress" | string;
  progression?: { timeUnlocked?: string };
  mediaAssets?: { type: string; url: string }[];
  rarity?: { currentPercentage?: number };
  rewards?: { type: string; value: string }[];
}

interface AchievementsResponse {
  content?: {
    achievements?: XblAchievement[];
    pagingInfo?: { continuationToken: string | null; totalRecords: number };
  };
}

/**
 * Todos los logros de un jugador para un juego.
 *
 * Paginado por si acaso: se ha comprobado con juegos de hasta 133 logros
 * (Minecraft) sin que hiciera falta una segunda página — el límite real por
 * página no se ha visto en la práctica. El bucle sigue `continuationToken`
 * mientras exista, con un tope de seguridad para no quedarse pillado si la
 * API cambiara de forma.
 */
export async function fetchAchievements(xuid: string, titleId: string): Promise<Trophy[]> {
  const todos: XblAchievement[] = [];
  let token: string | null = null;
  let paginas = 0;

  for (;;) {
    const qs: string = token ? `?continuationToken=${encodeURIComponent(token)}` : "";
    const data = await get<AchievementsResponse>(`/achievements/player/${xuid}/${titleId}${qs}`);
    const pagina = data?.content?.achievements ?? [];
    todos.push(...pagina);
    token = data?.content?.pagingInfo?.continuationToken ?? null;
    paginas += 1;
    if (!token || paginas >= 20) break;
  }

  return todos.map((a) => {
    const earned = a.progressState === "Achieved";
    return {
      id: a.id,
      name: a.name,
      // La descripción real, no la de "antes de conseguirlo" — igual que
      // PSN/Steam, `hidden` es lo que decide si la interfaz la enseña.
      detail: a.description ?? a.lockedDescription ?? "",
      // Xbox no tiene metales: el grado se queda sin definir, igual que Steam.
      grade: undefined,
      earned,
      earnedAt: earned && a.progression?.timeUnlocked ? a.progression.timeUnlocked : undefined,
      rarityPercent: a.rarity?.currentPercentage,
      hidden: a.isSecret ?? false,
      iconUrl: a.mediaAssets?.find((m) => m.type === "Icon")?.url,
      // El Gamerscore real (comprobado a mano: "rewards": [{"type":
      // "Gamerscore", "value": "15", ...}]) — para la puntuación unificada
      // entre plataformas, ver lib/paragonScore.ts.
      xp: (() => {
        const valor = Number(a.rewards?.find((r) => r.type === "Gamerscore")?.value);
        return Number.isFinite(valor) ? valor : undefined;
      })(),
    };
  });
}
