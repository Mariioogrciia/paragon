import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { limitar } from "@/lib/rateLimit";
import { setLeagueChallenge } from "@/lib/leagues";
import { errorMovil } from "@/lib/mensajesApi";

/** Fija (o quita, con `gameId: null`) el juego de reto de la liga — `{ "gameId": "..." | null }`. Solo el dueño. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return errorMovil(req, "No autenticado", 401);
  }
  if (!(await limitar("comentario", userId))) {
    return errorMovil(req, "Demasiadas peticiones seguidas. Espera un momento.", 429);
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const gameId = typeof body?.gameId === "string" ? body.gameId : null;

  const ok = await setLeagueChallenge(id, userId, gameId);
  if (!ok) {
    return errorMovil(req, "Solo el dueño puede cambiar el reto.", 403);
  }

  return NextResponse.json({ ok: true });
}
