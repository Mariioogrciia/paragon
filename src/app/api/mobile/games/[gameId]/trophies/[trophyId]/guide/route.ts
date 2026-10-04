import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { games, gameTrophies } from "@/db/schema";
import { getMobileUserId } from "@/lib/mobileAuth";
import { limitar } from "@/lib/rateLimit";
import { buscarVideoGuiaTrofeo } from "@/lib/videoGuides";
import { errorMovil } from "@/lib/mensajesApi";

/**
 * Vídeo de guía de YouTube para un trofeo — mismo dato cacheado que usa la
 * web (TrophyGuideModal.tsx, game_trophy.guideVideoId), aquí solo el id del
 * vídeo: la app Android abre la app de YouTube directamente en ese vídeo en
 * vez de incrustar un reproductor (no hay WebView de guía en el móvil).
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ gameId: string; trophyId: string }> },
) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return errorMovil(req, "No autenticado", 401);
  }
  if (!(await limitar("guiaVideo", userId))) {
    return errorMovil(req, "Demasiadas peticiones seguidas. Espera un momento.", 429);
  }

  const { gameId, trophyId } = await params;

  const [game] = await db.select({ title: games.title }).from(games).where(eq(games.id, gameId)).limit(1);
  const [trophy] = await db
    .select({ name: gameTrophies.name })
    .from(gameTrophies)
    .where(and(eq(gameTrophies.gameId, gameId), eq(gameTrophies.trophyId, trophyId)))
    .limit(1);

  if (!game || !trophy) {
    return errorMovil(req, "Trofeo no encontrado", 404);
  }

  const videoId = await buscarVideoGuiaTrofeo(game.title, trophy.name, gameId, trophyId);
  return NextResponse.json({ videoId });
}
