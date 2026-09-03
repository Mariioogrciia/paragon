import "server-only";
import { and, asc, desc, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { gameTrophies, games, userGames, userTrophies } from "@/db/schema";

export interface TrophyRecommendation {
  gameId: string;
  gameTitle: string;
  trophyId: string;
  trophyName: string;
  detail: string;
  rarityPercent: number | null;
  gameProgress: number;
}

export async function getTrophyRecommendations(userId: string, limit = 6): Promise<TrophyRecommendation[]> {
  const rows = await db
    .select({
      gameId: userTrophies.gameId,
      gameTitle: games.title,
      trophyId: userTrophies.trophyId,
      trophyName: gameTrophies.name,
      detail: gameTrophies.detail,
      rarityPercent: userTrophies.rarityPercent,
      gameProgress: userGames.progressPercent,
    })
    .from(userTrophies)
    .innerJoin(userGames, and(eq(userGames.userId, userTrophies.userId), eq(userGames.gameId, userTrophies.gameId)))
    .innerJoin(games, eq(games.id, userTrophies.gameId))
    .innerJoin(gameTrophies, and(eq(gameTrophies.gameId, userTrophies.gameId), eq(gameTrophies.trophyId, userTrophies.trophyId)))
    .where(and(eq(userTrophies.userId, userId), eq(userTrophies.earned, false), eq(userGames.isWishlist, false), isNotNull(userTrophies.rarityPercent)))
    // El platino nunca depende del DLC (ver repartoDlc en lib/stats.ts), así
    // que recomendar un trofeo de expansión antes que uno del juego base
    // manda a por lo que menos hace falta primero. `default` va delante de
    // cualquier otro groupId.
    .orderBy(
      sql`case when ${gameTrophies.groupId} = 'default' then 0 else 1 end`,
      desc(userGames.progressPercent),
      desc(userTrophies.rarityPercent),
      asc(userTrophies.earnedAt),
    )
    .limit(limit);

  return rows.map((row) => ({ ...row, rarityPercent: row.rarityPercent === null ? null : Number(row.rarityPercent) }));
}

import { getProfileByUserId, getLibrary } from "@/lib/profiles";
import { libraryFacets } from "@/lib/stats";
import { notInArray } from "drizzle-orm";

export interface GameRecommendation {
  igdbId: number;
  title: string;
  iconUrl?: string;
  genres: string[];
  reason: string;
  owners: number;
  ratingAverage: number | null;
}

/**
 * Obtiene recomendaciones de juegos para un usuario basándose en sus géneros más jugados.
 * Filtra los juegos que el usuario ya tiene (por igdbId).
 */
export async function getGameRecommendations(userId: string, limit = 12): Promise<GameRecommendation[]> {
  const profile = await getProfileByUserId(userId);
  if (!profile) return [];

  const { games: userGamesList } = await getLibrary(profile);

  // 1. Extraer los igdbId que el usuario ya tiene
  const ownedIgdbIds = new Set<number>();
  for (const g of userGamesList) {
    if (g.igdbId) ownedIgdbIds.add(g.igdbId);
  }

  // 2. Extraer los géneros favoritos
  const facets = libraryFacets(userGamesList);
  const topGenres = facets.genres.slice(0, 3).map((g) => g.value);

  const excludeIgdbIds = ownedIgdbIds.size > 0 ? Array.from(ownedIgdbIds) : [-1];

  const rows = await db
    .select({
      igdbId: games.igdbId,
      title: sql<string>`MAX(${games.title})`,
      iconUrl: sql<string>`MAX(${games.iconUrl})`,
      genres: sql<string>`MAX(CAST(${games.genres} AS text))`,
      owners: sql<number>`COUNT(DISTINCT ${userGames.userId})`,
      ratingAverage: sql<number>`AVG(${userGames.rating})`,
    })
    .from(games)
    .innerJoin(userGames, eq(userGames.gameId, games.id))
    .where(
      and(
        isNotNull(games.igdbId),
        notInArray(games.igdbId, excludeIgdbIds)
      )
    )
    .groupBy(games.igdbId)
    .having(sql`COUNT(DISTINCT ${userGames.userId}) > 0`)
    .orderBy(desc(sql`COUNT(DISTINCT ${userGames.userId})`));

  const recommended: GameRecommendation[] = [];
  
  for (const row of rows) {
    if (!row.igdbId) continue;
    let gameGenres: string[] = [];
    try {
      gameGenres = JSON.parse(row.genres) || [];
    } catch (e) {
      // Ignorar
    }

    // Ver si coincide con alguno de los géneros favoritos
    const match = topGenres.find(g => gameGenres.includes(g));
    
    if (match) {
      recommended.push({
        igdbId: row.igdbId,
        title: row.title,
        iconUrl: row.iconUrl ?? undefined,
        genres: gameGenres,
        reason: `Porque juegas a ${match}`,
        owners: Number(row.owners),
        ratingAverage: row.ratingAverage ? Number(Number(row.ratingAverage).toFixed(1)) : null,
      });
      
      if (recommended.length >= limit) break;
    }
  }

  // Si no llegamos al límite, rellenamos con los más populares
  if (recommended.length < limit) {
    for (const row of rows) {
      if (!row.igdbId) continue;
      if (recommended.some(r => r.igdbId === row.igdbId)) continue;
      
      let gameGenres: string[] = [];
      try {
        gameGenres = JSON.parse(row.genres) || [];
      } catch (e) {}

      recommended.push({
        igdbId: row.igdbId,
        title: row.title,
        iconUrl: row.iconUrl ?? undefined,
        genres: gameGenres,
        reason: `Muy popular en la comunidad`,
        owners: Number(row.owners),
        ratingAverage: row.ratingAverage ? Number(Number(row.ratingAverage).toFixed(1)) : null,
      });

      if (recommended.length >= limit) break;
    }
  }

  return recommended;
}
