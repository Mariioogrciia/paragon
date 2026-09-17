import { getDb } from "@/db";
import { activities, users, games, activityComments, activityReactions, activityViews } from "@/db/schema";
import { inArray, desc, eq, and, sql } from "drizzle-orm";
import { listFriends } from "./profiles";
import { avatarUrlSql } from "@/lib/avatarSql";

/**
 * Reaccionar/quitar reacción a una publicación del Feed — función pura por
 * `userId`, mismo patrón que `togglePinnedGame` (lib/profiles.ts):
 * `toggleActivityReactionAction` (app/actions.ts) es ahora un envoltorio
 * fino sobre esto, y `POST /api/mobile/feed/{activityId}/react` llama
 * directo a lo mismo — sin duplicar la lógica de "insertar o borrar" entre
 * la web y la app móvil.
 */
export async function toggleActivityReaction(userId: string, activityId: string): Promise<{ reacted: boolean }> {
  const db = getDb();
  const [existing] = await db
    .select({ userId: activityReactions.userId })
    .from(activityReactions)
    .where(and(eq(activityReactions.activityId, activityId), eq(activityReactions.userId, userId)))
    .limit(1);

  if (existing) {
    await db
      .delete(activityReactions)
      .where(and(eq(activityReactions.activityId, activityId), eq(activityReactions.userId, userId)));
    return { reacted: false };
  }

  await db.insert(activityReactions).values({ activityId, userId });
  return { reacted: true };
}

/**
 * Registra que `userId` ha visto una publicación del Feed — idempotente
 * (una fila por usuario y actividad, ver PK en activity_view), así que
 * llamarlo varias veces por el mismo scroll no infla el contador.
 * Devuelve `isNew: false` si ya la había visto antes (el `.returning()` de
 * Drizzle viene vacío cuando `onConflictDoNothing` no llega a insertar) —
 * así el cliente sabe si debe sumar +1 al contador que ya tenía pintado.
 */
export async function registerActivityView(userId: string, activityId: string): Promise<{ isNew: boolean }> {
  const db = getDb();
  const inserted = await db
    .insert(activityViews)
    .values({ activityId, userId })
    .onConflictDoNothing()
    .returning({ activityId: activityViews.activityId });
  return { isNew: inserted.length > 0 };
}

/**
 * Añade un comentario a una publicación del Feed — función pura por
 * `userId`, mismo patrón que `toggleActivityReaction` de arriba.
 * `addActivityCommentAction` (app/actions.ts) es ahora un envoltorio fino
 * sobre esto, y `POST /api/mobile/feed/{activityId}/comment` llama directo
 * a lo mismo.
 */
export async function addActivityComment(userId: string, activityId: string, body: string) {
  const trimmed = body.trim().slice(0, 500);
  if (!trimmed) return null;

  const db = getDb();
  const [user] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
  const createdAt = new Date();
  await db.insert(activityComments).values({ id: crypto.randomUUID(), activityId, userId, body: trimmed, createdAt });

  return { activityId, body: trimmed, userName: user?.name ?? "Alguien", createdAt };
}

export async function getFeed(userId: string) {
  const db = getDb();
  
  const friends = await listFriends(userId);
  const friendIds = friends.map((f) => f.userId);
  const userIds = [userId, ...friendIds];

  // inArray crashes in Postgres when given an empty array — guard required.
  if (userIds.length === 0) return [];

  const rows = await db
    .select({
      id: activities.id,
      type: activities.type,
      rating: activities.rating,
      review: activities.review,
      createdAt: activities.createdAt,
      user: {
        id: users.id,
        handle: users.handle,
        name: users.name,
        image: avatarUrlSql(users.id, users.image, users.avatarPersonalizado),
      },
      game: {
        id: games.id,
        title: games.title,
        iconUrl: games.iconUrl,
        deviceLabel: games.deviceLabel,
      },
    })
    .from(activities)
    .innerJoin(users, eq(activities.userId, users.id))
    .innerJoin(games, eq(activities.gameId, games.id))
    .where(
      userIds.length === 1
        ? eq(activities.userId, userIds[0])
        : inArray(activities.userId, userIds)
    )
    .orderBy(desc(activities.createdAt))
    .limit(50);

  if (rows.length === 0) return rows.map((row) => ({ ...row, reactions: 0, reacted: false, comments: [], views: 0 }));

  const activityIds = rows.map((row) => row.id);
  const [reactionRows, commentRows, viewRows] = await Promise.all([
    db
      .select({ activityId: activityReactions.activityId, total: sql<number>`count(*)`, reacted: sql<number>`count(*) filter (where ${activityReactions.userId} = ${userId})` })
      .from(activityReactions)
      .where(inArray(activityReactions.activityId, activityIds))
      .groupBy(activityReactions.activityId),
    db
      .select({ activityId: activityComments.activityId, body: activityComments.body, userName: users.name, createdAt: activityComments.createdAt })
      .from(activityComments)
      .innerJoin(users, eq(users.id, activityComments.userId))
      .where(inArray(activityComments.activityId, activityIds))
      .orderBy(desc(activityComments.createdAt)),
    db
      .select({ activityId: activityViews.activityId, total: sql<number>`count(*)` })
      .from(activityViews)
      .where(inArray(activityViews.activityId, activityIds))
      .groupBy(activityViews.activityId),
  ]);
  const reactions = new Map(reactionRows.map((row) => [row.activityId, { total: Number(row.total), reacted: Number(row.reacted) > 0 }]));
  const comments = new Map<string, typeof commentRows>(activityIds.map((id) => [id, []]));
  for (const comment of commentRows) comments.get(comment.activityId)?.push(comment);
  const views = new Map(viewRows.map((row) => [row.activityId, Number(row.total)]));

  return rows.map((row) => ({
    ...row,
    reactions: reactions.get(row.id)?.total ?? 0,
    reacted: reactions.get(row.id)?.reacted ?? false,
    comments: comments.get(row.id) ?? [],
    views: views.get(row.id) ?? 0,
  }));
}

