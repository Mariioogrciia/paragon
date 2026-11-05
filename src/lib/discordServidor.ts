import "server-only";
import { and, desc, eq, ilike } from "drizzle-orm";
import { db } from "@/db";
import { discordGuildMembers, games, userGames, users } from "@/db/schema";
import { usuarioParagonDeDiscord } from "@/lib/discordBot";

/**
 * Quién de Paragon está en cada servidor de Discord (para `/ranking`) y
 * consultas mínimas para el autocompletado del bot. Ver
 * `discordGuildMembers` en db/schema.ts.
 */

const tablaFalta = (error: unknown) => (error as { cause?: { code?: string } })?.cause?.code === "42P01";

/** Apunta (o refresca) a esta persona en el servidor. Nunca lanza. */
export async function apuntarMiembroServidor(guildId: string, discordUserId: string): Promise<void> {
  try {
    const userId = await usuarioParagonDeDiscord(discordUserId);
    if (!userId) return;
    await db
      .insert(discordGuildMembers)
      .values({ guildId, userId })
      .onConflictDoUpdate({ target: [discordGuildMembers.guildId, discordGuildMembers.userId], set: { vistoAt: new Date() } });
  } catch (error) {
    if (!tablaFalta(error)) console.error("[discordServidor] apuntar", error);
  }
}

export async function miembrosParagonDelServidor(guildId: string): Promise<{ userId: string; nombre: string }[]> {
  try {
    const filas = await db
      .select({ userId: users.id, handle: users.handle, name: users.name })
      .from(discordGuildMembers)
      .innerJoin(users, eq(users.id, discordGuildMembers.userId))
      .where(eq(discordGuildMembers.guildId, guildId))
      .orderBy(desc(discordGuildMembers.vistoAt))
      .limit(200);
    return filas.map((f) => ({ userId: f.userId, nombre: f.name ?? (f.handle ? `@${f.handle}` : "Alguien") }));
  } catch (error) {
    if (tablaFalta(error)) return [];
    throw error;
  }
}

/** Títulos de la biblioteca que contienen lo escrito, para el autocompletado (rápido: sin `getLibrary`). */
export async function titulosParaAutocompletar(userId: string, texto: string): Promise<string[]> {
  const limpio = texto.replace(/[%_\\]/g, "").trim();
  const filas = await db
    .select({ titulo: games.title })
    .from(userGames)
    .innerJoin(games, eq(games.id, userGames.gameId))
    .where(and(eq(userGames.userId, userId), eq(userGames.isWishlist, false), limpio ? ilike(games.title, `%${limpio}%`) : undefined))
    .orderBy(desc(userGames.lastPlayedAt))
    .limit(25);
  return filas.map((f) => f.titulo);
}
