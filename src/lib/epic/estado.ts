import "server-only";
import { and, eq, like } from "drizzle-orm";
import { db } from "@/db";
import { userGames } from "@/db/schema";

/**
 * Si ya ha llegado algún juego de Epic a la biblioteca (23 oct 2026). Verificar
 * la cuenta con el login de Epic la vincula, pero los logros solo llegan con
 * la extensión: sin esto, Ajustes enseñaba la cuenta "vinculada" y la
 * biblioteca seguía vacía sin decir por qué.
 */
export async function tieneJuegosDeEpic(userId: string): Promise<boolean> {
  const fila = await db
    .select({ gameId: userGames.gameId })
    .from(userGames)
    .where(and(eq(userGames.userId, userId), like(userGames.gameId, "epic-%")))
    .limit(1);
  return fila.length > 0;
}

/** El id de cuenta de Epic (32 hexadecimales) con el que se abre su página de logros, o null. */
export function idParaPaginaDeLogros(accountId: string | null | undefined): string | null {
  return accountId && /^[0-9a-f]{32}$/i.test(accountId) ? accountId.toLowerCase() : null;
}
