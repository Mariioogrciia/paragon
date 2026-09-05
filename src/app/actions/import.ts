"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { games, userGames, activities } from "@/db/schema";
import { auth } from "@/auth";
import { parseGameKey, type Platform, gameKey } from "@/lib/types";
import { searchGames } from "@/lib/igdb/client";
import { slugDevice } from "@/lib/manualGames";
import { eq, and } from "drizzle-orm";

export interface ImportedGame {
  title: string;
  platform: Platform;
  /** Etiqueta original de la fuente (p. ej. "GOG", "Xbox"...), para el device label cuando cae en "manual". */
  sourceLabel?: string;
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

  for (const gRaw of importedGames) {
    if (!gRaw.title.trim()) continue;

    // Steam/PSN/Xbox/Google Play ya tienen sincronización real en Paragon
    // (platformAccounts + cron), con su propio nativeId (appid/trophyId real).
    // Si el CSV crea aquí una fila con un nativeId inventado (el igdbId), esa
    // fila nunca recibe logros y, si el usuario ya tiene o más tarde vincula
    // esa cuenta de verdad, queda duplicada junto a la real. Estas van a
    // "manual" (como Epic/Ubisoft, que tampoco sincronizan biblioteca).
    const g: ImportedGame =
      gRaw.platform === "steam" || gRaw.platform === "psn" || gRaw.platform === "xbox" || gRaw.platform === "google"
        ? { ...gRaw, platform: "manual", sourceLabel: gRaw.sourceLabel || gRaw.platform }
        : gRaw;

    let igdbData = null;
    try {
      const results = await searchGames(g.title, 1);
      if (results && results.length > 0) {
        igdbData = results[0];
      }
    } catch (e) {
      // Ignorar error de IGDB y seguir
    }

    // steam/psn/xbox/google ya se remapearon a "manual" arriba - a este punto
    // g.platform solo puede ser "epic", "ubisoft" o "manual".
    let deviceLabel = "";
    switch (g.platform) {
      case "epic": deviceLabel = "Epic Games"; break;
      case "ubisoft": deviceLabel = "Ubisoft"; break;
      default: deviceLabel = g.sourceLabel || "PC"; break;
    }

    // "manual" sigue su convención propia (games.id = manual-<igdbId>:<dispositivo>,
    // ver HANDOFF): sin el sufijo de dispositivo, dos importaciones distintas
    // (o una importación y un alta manual posterior del mismo juego) crean
    // filas duplicadas en vez de compartir una, y notifications.ts/manualGames.ts
    // asumen ese formato al leer nativeId.split(":").
    const nativeId =
      g.platform === "manual"
        ? `${igdbData ? igdbData.igdbId : `sin-match-${slugify(g.title)}`}:${slugDevice(deviceLabel)}`
        : igdbData
          ? String(igdbData.igdbId)
          : slugify(g.title);
    const id = gameKey(g.platform, nativeId);

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
