import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { syncRuns } from "@/db/schema";

export async function getSyncHistory(userId: string, limit = 20) {
  return db
    .select({
      id: syncRuns.id,
      platform: syncRuns.platform,
      games: syncRuns.games,
      newTrophies: syncRuns.newTrophies,
      createdAt: syncRuns.createdAt,
    })
    .from(syncRuns)
    .where(eq(syncRuns.userId, userId))
    .orderBy(desc(syncRuns.createdAt))
    .limit(limit);
}
