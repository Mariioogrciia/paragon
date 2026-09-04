"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { games, userGames, activities } from "@/db/schema";
import { auth } from "@/auth";
import { parseGameKey, type Platform, gameKey } from "@/lib/types";
import { searchGames } from "@/lib/igdb/client";
import { eq, and } from "drizzle-orm";

export interface ImportedGame {
  title: string;
  platform: Platform;
  completed: boolean;
}

function slugify(text: string) {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function importGamesAction(importedGames: ImportedGame[]) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");
  const userId = session.user.id;
  const db = getDb();

  let imported = 0;

  for (const g of importedGames) {
    if (!g.title.trim()) continue;

    let igdbData = null;
    try {
      const results = await searchGames(g.title, 1);
      if (results && results.length > 0) {
        igdbData = results[0];
      }
    } catch (e) {
      // Ignorar error de IGDB y seguir
    }

    const nativeId = igdbData ? String(igdbData.igdbId) : slugify(g.title);
    const id = gameKey(g.platform, nativeId);
    
    let deviceLabel = "";
    switch (g.platform) {
      case "epic": deviceLabel = "Epic Games"; break;
      case "ubisoft": deviceLabel = "Ubisoft"; break;
      case "xbox": deviceLabel = "Xbox"; break;
      case "steam": deviceLabel = "Steam"; break;
      case "psn": deviceLabel = "PlayStation"; break;
      case "google": deviceLabel = "Google Play"; break;
      default: deviceLabel = "PC"; break;
    }

    await db
      .insert(games)
      .values({
        id,
        platform: g.platform,
        nativeId,
        title: igdbData?.title || g.title,
        deviceLabel,
        iconUrl: igdbData?.coverUrl || null,
        definedTotal: 1,
        developer: igdbData?.developer || null,
        publisher: igdbData?.publisher || null,
        genres: igdbData?.genres || null,
        pegi: igdbData?.pegi || null,
        metadataSyncedAt: new Date(),
        igdbId: igdbData?.igdbId || null,
      })
      .onConflictDoNothing({ target: games.id });

    const progressPercent = g.completed ? 100 : 0;
    const earnedTotal = g.completed ? 1 : 0;

    await db
      .insert(userGames)
      .values({
        userId,
        gameId: id,
        progressPercent,
        earnedTotal,
        lastPlayedAt: new Date(),
        trophiesSyncedAt: new Date(),
        isWishlist: false,
      })
      .onConflictDoUpdate({
        target: [userGames.userId, userGames.gameId],
        set: { progressPercent, earnedTotal },
      });

    imported++;
  }

  revalidatePath("/", "layout");
  return { success: true, count: imported };
}
