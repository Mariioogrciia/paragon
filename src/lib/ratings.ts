import "server-only";
import { and, avg, count, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { userGames } from "@/db/schema";

/**
 * Valoraciones de la comunidad.
 *
 * La nota de cada usuario vive en `user_game.rating`; la media es la de todos
 * los que han puntuado ese juego, no solo la del dueño del perfil. Es lo único
 * de la ficha que no sale de la plataforma de origen sino de la gente de aquí.
 */

export interface CommunityRating {
  average: number;
  votes: number;
}

/** Media y número de votos de un juego. Null si nadie lo ha puntuado. */
export async function getCommunityRating(gameId: string): Promise<CommunityRating | null> {
  const [row] = await db
    .select({
      average: avg(userGames.rating),
      votes: count(userGames.rating),
    })
    .from(userGames)
    .where(and(eq(userGames.gameId, gameId), isNotNull(userGames.rating)));

  const votes = Number(row?.votes ?? 0);
  if (votes === 0) return null;

  return { average: Number(row.average), votes };
}

/**
 * Lo mismo para muchos juegos de una vez.
 *
 * Una sola consulta agrupada: pedir la media juego a juego en una biblioteca
 * de trescientos títulos sería trescientas idas y venidas a la base.
 */
export async function getCommunityRatings(
  gameIds: string[],
): Promise<Map<string, CommunityRating>> {
  if (gameIds.length === 0) return new Map();

  const rows = await db
    .select({
      gameId: userGames.gameId,
      average: avg(userGames.rating),
      votes: count(userGames.rating),
    })
    .from(userGames)
    .where(and(inArray(userGames.gameId, gameIds), isNotNull(userGames.rating)))
    .groupBy(userGames.gameId);

  return new Map(
    rows
      .filter((r) => Number(r.votes) > 0)
      .map((r) => [
        r.gameId,
        { average: Number(r.average), votes: Number(r.votes) } satisfies CommunityRating,
      ]),
  );
}

/** Los juegos mejor valorados de la plataforma, para descubrir cosas. */
export async function topRatedGames(limit = 10, minVotes = 1) {
  return db
    .select({
      gameId: userGames.gameId,
      average: avg(userGames.rating),
      votes: count(userGames.rating),
    })
    .from(userGames)
    .where(isNotNull(userGames.rating))
    .groupBy(userGames.gameId)
    .having(sql`count(${userGames.rating}) >= ${minVotes}`)
    .orderBy(sql`avg(${userGames.rating}) desc`)
    .limit(limit);
}
