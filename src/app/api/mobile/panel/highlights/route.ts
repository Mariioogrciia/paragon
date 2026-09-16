import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { getLibrary, getProfileByUserId } from "@/lib/profiles";
import { gameProgress } from "@/lib/stats";
import type { Game } from "@/lib/types";

/**
 * "A un paso del platino" y "Jugado recientemente" del Panel (Android) —
 * MISMO cálculo que la portada web (app/page.tsx: nearPlatinum/recientes),
 * no una aproximación aparte. Endpoint propio (no derivado de
 * /api/mobile/library en el cliente) para no duplicar `gameProgress()` en
 * Kotlin y arriesgarse a que las dos versiones diverjan con el tiempo.
 */
function toCard(game: Game) {
  return {
    id: game.id,
    title: game.title,
    coverUrl: game.iconUrl ?? "",
    earnedTrophies: game.earnedTotal,
    totalTrophies: game.definedTotal,
    percent: game.progressPercent,
  };
}

export async function GET(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const profile = await getProfileByUserId(userId);
  if (!profile?.handle) {
    return NextResponse.json({ error: "Perfil sin terminar de configurar" }, { status: 409 });
  }

  const { games } = await getLibrary(profile);

  // getLibrary ya devuelve los juegos ordenados por lastPlayedAt desc
  // (ver profiles.ts) — "recientes" es solo tomar los primeros no-deseados,
  // igual que la portada web.
  const recent = games.filter((g) => !g.isWishlist).slice(0, 6);

  const nearPlatinum = games
    .map((g) => ({ game: g, progress: gameProgress(g) }))
    .filter((g) => g.progress.hasPlatinum && !g.progress.platinumEarned)
    .sort((a, b) => a.progress.total - a.progress.earned - (b.progress.total - b.progress.earned))
    .slice(0, 3)
    .map((g) => g.game);

  return NextResponse.json({
    nearPlatinum: nearPlatinum.map(toCard),
    recent: recent.map(toCard),
  });
}
