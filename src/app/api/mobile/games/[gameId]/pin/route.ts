import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { togglePinnedGame } from "@/lib/profiles";

/** Ancla/desancla este juego para Modo Enfoque — mismo `togglePinGameAction` que la web. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ gameId: string }> },
) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { gameId } = await params;
  const result = await togglePinnedGame(userId, gameId);
  return NextResponse.json(result);
}
