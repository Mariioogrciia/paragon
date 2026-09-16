import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { getLibrary, getProfileByUserId } from "@/lib/profiles";

/**
 * Biblioteca completa del usuario, para LibraryScreen (Android). Misma
 * decisión que la web (`LibraryGrid.tsx`): se manda el array entero y el
 * filtrado/orden ("Todos", "Jugando", "progreso", "nombre"...) se hace en
 * el cliente contra estos mismos campos — no hay estado de filtro que
 * sincronizar con el servidor. Ver src/lib/stats.ts (filterGames/sortGames)
 * para la lógica exacta a replicar en Kotlin si hace falta.
 */
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

  return NextResponse.json({
    games: games.map((g) => ({
      id: g.id,
      platform: g.platform,
      title: g.title,
      deviceLabel: g.deviceLabel,
      iconUrl: g.iconUrl ?? null,
      progressPercent: g.progressPercent,
      definedTotal: g.definedTotal,
      earnedTotal: g.earnedTotal,
      defined: g.defined ?? null,
      earned: g.earned ?? null,
      isWishlist: g.isWishlist ?? false,
      isPinned: g.isPinned ?? false,
      lastPlayedAt: g.lastPlayedAt ?? null,
      playtimeMinutes: g.playtimeMinutes ?? null,
    })),
  });
}
