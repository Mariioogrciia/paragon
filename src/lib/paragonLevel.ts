import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userGames } from "@/db/schema";
import { paragonLevelFromXp, type ParagonLevel } from "@/lib/level";

export async function getParagonLevel(userId: string): Promise<ParagonLevel> {
  const rows = await db
    .select({ earned: userGames.earned, progressPercent: userGames.progressPercent, isWishlist: userGames.isWishlist })
    .from(userGames)
    .where(eq(userGames.userId, userId));

  let xp = 0;
  for (const row of rows) {
    if (row.isWishlist) continue;
    const earned = (row.earned as Record<string, number> | null) ?? {};
    xp += (earned.bronze ?? 0) * 10;
    xp += (earned.silver ?? 0) * 25;
    xp += (earned.gold ?? 0) * 50;
    xp += (earned.platinum ?? 0) * 200;
    if (row.progressPercent === 100) xp += 100;
  }

  return paragonLevelFromXp(xp);
}
