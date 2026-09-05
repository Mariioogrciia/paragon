import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { games, userGames, userTrophies } from "@/db/schema";
import { paragonLevelFromXp, type ParagonLevel } from "@/lib/level";
import { xpSteamPorRareza } from "@/lib/trophyScore";

export async function getParagonLevel(userId: string): Promise<ParagonLevel> {
  const [rows, steamTrofeos] = await Promise.all([
    db
      .select({
        earned: userGames.earned,
        progressPercent: userGames.progressPercent,
        isWishlist: userGames.isWishlist,
        platform: games.platform,
      })
      .from(userGames)
      .innerJoin(games, eq(games.id, userGames.gameId))
      .where(eq(userGames.userId, userId)),
    // Mismo trato que en lib/level.ts (paragonProgress)/lib/profiles.ts
    // (getLibrary): los logros de Steam pesan por rareza real
    // (xpSteamPorRareza, de trophyScore.ts — los mismos tramos que Paragon
    // Score), no al peso plano de bronce que tenía esto antes.
    db
      .select({ rarityPercent: userTrophies.rarityPercent })
      .from(userTrophies)
      .innerJoin(games, eq(games.id, userTrophies.gameId))
      .innerJoin(
        userGames,
        and(eq(userGames.userId, userTrophies.userId), eq(userGames.gameId, userTrophies.gameId)),
      )
      .where(
        and(
          eq(userTrophies.userId, userId),
          eq(userTrophies.earned, true),
          eq(games.platform, "steam"),
          eq(userGames.isWishlist, false),
        ),
      ),
  ]);

  let xp = steamTrofeos.reduce((total, t) => total + xpSteamPorRareza(t.rarityPercent), 0);

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
