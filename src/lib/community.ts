import "server-only";
import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { games as gamesTable, userGames, users } from "@/db/schema";
import { parseGameKey, type Platform } from "@/lib/types";
import { getGame } from "@/lib/igdb/client";
import { avatarUrlSql } from "@/lib/avatarSql";

/**
 * Ficha global de un juego: `/juego/[id]`.
 *
 * OJO con qué es "global" aquí: `games.id` es `<plataforma>-<id nativo>`, así
 * que esta página agrupa a todo el mundo que tiene ESA fila — el mismo
 * lanzamiento de PSN o de Steam — no "El Witcher 3" a través de todas las
 * plataformas a la vez. Unificar eso pediría un id canónico (de IGDB, por
 * ejemplo) casado con cada fila de PSN/Steam, que hoy no existe: solo los
 * juegos manuales llevan su id de IGDB en el `nativeId`. Es la misma
 * limitación que ya tiene toda la app (dos títulos iguales en dos
 * plataformas son dos filas, con logros que no se pueden mezclar), y aquí se
 * hereda a propósito en vez de fingir una unificación que no hay datos para
 * hacer bien.
 */

export interface GlobalGame {
  id: string; // The URL id (either igdbId as string, or legacy specific id)
  igdbId?: number | null; // For redirects from legacy id
  platform: Platform | "unified";
  title: string;
  deviceLabel: string;
  iconUrl?: string;
  developer?: string;
  publisher?: string;
  genres?: string[];
  pegi?: string;
  summary?: string;
  hasPlatinum: boolean;
  /** AppID de Steam (el nativeId de la fila `steam-<appid>`), si el juego
   * tiene una versión de Steam entre sus filas. Es lo único que acepta
   * CheapShark (ver lib/prices.ts) — para PSN o manual no hay comparador. */
  steamId?: string | null;
}

export async function getGlobalGame(gameId: string): Promise<GlobalGame | null> {
  const isNumeric = /^\d+$/.test(gameId);

  if (isNumeric) {
    const igdbId = parseInt(gameId, 10);
    const rows = await db
      .select({
        id: gamesTable.id,
        platform: gamesTable.platform,
        title: gamesTable.title,
        deviceLabel: gamesTable.deviceLabel,
        iconUrl: gamesTable.iconUrl,
        developer: gamesTable.developer,
        publisher: gamesTable.publisher,
        genres: gamesTable.genres,
        pegi: gamesTable.pegi,
        defined: gamesTable.defined,
      })
      .from(gamesTable)
      .where(eq(gamesTable.igdbId, igdbId));

    if (rows.length > 0) {
      const rep = rows[0];
      const hasPlatinum = rows.some((r) => Boolean((r.defined as any)?.platinum));
      const platforms = [...new Set(rows.map((r) => r.platform))];
      // Capitalize or just use the raw for now (we replace in the UI)
      const deviceLabel = platforms.join(" / ");
      const filaSteam = rows.find((r) => r.platform === "steam");

      return {
        id: gameId,
        igdbId,
        platform: platforms.length > 1 ? "unified" : platforms[0],
        title: rep.title,
        deviceLabel: deviceLabel,
        iconUrl: rep.iconUrl ?? undefined,
        developer: rep.developer ?? undefined,
        publisher: rep.publisher ?? undefined,
        genres: rep.genres ?? undefined,
        pegi: rep.pegi ?? undefined,
        hasPlatinum,
        steamId: filaSteam ? parseGameKey(filaSteam.id).nativeId : null,
      };
    }

    // Fallback a IGDB puro si no está en la base de datos
    const catalogGame = await getGame(igdbId);
    if (!catalogGame) return null;
    return {
      id: gameId, // usamos el mismo numérico para que la URL siga siendo /juego/123
      igdbId,
      platform: "manual",
      title: catalogGame.title,
      deviceLabel: catalogGame.platforms.join(", ") || "Catálogo IGDB",
      iconUrl: catalogGame.coverUrl,
      developer: catalogGame.developer,
      publisher: catalogGame.publisher,
      genres: catalogGame.genres,
      pegi: catalogGame.pegi,
      summary: catalogGame.summary,
      hasPlatinum: false,
    };
  }

  // Búsqueda por ID nativo/legado (ej. psn-NPWR12345)
  const [row] = await db
    .select({
      id: gamesTable.id,
      igdbId: gamesTable.igdbId,
      platform: gamesTable.platform,
      title: gamesTable.title,
      deviceLabel: gamesTable.deviceLabel,
      iconUrl: gamesTable.iconUrl,
      developer: gamesTable.developer,
      publisher: gamesTable.publisher,
      genres: gamesTable.genres,
      pegi: gamesTable.pegi,
      defined: gamesTable.defined,
    })
    .from(gamesTable)
    .where(eq(gamesTable.id, gameId))
    .limit(1);

  if (!row) return null;

  return {
    id: row.id,
    igdbId: row.igdbId,
    platform: row.platform,
    title: row.title,
    deviceLabel: row.deviceLabel,
    iconUrl: row.iconUrl ?? undefined,
    developer: row.developer ?? undefined,
    publisher: row.publisher ?? undefined,
    genres: row.genres ?? undefined,
    pegi: row.pegi ?? undefined,
    hasPlatinum: Boolean((row.defined as Record<string, number> | null)?.platinum),
    steamId: row.platform === "steam" ? parseGameKey(row.id).nativeId : null,
  };
}

export interface GlobalGameStats {
  owners: number;
  /** Empezado pero no al 100%. */
  playing: number;
  /** Al 100% (con o sin platino). */
  completed: number;
  /** Subconjunto de `completed` que además tiene el platino, en PSN. */
  platinumed: number;
}

/** Cuánta gente lo tiene, lo está jugando y lo ha terminado. */
export async function getGlobalGameStats(gameId: string): Promise<GlobalGameStats> {
  const isNumeric = /^\d+$/.test(gameId);

  let query = db
    .select({
      owners: sql<number>`count(*)`,
      playing: sql<number>`count(*) filter (where ${userGames.progressPercent} > 0 and ${userGames.progressPercent} < 100)`,
      completed: sql<number>`count(*) filter (where ${userGames.progressPercent} = 100)`,
      platinumed: sql<number>`count(*) filter (where cast(${userGames.earned}->>'platinum' as integer) > 0)`,
    })
    .from(userGames);

  if (isNumeric) {
    const igdbId = parseInt(gameId, 10);
    query = query
      .innerJoin(gamesTable, eq(gamesTable.id, userGames.gameId))
      .where(eq(gamesTable.igdbId, igdbId)) as any;
  } else {
    query = query.where(eq(userGames.gameId, gameId)) as any;
  }

  const [row] = await query;

  return {
    owners: Number(row?.owners ?? 0),
    playing: Number(row?.playing ?? 0),
    completed: Number(row?.completed ?? 0),
    platinumed: Number(row?.platinumed ?? 0),
  };
}

export interface TrophyBreakdown {
  platform: string;
  totalTrophies: number;
  totalPoints: number;
}

/**
 * Cuántos logros/trofeos define cada versión de este juego (una fila por
 * plataforma en la que existe: `games.id` = `<plataforma>-<id>`, misma
 * arquitectura de siempre), y a cuántos puntos de nivel de trofeos
 * equivalen en PSN.
 *
 * `defined` (el desglose por metal: bronce/plata/oro/platino) es SOLO de
 * PSN — Steam no tiene esa jerarquía, sus logros no llevan metal (ver el
 * comentario en schema.ts). Mirar solo `defined` aquí dejaba Steam siempre
 * a cero trofeos, en silencio: el total universal (todas las plataformas)
 * vive en `definedTotal`, y es ahí donde hay que mirar cuando no hay
 * desglose por metal.
 *
 * Los puntos son la fórmula real del nivel de trofeos de PSN (bronce 15,
 * plata 30, oro 90, platino 300 — la que Sony usa desde 2020), así que solo
 * tienen sentido donde hay metales que pesar: en Steam no existe un
 * "puntos de logro" oficial, así que ahí se queda a cero a propósito, no
 * inventado.
 */
export async function getGameTrophyBreakdown(igdbId: number): Promise<TrophyBreakdown[]> {
  const rows = await db
    .select({
      platform: gamesTable.platform,
      defined: gamesTable.defined,
      definedTotal: gamesTable.definedTotal,
    })
    .from(gamesTable)
    .where(eq(gamesTable.igdbId, igdbId));

  const breakdown: Record<string, TrophyBreakdown> = {};

  for (const row of rows) {
    const p = row.platform;
    if (!breakdown[p]) breakdown[p] = { platform: p, totalTrophies: 0, totalPoints: 0 };

    const d = row.defined as Record<string, number> | null;

    if (d && d.bronze !== undefined) {
      const bronce = Number(d.bronze) || 0;
      const plata = Number(d.silver) || 0;
      const oro = Number(d.gold) || 0;
      const platino = Number(d.platinum) || 0;
      breakdown[p].totalTrophies += bronce + plata + oro + platino;
      breakdown[p].totalPoints += bronce * 15 + plata * 30 + oro * 90 + platino * 300;
    } else {
      breakdown[p].totalTrophies += row.definedTotal ?? 0;
    }
  }

  return Object.values(breakdown).sort((a, b) => b.totalTrophies - a.totalTrophies);
}

export interface GameReview {
  userId: string;
  handle: string | null;
  name: string | null;
  image: string | null;
  rating: number | null;
  review: string;
  reviewDate: string | null;
}

/** Todas las reseñas de un juego, de cualquier usuario, no solo del dueño de un perfil. */
export async function getGameReviews(gameId: string): Promise<GameReview[]> {
  const isNumeric = /^\d+$/.test(gameId);

  let query = db
    .select({
      userId: users.id,
      handle: users.handle,
      name: users.name,
      image: avatarUrlSql(users.id, users.image, users.avatarPersonalizado),
      rating: userGames.rating,
      review: userGames.review,
      reviewDate: userGames.reviewDate,
    })
    .from(userGames)
    .innerJoin(users, eq(users.id, userGames.userId));

  if (isNumeric) {
    const igdbId = parseInt(gameId, 10);
    query = query
      .innerJoin(gamesTable, eq(gamesTable.id, userGames.gameId))
      .where(and(eq(gamesTable.igdbId, igdbId), isNotNull(userGames.review))) as any;
  } else {
    query = query.where(and(eq(userGames.gameId, gameId), isNotNull(userGames.review))) as any;
  }

  const rows = await query.orderBy(desc(userGames.reviewDate));

  return rows.map((r) => ({
    ...r,
    review: r.review ?? "",
    reviewDate: r.reviewDate ? r.reviewDate.toISOString() : null,
  }));
}

/** Si hace falta enlazar "ver mi ficha" sin arriesgarse a un 404. Devuelve el gameId específico que posee el usuario (útil para igdbId unificado) */
export async function ownsGame(userId: string, gameId: string): Promise<string | null> {
  const isNumeric = /^\d+$/.test(gameId);

  if (isNumeric) {
    const igdbId = parseInt(gameId, 10);
    const [row] = await db
      .select({ specificId: userGames.gameId })
      .from(userGames)
      .innerJoin(gamesTable, eq(gamesTable.id, userGames.gameId))
      .where(and(eq(userGames.userId, userId), eq(gamesTable.igdbId, igdbId)))
      .limit(1);
    return row?.specificId ?? null;
  }

  const [row] = await db
    .select({ specificId: userGames.gameId })
    .from(userGames)
    .where(and(eq(userGames.userId, userId), eq(userGames.gameId, gameId)))
    .limit(1);

  return row?.specificId ?? null;
}
