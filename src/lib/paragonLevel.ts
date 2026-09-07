import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { games, userGames, userTrophies } from "@/db/schema";
import { paragonLevelFromXp, type ParagonLevel } from "@/lib/level";
import { xpSteamPorRareza } from "@/lib/trophyScore";

/**
 * Nivel Paragon de VARIOS usuarios a la vez, en dos consultas en total —
 * no dos por usuario.
 *
 * Existe por `/amigos`, que pintaba una clasificacion llamando a
 * `getParagonLevel` una vez por participante: con 5 personas eran 10
 * consultas, y una de ellas trae TODOS los trofeos de Steam de esa persona
 * (miles de filas). Contra un pool de 5 conexiones, esa pagina era la que
 * mas papeletas tenia de atascarlo.
 *
 * `getParagonLevel` (abajo) delega aqui: la cuenta de XP vive en UN solo
 * sitio, no en una version suelta y otra por lotes que se puedan
 * desincronizar con el tiempo.
 */
export async function getParagonLevels(
  userIds: string[],
): Promise<Map<string, ParagonLevel>> {
  if (userIds.length === 0) return new Map();

  const [filas, steamTrofeos] = await Promise.all([
    db
      .select({
        userId: userGames.userId,
        earned: userGames.earned,
        progressPercent: userGames.progressPercent,
        isWishlist: userGames.isWishlist,
        platform: games.platform,
      })
      .from(userGames)
      .innerJoin(games, eq(games.id, userGames.gameId))
      .where(inArray(userGames.userId, userIds)),
    // Los logros de Steam pesan por rareza real (xpSteamPorRareza, de
    // trophyScore.ts — los mismos tramos que Paragon Score), no al peso
    // plano de bronce que tenia esto antes. Mismo trato que en lib/level.ts
    // (paragonProgress) y lib/profiles.ts (getLibrary).
    db
      .select({ userId: userTrophies.userId, rarityPercent: userTrophies.rarityPercent })
      .from(userTrophies)
      .innerJoin(games, eq(games.id, userTrophies.gameId))
      .innerJoin(
        userGames,
        and(eq(userGames.userId, userTrophies.userId), eq(userGames.gameId, userTrophies.gameId)),
      )
      .where(
        and(
          inArray(userTrophies.userId, userIds),
          eq(userTrophies.earned, true),
          eq(games.platform, "steam"),
          eq(userGames.isWishlist, false),
        ),
      ),
  ]);

  const xpPorUsuario = new Map<string, number>(userIds.map((id) => [id, 0]));

  for (const t of steamTrofeos) {
    xpPorUsuario.set(t.userId, (xpPorUsuario.get(t.userId) ?? 0) + xpSteamPorRareza(t.rarityPercent));
  }

  for (const fila of filas) {
    if (fila.isWishlist) continue;

    const earned = (fila.earned as Record<string, number> | null) ?? {};
    let xp = (earned.bronze ?? 0) * 10 + (earned.silver ?? 0) * 25 + (earned.gold ?? 0) * 50;

    // Mutuamente excluyentes, igual que en lib/stats.ts (gameProgress) y
    // lib/level.ts (paragonProgress): un 100% de Steam vale como platino
    // (200 XP), no ademas de los 100 XP de "juego completado" — seria el
    // mismo hito contado dos veces.
    const esPlatino =
      (earned.platinum ?? 0) > 0 || (fila.platform === "steam" && fila.progressPercent === 100);
    if (esPlatino) xp += 200;
    else if (fila.progressPercent === 100) xp += 100;

    xpPorUsuario.set(fila.userId, (xpPorUsuario.get(fila.userId) ?? 0) + xp);
  }

  return new Map([...xpPorUsuario].map(([userId, xp]) => [userId, paragonLevelFromXp(xp)]));
}

export async function getParagonLevel(userId: string): Promise<ParagonLevel> {
  const niveles = await getParagonLevels([userId]);
  return niveles.get(userId) ?? paragonLevelFromXp(0);
}
