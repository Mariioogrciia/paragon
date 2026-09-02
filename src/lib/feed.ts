import { getDb } from "@/db";
import { activities, users, games } from "@/db/schema";
import { inArray, desc, eq } from "drizzle-orm";
import { listFriends } from "./profiles";

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
        image: users.image,
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

  return rows;
}
