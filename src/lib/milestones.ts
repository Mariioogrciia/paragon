import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { games as gamesTable, users } from "@/db/schema";
import type { Game } from "@/lib/types";
import { esPlatinoEquivalente } from "@/lib/stats";

/**
 * "Cerrojo de Hitos": el juego reservado para tu PRÓXIMO platino en número
 * redondo (#25, #50, #100...) — para que ese número no caiga en un juego
 * de relleno por accidente.
 *
 * El número del hito NUNCA se guarda — sale siempre de contar tus platinos
 * actuales en el momento de mirarlo, así que no hay forma de que quede
 * desincronizado con un número viejo si sacas más platinos mientras tanto.
 */
export function proximoHito(platinosActuales: number): number {
  return Math.ceil((platinosActuales + 1) / 25) * 25;
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

/** A un solo trofeo del platino (o 100% equivalente) — el caso que de verdad importa avisar antes de que pase. */
export function aUnTrofeoDelPlatino(game: Game): boolean {
  if (game.isWishlist || esPlatinoEquivalente(game)) return false;
  return game.definedTotal - game.earnedTotal === 1;
}
