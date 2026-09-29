import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { playtimeIgnored, userGames } from "@/db/schema";

/**
 * "Ignorar las horas de este juego". PSN (y Steam) atribuyen las horas a la
 * CUENTA, no a la persona: si otra persona juega con tu cuenta en tu
 * consola, esas horas aparecen como tuyas (caso real: 2.109 h de Fortnite
 * que el usuario nunca jugó). El dato de la plataforma no se toca; solo se
 * deja de contar en estadísticas, rankings de horas y coste por hora.
 */

export async function getHorasIgnoradas(userId: string): Promise<Set<string>> {
  try {
    const filas = await db.select({ gameId: playtimeIgnored.gameId }).from(playtimeIgnored).where(eq(playtimeIgnored.userId, userId));
    return new Set(filas.map((f) => f.gameId));
  } catch {
    // Sin la tabla, nada ignorado: las horas se enseñan como siempre.
    return new Set();
  }
}

export async function setHorasIgnoradas(userId: string, gameId: string, ignorar: boolean): Promise<void> {
  if (ignorar) {
    await db.insert(playtimeIgnored).values({ userId, gameId }).onConflictDoNothing();
  } else {
    await db.delete(playtimeIgnored).where(and(eq(playtimeIgnored.userId, userId), eq(playtimeIgnored.gameId, gameId)));
  }
}

/** Condición SQL "estas horas NO están ignoradas", para las consultas que suman `user_game.playtimeMinutes` directamente. */
export const horasNoIgnoradasSql = sql`not exists (
  select 1 from ${playtimeIgnored} pi
  where pi."userId" = ${userGames.userId} and pi."gameId" = ${userGames.gameId}
)`;

/** Horas tal cual las da la plataforma y si están ignoradas — para el interruptor de la ficha del juego. */
export async function horasDeLaPlataforma(userId: string, gameId: string): Promise<{ minutos: number; ignoradas: boolean }> {
  const [[fila], ignoradas] = await Promise.all([
    db
      .select({ minutos: userGames.playtimeMinutes })
      .from(userGames)
      .where(and(eq(userGames.userId, userId), eq(userGames.gameId, gameId)))
      .limit(1),
    getHorasIgnoradas(userId),
  ]);
  return { minutos: fila?.minutos ?? 0, ignoradas: ignoradas.has(gameId) };
}
