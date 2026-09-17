import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { setLeagueChallenge } from "@/lib/leagues";

/** Fija (o quita, con `gameId: null`) el juego de reto de la liga — `{ "gameId": "..." | null }`. Solo el dueño. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const gameId = typeof body?.gameId === "string" ? body.gameId : null;

  const ok = await setLeagueChallenge(id, userId, gameId);
  if (!ok) {
    return NextResponse.json({ error: "Solo el dueño puede cambiar el reto." }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}
