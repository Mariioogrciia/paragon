import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { saveGameNotes } from "@/lib/profiles";

/** Guarda (o borra, si llega vacía) la nota privada de este juego — scratchpad de Modo Enfoque. Body: `{ "notes": "..." }`. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ gameId: string }> },
) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { gameId } = await params;
  const body = await req.json().catch(() => null);
  const notes = typeof body?.notes === "string" ? body.notes : "";

  await saveGameNotes(userId, gameId, notes);
  return NextResponse.json({ ok: true });
}
