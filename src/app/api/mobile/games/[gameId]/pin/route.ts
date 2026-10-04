import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { limitar } from "@/lib/rateLimit";
import { togglePinnedGame } from "@/lib/profiles";
import { errorMovil } from "@/lib/mensajesApi";

/** Ancla/desancla este juego para Modo Enfoque — mismo `togglePinGameAction` que la web. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ gameId: string }> },
) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return errorMovil(req, "No autenticado", 401);
  }
  if (!(await limitar("perfil", userId))) {
    return errorMovil(req, "Demasiadas peticiones seguidas. Espera un momento.", 429);
  }

  const { gameId } = await params;
  const result = await togglePinnedGame(userId, gameId);
  return NextResponse.json(result);
}
