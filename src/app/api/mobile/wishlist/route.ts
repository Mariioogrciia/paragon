import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { addManualGame } from "@/lib/manualGames";

/**
 * Añade un juego elegido de `GET /api/mobile/games/search` a la lista de
 * deseados — mismo `addManualGame(..., isWishlist=true)` que usa
 * `addToWishlistAction` en la web (`src/app/actions.ts`), esa es una
 * Server Action ligada a la cookie de sesión y no se puede llamar desde la
 * app nativa (Bearer token), de ahí este endpoint aparte.
 */
export async function POST(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const igdbId = Number(body?.igdbId);
  const title = String(body?.title ?? "").trim();
  if (!title || !Number.isFinite(igdbId)) {
    return NextResponse.json({ error: "Elige un juego de los resultados." }, { status: 400 });
  }

  const gameId = await addManualGame(
    userId,
    {
      igdbId,
      title,
      coverUrl: typeof body?.coverUrl === "string" ? body.coverUrl : undefined,
      pegi: typeof body?.pegi === "string" ? body.pegi : undefined,
      genres: Array.isArray(body?.genres) ? body.genres : undefined,
      developer: typeof body?.developer === "string" ? body.developer : undefined,
      publisher: typeof body?.publisher === "string" ? body.publisher : undefined,
      deviceLabel: String(body?.deviceLabel ?? "").trim() || "Deseados",
      completed: false,
    },
    true,
  );

  return NextResponse.json({ gameId });
}
