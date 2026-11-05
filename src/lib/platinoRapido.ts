import "server-only";
import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { games, gameTrophies, userGames, userTrophies, users } from "@/db/schema";
import { avatarUrlSql } from "@/lib/avatarSql";
import { duracionPlatino } from "@/lib/platinoRapidoReglas";

export interface PlatinoRapido {
  userId: string;
  handle: string | null;
  nombre: string | null;
  avatarUrl: string | null;
  platform: string;
  inicio: string;
  fin: string;
  /** Milisegundos del primer trofeo al platino (o al último logro, en Steam). */
  duracionMs: number;
}

/**
 * "Platinos más rápidos" de un juego (5 nov 2026): del primer trofeo al
 * platino, entre quien lo tiene en Paragon. En PSN cuenta la fecha del
 * trofeo de platino; en Steam (sin platino), la del último logro de quien
 * está al 100 %. Epic no entra: su progreso es declarado (lib/declarado.ts).
 *
 * `gameId` como en la ficha pública: un igdbId (todas las versiones del
 * juego) o un `games.id` suelto.
 */
export async function platinosMasRapidos(gameId: string, limite = 10): Promise<PlatinoRapido[]> {
  const ids = /^\d+$/.test(gameId)
    ? (await db.select({ id: games.id }).from(games).where(eq(games.igdbId, parseInt(gameId, 10)))).map((g) => g.id)
    : [gameId];
  if (ids.length === 0) return [];

  const filas = await db
    .select({
      userId: userTrophies.userId,
      handle: users.handle,
      nombre: users.name,
      avatarUrl: avatarUrlSql(users.id, users.image, users.avatarPersonalizado),
      platform: games.platform,
      inicio: sql<string>`min(${userTrophies.earnedAt})`,
      finPlatino: sql<string | null>`max(${userTrophies.earnedAt}) filter (where ${gameTrophies.grade} = 'platinum')`,
      finUltimo: sql<string>`max(${userTrophies.earnedAt})`,
    })
    .from(userTrophies)
    .innerJoin(games, eq(games.id, userTrophies.gameId))
    .innerJoin(userGames, and(eq(userGames.userId, userTrophies.userId), eq(userGames.gameId, userTrophies.gameId)))
    .innerJoin(users, eq(users.id, userTrophies.userId))
    .leftJoin(gameTrophies, and(eq(gameTrophies.gameId, userTrophies.gameId), eq(gameTrophies.trophyId, userTrophies.trophyId)))
    .where(
      and(
        inArray(userTrophies.gameId, ids),
        eq(userTrophies.earned, true),
        isNotNull(userTrophies.earnedAt),
        isNotNull(users.handle),
        sql`(coalesce(cast(${userGames.earned}->>'platinum' as integer), 0) > 0 or (${games.platform} = 'steam' and ${userGames.progressPercent} = 100))`,
      ),
    )
    .groupBy(userTrophies.userId, users.handle, users.name, users.id, users.image, users.avatarPersonalizado, games.platform)
    .limit(500);

  const lista: PlatinoRapido[] = [];
  for (const f of filas) {
    const fin = f.platform === "steam" ? f.finUltimo : f.finPlatino;
    const duracionMs = duracionPlatino(f.inicio, fin);
    if (duracionMs === null) continue;
    lista.push({ userId: f.userId, handle: f.handle, nombre: f.nombre, avatarUrl: f.avatarUrl, platform: f.platform, inicio: f.inicio, fin: fin!, duracionMs });
  }
  // Una persona con el juego en dos plataformas: su mejor marca.
  const mejores = new Map<string, PlatinoRapido>();
  for (const p of lista) {
    const actual = mejores.get(p.userId);
    if (!actual || p.duracionMs < actual.duracionMs) mejores.set(p.userId, p);
  }
  return [...mejores.values()].sort((a, b) => a.duracionMs - b.duracionMs).slice(0, limite);
}
