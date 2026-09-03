import "server-only";
import { and, asc, desc, eq, isNotNull } from "drizzle-orm";
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
    .orderBy(desc(userGames.progressPercent), desc(userTrophies.rarityPercent), asc(userTrophies.earnedAt))
    .limit(limit);

  return rows.map((row) => ({ ...row, rarityPercent: row.rarityPercent === null ? null : Number(row.rarityPercent) }));
}
