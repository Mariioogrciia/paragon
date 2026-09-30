import { getDb } from "@/db";
import { activities, users, games, activityComments, activityReactions, activityViews } from "@/db/schema";
import { inArray, desc, eq, and, or, sql } from "drizzle-orm";
import { listFriends } from "./profiles";
import { avatarUrlSql } from "@/lib/avatarSql";
import { contieneLenguajeOfensivo } from "@/lib/contentFilter";
import { REACCIONES } from "@/lib/reacciones";

/**
 * Reaccionar/quitar reacción a una publicación del Feed — función pura por
 * `userId`, mismo patrón que `togglePinnedGame` (lib/profiles.ts):
 * `toggleActivityReactionAction` (app/actions.ts) es ahora un envoltorio
 * fino sobre esto, y `POST /api/mobile/feed/{activityId}/react` llama
 * directo a lo mismo — sin duplicar la lógica de "insertar o borrar" entre
 * la web y la app móvil.
 */
const CLAVES_REACCION = new Set<string>(REACCIONES.map((r) => r.clave));

/**
 * La misma reacción otra vez la quita; otra distinta la cambia. Sin
 * `reaction` (la app móvil, que solo sabe aplaudir) se comporta como antes.
 */
export async function toggleActivityReaction(userId: string, activityId: string, reaction: string = "aplauso"): Promise<{ reacted: boolean }> {
  const db = getDb();
  const nueva = CLAVES_REACCION.has(reaction) ? reaction : "aplauso";
  const donde = and(eq(activityReactions.activityId, activityId), eq(activityReactions.userId, userId));
  const [existing] = await db.select({ reaction: activityReactions.reaction }).from(activityReactions).where(donde).limit(1);

  if (existing?.reaction === nueva) {
    await db.delete(activityReactions).where(donde);
    return { reacted: false };
  }
  if (existing) {
    await db.update(activityReactions).set({ reaction: nueva }).where(donde);
    return { reacted: true };
  }
  await db.insert(activityReactions).values({ activityId, userId, reaction: nueva });
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
/** Comentario rechazado por el filtro de lenguaje (lib/contentFilter.ts). */
export class ComentarioOfensivoError extends Error {
  constructor() {
    super("Ese comentario contiene lenguaje ofensivo — cámbialo e inténtalo de nuevo.");
  }
}

export async function addActivityComment(userId: string, activityId: string, body: string) {
  const trimmed = body.trim().slice(0, 500);
  if (!trimmed) return null;
  // Reseñas, guías y perfil ya pasaban por el filtro; los comentarios del
  // feed no (auditoría, 28 sept 2026). Aquí y no en cada llamada: esto lo
  // usan tanto la web como /api/mobile.
  if (contieneLenguajeOfensivo(trimmed)) throw new ComentarioOfensivoError();

  const db = getDb();
  const [user] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
  const createdAt = new Date();
  await db.insert(activityComments).values({ id: crypto.randomUUID(), activityId, userId, body: trimmed, createdAt });

  return { activityId, body: trimmed, userName: user?.name ?? "Alguien", createdAt };
}

/**
 * `global`: toda la comunidad con perfil público (pestaña "Todos" de
 * Comunidad), no solo tú y tus amigos. Sin eso la página se quedaba vacía
 * para quien aún no tiene amigos en Paragon.
 */
export async function getFeed(userId: string, { global = false, limite = 50 }: { global?: boolean; limite?: number } = {}) {
  const db = getDb();

  const userIds = global ? [] : [userId, ...(await listFriends(userId)).map((f) => f.userId)];

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
        titulo: users.tituloDesbloqueado,
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
    // leftJoin: los estados libres ("status") no tienen juego.
    .leftJoin(games, eq(activities.gameId, games.id))
    .where(
      global
        ? or(eq(users.isPublicProfile, true), eq(activities.userId, userId))
        : userIds.length === 1
          ? eq(activities.userId, userIds[0])
          : inArray(activities.userId, userIds)
    )
    .orderBy(desc(activities.createdAt))
    .limit(limite);

  if (rows.length === 0) return rows.map((row) => ({ ...row, reactions: 0, reacted: false, miReaccion: null as string | null, porReaccion: {} as Record<string, number>, comments: [], views: 0 }));

  const activityIds = rows.map((row) => row.id);
  const [reactionRows, commentRows, viewRows] = await Promise.all([
    db
      .select({
        activityId: activityReactions.activityId,
        reaction: activityReactions.reaction,
        total: sql<number>`count(*)`,
        mia: sql<number>`count(*) filter (where ${activityReactions.userId} = ${userId})`,
      })
      .from(activityReactions)
      .where(inArray(activityReactions.activityId, activityIds))
      .groupBy(activityReactions.activityId, activityReactions.reaction),
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
  const reactions = new Map<string, { total: number; mia: string | null; porReaccion: Record<string, number> }>();
  for (const row of reactionRows) {
    const r = reactions.get(row.activityId) ?? { total: 0, mia: null, porReaccion: {} };
    r.total += Number(row.total);
    r.porReaccion[row.reaction] = Number(row.total);
    if (Number(row.mia) > 0) r.mia = row.reaction;
    reactions.set(row.activityId, r);
  }
  const comments = new Map<string, typeof commentRows>(activityIds.map((id) => [id, []]));
  for (const comment of commentRows) comments.get(comment.activityId)?.push(comment);
  const views = new Map(viewRows.map((row) => [row.activityId, Number(row.total)]));

  return rows.map((row) => ({
    ...row,
    reactions: reactions.get(row.id)?.total ?? 0,
    reacted: Boolean(reactions.get(row.id)?.mia),
    miReaccion: reactions.get(row.id)?.mia ?? null,
    porReaccion: reactions.get(row.id)?.porReaccion ?? {},
    comments: comments.get(row.id) ?? [],
    views: views.get(row.id) ?? 0,
  }));
}

