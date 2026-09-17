import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { searchGames } from "@/lib/igdb/client";

/**
 * Busca en el catálogo de IGDB — pensado para "Añadir a Paragon" desde el
 * Sharesheet de Android (compartir un título desde Chrome/YouTube). Mismo
 * `searchGames` que ya usa `GET /api/games/search` en la web (`AddManualGameModal.tsx`),
 * aquí detrás de auth móvil en vez de sin autenticar — la app siempre tiene
 * sesión cuando llega hasta aquí.
 */
export async function GET(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (!q) {
    return NextResponse.json({ results: [] });
  }

  const results = await searchGames(q, 12);
  return NextResponse.json({ results });
}
