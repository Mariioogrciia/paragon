import "server-only";
import { and, avg, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { gameDifficultyVotes } from "@/db/schema";

/**
 * Dificultad votada por la comunidad: la segunda señal, junto a la estimada
 * por rareza (lib/difficulty.ts). Ver la nota de la tabla en db/schema.ts
 * sobre por qué es un eje distinto de la nota de la reseña.
 */

export interface DificultadComunidad {
  media: number;
  votos: number;
}

export async function getDificultadComunidad(gameId: string): Promise<DificultadComunidad | null> {
  const [row] = await db
    .select({ media: avg(gameDifficultyVotes.value), votos: count(gameDifficultyVotes.value) })
    .from(gameDifficultyVotes)
    .where(eq(gameDifficultyVotes.gameId, gameId));

  const votos = Number(row?.votos ?? 0);
  if (votos === 0) return null;

  return { media: Number(row.media), votos };
}

/** El voto que ha puesto un usuario concreto, si ha votado. */
export async function getMiVoto(userId: string, gameId: string): Promise<number | null> {
  const [row] = await db
    .select({ value: gameDifficultyVotes.value })
    .from(gameDifficultyVotes)
    .where(and(eq(gameDifficultyVotes.userId, userId), eq(gameDifficultyVotes.gameId, gameId)))
    .limit(1);

  return row?.value ?? null;
}

export async function votarDificultad(userId: string, gameId: string, value: number): Promise<void> {
  const acotado = Math.min(5, Math.max(1, Math.round(value)));

  await db
    .insert(gameDifficultyVotes)
    .values({ userId, gameId, value: acotado })
    .onConflictDoUpdate({
      target: [gameDifficultyVotes.userId, gameDifficultyVotes.gameId],
      set: { value: acotado },
    });
}
