import { getDb } from "@/db";
import { activities, users, games, activityComments, activityReactions } from "@/db/schema";
import { inArray, desc, eq, sql } from "drizzle-orm";
import { listFriends } from "./profiles";
import { avatarUrlSql } from "@/lib/avatarSql";

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
        image: avatarUrlSql(users.id, users.image),
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

  if (rows.length === 0) return rows.map((row) => ({ ...row, reactions: 0, reacted: false, comments: [] }));

  const activityIds = rows.map((row) => row.id);
  const [reactionRows, commentRows] = await Promise.all([
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
  ]);
  const reactions = new Map(reactionRows.map((row) => [row.activityId, { total: Number(row.total), reacted: Number(row.reacted) > 0 }]));
  const comments = new Map<string, typeof commentRows>(activityIds.map((id) => [id, []]));
  for (const comment of commentRows) comments.get(comment.activityId)?.push(comment);

  return rows.map((row) => ({
    ...row,
    reactions: reactions.get(row.id)?.total ?? 0,
    reacted: reactions.get(row.id)?.reacted ?? false,
    comments: comments.get(row.id) ?? [],
  }));
}

export async function getGlobalFeed(currentUserId?: string) {
  const db = getDb();
  
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
        image: avatarUrlSql(users.id, users.image),
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
    .where(eq(users.isPublicProfile, true))
    .orderBy(desc(activities.createdAt))
    .limit(100);

  if (rows.length === 0) return rows.map((row) => ({ ...row, reactions: 0, reacted: false, comments: [] }));

  const activityIds = rows.map((row) => row.id);
  
  // Si no hay currentUserId, nadie ha reaccionado desde nuestro punto de vista
  const reactionRows = currentUserId 
    ? await db
        .select({ activityId: activityReactions.activityId, total: sql<number>`count(*)`, reacted: sql<number>`count(*) filter (where ${activityReactions.userId} = ${currentUserId})` })
        .from(activityReactions)
        .where(inArray(activityReactions.activityId, activityIds))
        .groupBy(activityReactions.activityId)
    : await db
        .select({ activityId: activityReactions.activityId, total: sql<number>`count(*)`, reacted: sql<number>`0` })
        .from(activityReactions)
        .where(inArray(activityReactions.activityId, activityIds))
        .groupBy(activityReactions.activityId);

  const commentRows = await db
    .select({ activityId: activityComments.activityId, body: activityComments.body, userName: users.name, createdAt: activityComments.createdAt })
    .from(activityComments)
    .innerJoin(users, eq(users.id, activityComments.userId))
    .where(inArray(activityComments.activityId, activityIds))
    .orderBy(desc(activityComments.createdAt));

  const reactions = new Map(reactionRows.map((row) => [row.activityId, { total: Number(row.total), reacted: Number(row.reacted) > 0 }]));
  const comments = new Map<string, typeof commentRows>(activityIds.map((id) => [id, []]));
  for (const comment of commentRows) comments.get(comment.activityId)?.push(comment);

  return rows.map((row) => ({
    ...row,
    reactions: reactions.get(row.id)?.total ?? 0,
    reacted: reactions.get(row.id)?.reacted ?? false,
    comments: comments.get(row.id) ?? [],
  }));
}
