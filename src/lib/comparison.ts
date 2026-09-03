import "server-only";
import { and, eq, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import { gameTrophies, games, userTrophies } from "@/db/schema";

export interface SharedTrophyLead {
  gameId: string;
  gameTitle: string;
  trophyId: string;
  trophyName: string;
  firstUserId: string | null;
  firstAt: string | null;
  secondAt: string | null;
}

export async function sharedTrophyLeads(
  firstUserId: string,
  secondUserId: string,
  gameIds: string[],
): Promise<SharedTrophyLead[]> {
  if (gameIds.length === 0) return [];

  const rows = await db
    .select({
      gameId: userTrophies.gameId,
      gameTitle: games.title,
      trophyId: userTrophies.trophyId,
      trophyName: gameTrophies.name,
      userId: userTrophies.userId,
      earnedAt: userTrophies.earnedAt,
    })
    .from(userTrophies)
    .innerJoin(games, eq(games.id, userTrophies.gameId))
    .leftJoin(gameTrophies, and(
      eq(gameTrophies.gameId, userTrophies.gameId),
      eq(gameTrophies.trophyId, userTrophies.trophyId),
    ))
    .where(and(
      inArray(userTrophies.gameId, gameIds),
      or(eq(userTrophies.userId, firstUserId), eq(userTrophies.userId, secondUserId)),
      eq(userTrophies.earned, true),
    ));

  const grouped = new Map<string, SharedTrophyLead>();
  for (const row of rows) {
    const key = `${row.gameId}:${row.trophyId}`;
    const current = grouped.get(key) ?? {
      gameId: row.gameId,
      gameTitle: row.gameTitle,
      trophyId: row.trophyId,
      trophyName: row.trophyName ?? "Trofeo",
      firstUserId: null,
      firstAt: null,
      secondAt: null,
    };
    const date = row.earnedAt?.toISOString() ?? null;
    if (row.userId === firstUserId) current.firstAt = date;
    if (row.userId === secondUserId) current.secondAt = date;
    grouped.set(key, current);
  }

  return [...grouped.values()]
    .filter((row) => row.firstAt && row.secondAt)
    .map((row) => ({
      ...row,
      firstUserId: row.firstAt! < row.secondAt! ? firstUserId : row.secondAt! < row.firstAt! ? secondUserId : null,
    }))
    .sort((a, b) => (a.firstAt ?? "").localeCompare(b.firstAt ?? ""))
    .slice(0, 20);
}
