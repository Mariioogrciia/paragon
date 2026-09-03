import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { games, userGames } from "@/db/schema";
import { paragonLevelFromXp, type ParagonLevel } from "@/lib/level";

export async function getParagonLevel(userId: string): Promise<ParagonLevel> {
  const rows = await db
    .select({
      earned: userGames.earned,
      progressPercent: userGames.progressPercent,
      isWishlist: userGames.isWishlist,
      platform: games.platform,
    })
    .from(userGames)
    .innerJoin(games, eq(games.id, userGames.gameId))
    .where(eq(userGames.userId, userId));

  let xp = 0;
  for (const row of rows) {
    if (row.isWishlist) continue;
    const earned = (row.earned as Record<string, number> | null) ?? {};
    xp += (earned.bronze ?? 0) * 10;
    xp += (earned.silver ?? 0) * 25;
    xp += (earned.gold ?? 0) * 50;

    // Mutuamente excluyentes, igual que en lib/stats.ts (gameProgress) y
    // lib/level.ts (paragonProgress): un 100% de Steam vale como platino
    // (200 XP), no además de los 100 XP de "juego completado" — sería el
    // mismo hito contado dos veces.
    const esPlatino = (earned.platinum ?? 0) > 0 || (row.platform === "steam" && row.progressPercent === 100);
    if (esPlatino) {
      xp += 200;
    } else if (row.progressPercent === 100) {
      xp += 100;
    }
  }

  return paragonLevelFromXp(xp);
}
