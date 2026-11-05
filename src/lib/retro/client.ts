import "server-only";
import { gameKey, type Game, type Trophy } from "@/lib/types";

/**
 * RetroAchievements (5 nov 2026): logros de juegos retro (NES, SNES, Mega
 * Drive, GBA, PS1, N64…) con su API web pública. Es lo más parecido que hay
 * a tener logros de Nintendo y de consolas clásicas.
 *
 * Autenticación: una sola clave del servidor (Ajustes de la cuenta de
 * RetroAchievements → "Keys" → Web API Key) en `RA_API_KEY`, y el nombre de
 * esa cuenta en `RA_API_USER`. Con ella se lee el perfil PÚBLICO de
 * cualquiera, igual que Steam: vincular es decir "este soy yo".
 *
 * Endpoints (https://api-docs.retroachievements.org):
 * - API_GetUserProfile          → existe, avatar, ULID.
 * - API_GetUserCompletionProgress → biblioteca con progreso (paginada, 500).
 * - API_GetGameInfoAndUserProgress → logros de un juego con lo conseguido.
 *
 * **Sin probar contra la API real desde aquí** (no hay clave en esta
 * sesión): la forma de los datos sale de su documentación. Antes de darlo
 * por bueno, `npx tsx scripts/probar-retro.mts <usuario>` (ver la trampa de
 * "la forma obvia" en docs/HANDOFF.md). Los campos que faltan dan listas
 * vacías, no errores.
 *
 * Puntúa: un juego "masterizado" (100 % en hardcore) o completado (100 % en
 * softcore) cuenta como platino, igual que el 100 % de Steam
 * (esPlatinoEquivalente). Los logros de tipo "missable" salen marcados como
 * perdibles.
 */

const API = "https://retroachievements.org/API";
const MEDIA = "https://media.retroachievements.org";

export class RetroConfigError extends Error {}
export class RetroNotFoundError extends Error {}

function credenciales(): URLSearchParams {
  const clave = process.env.RA_API_KEY;
  const usuario = process.env.RA_API_USER;
  if (!clave || !usuario) throw new RetroConfigError("Falta RA_API_KEY o RA_API_USER en el servidor.");
  return new URLSearchParams({ y: clave, z: usuario });
}

async function get<T>(endpoint: string, params: Record<string, string>): Promise<T | null> {
  const qs = credenciales();
  for (const [k, v] of Object.entries(params)) qs.set(k, v);
  const res = await fetch(`${API}/${endpoint}.php?${qs}`, {
    signal: AbortSignal.timeout(15_000),
    headers: { Accept: "application/json", "User-Agent": "Paragon/1.0 (+https://www.paragontrophies.com)" },
    cache: "no-store",
  });
  if (res.status === 401 || res.status === 403) throw new RetroConfigError(`RetroAchievements rechazó la clave (${res.status}).`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`RetroAchievements devolvió ${res.status} en ${endpoint}`);
  return (await res.json()) as T;
}

/** Fecha de RA ("2024-03-01 18:22:10", en UTC) a ISO; también acepta ISO ya hecho. */
export function fechaRetro(valor: string | null | undefined): string | undefined {
  if (!valor) return undefined;
  const iso = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(valor) ? `${valor.replace(" ", "T")}Z` : valor;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? new Date(t).toISOString() : undefined;
}

const medio = (ruta: string | null | undefined) => (ruta ? (ruta.startsWith("http") ? ruta : `${MEDIA}${ruta.startsWith("/") ? "" : "/"}${ruta}`) : undefined);

export interface PerfilRetro {
  usuario: string;
  avatarUrl: string | null;
  /** El ULID no cambia si la persona se cambia el nombre: es el id que se guarda. */
  id: string;
}

export async function resolveProfile(usuario: string): Promise<PerfilRetro> {
  const limpio = usuario.trim().replace(/^https?:\/\/retroachievements\.org\/user\//i, "").replace(/\/.*$/, "");
  if (!/^[A-Za-z0-9_]{2,32}$/.test(limpio)) throw new RetroNotFoundError("Ese nombre de usuario de RetroAchievements no es válido.");
  const p = await get<{ User?: string; ULID?: string; UserPic?: string }>("API_GetUserProfile", { u: limpio });
  if (!p?.User) throw new RetroNotFoundError("No existe ese usuario en RetroAchievements.");
  return { usuario: p.User, avatarUrl: medio(p.UserPic) ?? null, id: p.ULID ?? p.User };
}

interface Progreso {
  GameID: number;
  Title: string;
  ImageIcon?: string;
  ConsoleName?: string;
  MaxPossible?: number;
  NumAwarded?: number;
  NumAwardedHardcore?: number;
  MostRecentAwardedDate?: string;
  HighestAwardKind?: string | null;
}

/**
 * La biblioteca: los juegos en los que la persona tiene algún logro. `usuario`
 * es el nombre (o el ULID, que RA acepta en `u` igual que el nombre).
 */
export async function fetchLibrary(usuario: string): Promise<Game[]> {
  const juegos: Progreso[] = [];
  for (let pagina = 0; pagina < 10; pagina++) {
    const r = await get<{ Total?: number; Results?: Progreso[] }>("API_GetUserCompletionProgress", { u: usuario, c: "500", o: String(pagina * 500) });
    const lote = r?.Results ?? [];
    juegos.push(...lote);
    if (lote.length < 500 || juegos.length >= (r?.Total ?? 0)) break;
  }
  return juegos
    .filter((j) => (j.MaxPossible ?? 0) > 0)
    .map((j) => {
      const ganados = Math.max(j.NumAwarded ?? 0, j.NumAwardedHardcore ?? 0);
      const total = j.MaxPossible ?? 0;
      return {
        id: gameKey("retro", String(j.GameID)),
        platform: "retro" as const,
        title: j.Title,
        deviceLabel: j.ConsoleName ?? "Retro",
        iconUrl: medio(j.ImageIcon),
        lastPlayedAt: fechaRetro(j.MostRecentAwardedDate),
        progressPercent: total > 0 ? Math.round((ganados / total) * 100) : 0,
        definedTotal: total,
        earnedTotal: ganados,
      };
    })
    .sort((a, b) => (b.lastPlayedAt ?? "").localeCompare(a.lastPlayedAt ?? ""));
}

interface LogroRetro {
  ID: number;
  Title: string;
  Description?: string;
  Points?: number;
  BadgeName?: string;
  DisplayOrder?: number;
  NumAwarded?: number;
  DateEarned?: string | null;
  DateEarnedHardcore?: string | null;
  type?: string | null;
}

/** Los logros de un juego, con lo conseguido (en hardcore o softcore, la fecha más antigua). */
export async function fetchAchievements(usuario: string, gameId: string): Promise<Trophy[]> {
  const r = await get<{ NumDistinctPlayers?: number; Achievements?: Record<string, LogroRetro> }>("API_GetGameInfoAndUserProgress", { u: usuario, g: gameId });
  const jugadores = r?.NumDistinctPlayers ?? 0;
  return Object.values(r?.Achievements ?? {})
    .sort((a, b) => (a.DisplayOrder ?? 0) - (b.DisplayOrder ?? 0) || a.ID - b.ID)
    .map((a) => {
      const fechas = [fechaRetro(a.DateEarnedHardcore), fechaRetro(a.DateEarned)].filter((f): f is string => Boolean(f)).sort();
      return {
        id: String(a.ID),
        name: a.Title,
        detail: a.Description ?? "",
        grade: undefined,
        earned: fechas.length > 0,
        earnedAt: fechas[0],
        rarityPercent: jugadores > 0 && a.NumAwarded != null ? Math.round((a.NumAwarded / jugadores) * 1000) / 10 : undefined,
        iconUrl: a.BadgeName ? `${MEDIA}/Badge/${a.BadgeName}.png` : undefined,
        isMissable: a.type === "missable",
        xp: a.Points,
      };
    });
}

/** ¿Se puede leer? RA no tiene perfiles privados para logros: si existe, se lee. */
export async function canRead(usuario: string): Promise<boolean> {
  try {
    await get("API_GetUserCompletionProgress", { u: usuario, c: "1", o: "0" });
    return true;
  } catch (error) {
    if (error instanceof RetroConfigError) throw error;
    return false;
  }
}
