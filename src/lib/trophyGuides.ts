import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { trophyGuides, users } from "@/db/schema";
import { avatarUrlSql } from "@/lib/avatarSql";

/**
 * Guías escritas de un trofeo concreto — dentro de la plataforma, no un
 * enlace de búsqueda hacia fuera (eso se queda como alternativa, ver
 * TrophyGuideModal.tsx). Una fila por (usuario, juego, trofeo): escribir de
 * nuevo hace `upsert`, no una fila aparte.
 */

export interface TrophyGuideRow {
  id: string;
  body: string;
  language: string;
  createdAt: string;
  updatedAt: string;
  authorId: string;
  authorHandle: string | null;
  authorName: string | null;
  authorImage: string | null;
}

export async function listTrophyGuides(gameId: string, trophyId: string): Promise<TrophyGuideRow[]> {
  const rows = await db
    .select({
      id: trophyGuides.id,
      body: trophyGuides.body,
      language: trophyGuides.language,
      createdAt: trophyGuides.createdAt,
      updatedAt: trophyGuides.updatedAt,
      authorId: users.id,
      authorHandle: users.handle,
      authorName: users.name,
      authorImage: avatarUrlSql(users.id, users.image, users.avatarPersonalizado),
    })
    .from(trophyGuides)
    .innerJoin(users, eq(users.id, trophyGuides.userId))
    .where(and(eq(trophyGuides.gameId, gameId), eq(trophyGuides.trophyId, trophyId)))
    .orderBy(desc(trophyGuides.updatedAt));

  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export class TrophyGuideError extends Error {}

const MAX_BODY = 4000;

/** Crea o actualiza (según exista ya la fila para este usuario+trofeo) la guía — nunca duplica. */
export async function upsertTrophyGuide(
  userId: string,
  gameId: string,
  trophyId: string,
  body: string,
  language = "es",
): Promise<void> {
  const limpio = body.trim();
  if (limpio.length === 0) throw new TrophyGuideError("Escribe algo antes de publicar.");
  if (limpio.length > MAX_BODY) throw new TrophyGuideError(`Como mucho ${MAX_BODY} caracteres.`);

  await db
    .insert(trophyGuides)
    .values({ gameId, trophyId, userId, body: limpio, language })
    .onConflictDoUpdate({
      target: [trophyGuides.userId, trophyGuides.gameId, trophyGuides.trophyId],
      set: { body: limpio, language, updatedAt: new Date() },
    });
}

export async function deleteTrophyGuide(userId: string, gameId: string, trophyId: string): Promise<void> {
  await db
    .delete(trophyGuides)
    .where(and(eq(trophyGuides.userId, userId), eq(trophyGuides.gameId, gameId), eq(trophyGuides.trophyId, trophyId)));
}
