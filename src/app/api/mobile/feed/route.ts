import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { getFeed } from "@/lib/feed";

/**
 * Muro de actividad (propia + amigos) para FeedScreen (Android) — mismo
 * `getFeed` que usa la portada web, ya limitado a 50 y ordenado por fecha.
 * `activities.type` (src/db/schema.ts) es uno de:
 * "review" | "rating" | "platinum" | "favorite" | "new_game".
 */
export async function GET(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const feed = await getFeed(userId);

  return NextResponse.json({
    items: feed.map((item) => ({
      id: item.id,
      type: item.type,
      rating: item.rating ?? null,
      review: item.review ?? null,
      createdAt: item.createdAt,
      user: item.user,
      game: item.game,
      reactions: item.reactions,
      reacted: item.reacted,
      comments: item.comments,
    })),
  });
}
