import "server-only";
import { and, count, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { gameGoals, userTrophies } from "@/db/schema";

/**
 * Objetivos con fecha del Planificador (tabla `game_goal`). Si la tabla no
 * existiera, se devuelve vacío en vez de romper el Planificador entero.
 */
export async function getObjetivosFecha(userId: string): Promise<Record<string, string>> {
  try {
    const filas = await db
      .select({ gameId: gameGoals.gameId, fecha: gameGoals.fechaObjetivo })
      .from(gameGoals)
      .where(eq(gameGoals.userId, userId));
    return Object.fromEntries(filas.map((f) => [f.gameId, f.fecha]));
  } catch (error) {
    console.error("[goals]", error instanceof Error ? error.message : error);
    return {};
  }
}

export async function setObjetivoFecha(userId: string, gameId: string, fecha: string | null): Promise<void> {
  if (fecha === null) {
    await db.delete(gameGoals).where(and(eq(gameGoals.userId, userId), eq(gameGoals.gameId, gameId)));
    return;
  }
  await db
    .insert(gameGoals)
    .values({ userId, gameId, fechaObjetivo: fecha })
    .onConflictDoUpdate({ target: [gameGoals.userId, gameGoals.gameId], set: { fechaObjetivo: fecha } });
}

/** Trofeos al día de los últimos `dias` días (con fecha registrada). */
export async function ritmoReciente(userId: string, dias = 90): Promise<number> {
  const desde = new Date(Date.now() - dias * 86_400_000);
  const [fila] = await db
    .select({ n: count() })
    .from(userTrophies)
    .where(and(eq(userTrophies.userId, userId), eq(userTrophies.earned, true), gte(userTrophies.earnedAt, desde)));
  return Number(fila?.n ?? 0) / dias;
}
