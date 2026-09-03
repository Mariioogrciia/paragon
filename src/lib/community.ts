import "server-only";
import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { games as gamesTable, userGames, users } from "@/db/schema";
import type { Platform } from "@/lib/types";

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
  id: string;
  platform: Platform;
  title: string;
  deviceLabel: string;
  iconUrl?: string;
  developer?: string;
  publisher?: string;
  genres?: string[];
  hasPlatinum: boolean;
}

export async function getGlobalGame(gameId: string): Promise<GlobalGame | null> {
  const [row] = await db
    .select({
      id: gamesTable.id,
      platform: gamesTable.platform,
      title: gamesTable.title,
      deviceLabel: gamesTable.deviceLabel,
      iconUrl: gamesTable.iconUrl,
      developer: gamesTable.developer,
      publisher: gamesTable.publisher,
      genres: gamesTable.genres,
      defined: gamesTable.defined,
    })
    .from(gamesTable)
    .where(eq(gamesTable.id, gameId))
    .limit(1);

  if (!row) return null;

  return {
    id: row.id,
    platform: row.platform,
    title: row.title,
    deviceLabel: row.deviceLabel,
    iconUrl: row.iconUrl ?? undefined,
    developer: row.developer ?? undefined,
    publisher: row.publisher ?? undefined,
    genres: row.genres ?? undefined,
    hasPlatinum: Boolean((row.defined as Record<string, number> | null)?.platinum),
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
  const [row] = await db
    .select({
      owners: sql<number>`count(*)`,
      playing: sql<number>`count(*) filter (where ${userGames.progressPercent} > 0 and ${userGames.progressPercent} < 100)`,
      completed: sql<number>`count(*) filter (where ${userGames.progressPercent} = 100)`,
      platinumed: sql<number>`count(*) filter (where cast(${userGames.earned}->>'platinum' as integer) > 0)`,
    })
    .from(userGames)
    .where(eq(userGames.gameId, gameId));

  return {
    owners: Number(row?.owners ?? 0),
    playing: Number(row?.playing ?? 0),
    completed: Number(row?.completed ?? 0),
    platinumed: Number(row?.platinumed ?? 0),
  };
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
  const rows = await db
    .select({
      userId: users.id,
      handle: users.handle,
      name: users.name,
      image: users.image,
      rating: userGames.rating,
      review: userGames.review,
      reviewDate: userGames.reviewDate,
    })
    .from(userGames)
    .innerJoin(users, eq(users.id, userGames.userId))
    .where(and(eq(userGames.gameId, gameId), isNotNull(userGames.review)))
    .orderBy(desc(userGames.reviewDate));

  return rows.map((r) => ({
    ...r,
    review: r.review ?? "",
    reviewDate: r.reviewDate ? r.reviewDate.toISOString() : null,
  }));
}

/** Si hace falta enlazar "ver mi ficha" sin arriesgarse a un 404. */
export async function ownsGame(userId: string, gameId: string): Promise<boolean> {
  const [row] = await db
    .select({ one: sql<number>`1` })
    .from(userGames)
    .where(and(eq(userGames.userId, userId), eq(userGames.gameId, gameId)))
    .limit(1);

  return Boolean(row);
}
