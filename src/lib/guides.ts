import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { gameGuideReplies, gameGuides, users } from "@/db/schema";

/**
 * Guías escritas de un juego, como un foro: alguien abre un hilo (título +
 * texto) y el resto responde. Distinto de la reseña express (una nota +
 * cuatro líneas) y del vídeo de un trofeo suelto (TrophyGuideModal, que ni
 * siquiera lo escribe nadie de aquí) — esto es para "cómo me planteo el
 * juego entero", con espacio para explicarlo.
 */

export interface GuideRow {
  id: string;
  gameId: string;
  title: string;
  body: string;
  createdAt: string;
  authorId: string;
  authorHandle: string | null;
  authorName: string | null;
  authorImage: string | null;
  respuestas: number;
}

export async function listGuides(gameId: string): Promise<GuideRow[]> {
  const rows = await db
    .select({
      id: gameGuides.id,
      gameId: gameGuides.gameId,
      title: gameGuides.title,
      body: gameGuides.body,
      createdAt: gameGuides.createdAt,
      authorId: users.id,
      authorHandle: users.handle,
      authorName: users.name,
      authorImage: users.image,
      respuestas: sql<number>`(select count(*) from ${gameGuideReplies} where ${gameGuideReplies.guideId} = ${gameGuides.id})`,
    })
    .from(gameGuides)
    .innerJoin(users, eq(users.id, gameGuides.userId))
    .where(eq(gameGuides.gameId, gameId))
    .orderBy(desc(gameGuides.createdAt));

  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    respuestas: Number(r.respuestas),
  }));
}

export interface ReplyRow {
  id: string;
  body: string;
  createdAt: string;
  authorId: string;
  authorHandle: string | null;
  authorName: string | null;
  authorImage: string | null;
}

export async function getGuide(guideId: string): Promise<(GuideRow & { replies: ReplyRow[] }) | null> {
  const [row] = await db
    .select({
      id: gameGuides.id,
      gameId: gameGuides.gameId,
      title: gameGuides.title,
      body: gameGuides.body,
      createdAt: gameGuides.createdAt,
      authorId: users.id,
      authorHandle: users.handle,
      authorName: users.name,
      authorImage: users.image,
    })
    .from(gameGuides)
    .innerJoin(users, eq(users.id, gameGuides.userId))
    .where(eq(gameGuides.id, guideId))
    .limit(1);

  if (!row) return null;

  const replyRows = await db
    .select({
      id: gameGuideReplies.id,
      body: gameGuideReplies.body,
      createdAt: gameGuideReplies.createdAt,
      authorId: users.id,
      authorHandle: users.handle,
      authorName: users.name,
      authorImage: users.image,
    })
    .from(gameGuideReplies)
    .innerJoin(users, eq(users.id, gameGuideReplies.userId))
    .where(eq(gameGuideReplies.guideId, guideId))
    .orderBy(asc(gameGuideReplies.createdAt));

  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    respuestas: replyRows.length,
    replies: replyRows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
  };
}

export async function createGuide(userId: string, gameId: string, title: string, body: string): Promise<string> {
  const id = crypto.randomUUID();
  await db.insert(gameGuides).values({ id, gameId, userId, title, body });
  return id;
}

export async function replyToGuide(userId: string, guideId: string, body: string): Promise<void> {
  await db.insert(gameGuideReplies).values({ id: crypto.randomUUID(), guideId, userId, body });
}

export async function deleteGuide(userId: string, guideId: string): Promise<void> {
  // Solo el autor puede borrar la suya — se comprueba en el WHERE, no antes:
  // así no hace falta una consulta extra para "¿es suyo?" antes de borrar.
  await db.delete(gameGuides).where(and(eq(gameGuides.id, guideId), eq(gameGuides.userId, userId)));
}
