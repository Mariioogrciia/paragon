import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { games as gamesTable, userGames, users } from "@/db/schema";
import type { Game } from "@/lib/types";
import { esPlatinoEquivalente } from "@/lib/stats";

/**
 * "Cerrojo de Hitos": el juego reservado para tu PRÓXIMO platino — desde el
 * 8 nov 2026 el siguiente de verdad (tus platinos + 1), no el próximo número
 * redondo (#25, #50…), y reservar es lo mismo que anclar el juego como
 * objetivo (togglePinnedGame en lib/profiles.ts mantiene las dos cosas a la par).
 *
 * El número NUNCA se guarda — sale siempre de contar tus platinos actuales
 * en el momento de mirarlo, así que no queda desincronizado si sacas más
 * platinos mientras tanto.
 */
export function proximoHito(platinosActuales: number): number {
  return platinosActuales + 1;
}

export interface HitoReservado {
  gameId: string;
  titulo: string;
  iconUrl: string | null;
  numero: number;
}

/**
 * El juego reservado de un usuario, con el número de hito ya calculado —
 * `null` si no ha reservado nada o si el juego reservado YA se platinó
 * (en ese caso el cerrojo se cumplió solo, no hace falta seguir avisando).
 */
export async function getHitoReservado(userId: string, platinosActuales: number): Promise<HitoReservado | null> {
  const [u] = await db.select({ gameId: users.reservedMilestoneGameId }).from(users).where(eq(users.id, userId)).limit(1);
  if (!u?.gameId) return null;

  const [game] = await db.select({ title: gamesTable.title, iconUrl: gamesTable.iconUrl }).from(gamesTable).where(eq(gamesTable.id, u.gameId)).limit(1);
  if (!game) return null;

  return {
    gameId: u.gameId,
    titulo: game.title,
    iconUrl: game.iconUrl,
    numero: proximoHito(platinosActuales),
  };
}

/**
 * Reserva (o quita la reserva de) un juego para el próximo hito redondo.
 * Extraída de `toggleReservarHitoAction` (src/app/actions.ts) para
 * reutilizarla también desde `/api/mobile/*`. Solo uno a la vez: reservar
 * uno nuevo sustituye al anterior, una sola columna en `users`.
 */
export async function toggleReservedMilestone(userId: string, gameId: string): Promise<{ reservado: boolean }> {
  const [actual] = await db.select({ gameId: users.reservedMilestoneGameId }).from(users).where(eq(users.id, userId)).limit(1);
  const yaReservado = actual?.gameId === gameId;

  await db
    .update(users)
    .set({ reservedMilestoneGameId: yaReservado ? null : gameId })
    .where(eq(users.id, userId));

  // Reservar también lo ancla como objetivo (y quitar la reserva lo desancla):
  // las versiones de la app con los dos botones siguen funcionando igual.
  await db.update(userGames).set({ pinnedAt: null }).where(eq(userGames.userId, userId));
  if (!yaReservado) {
    await db.update(userGames).set({ pinnedAt: new Date() }).where(and(eq(userGames.userId, userId), eq(userGames.gameId, gameId)));
  }

  return { reservado: !yaReservado };
}

/** A un solo trofeo del platino (o 100% equivalente) — el caso que de verdad importa avisar antes de que pase. */
export function aUnTrofeoDelPlatino(game: Game): boolean {
  if (game.isWishlist || esPlatinoEquivalente(game)) return false;
  return game.definedTotal - game.earnedTotal === 1;
}
