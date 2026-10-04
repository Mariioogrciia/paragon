import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { limitar } from "@/lib/rateLimit";
import { saveGameNotes } from "@/lib/profiles";
import { errorMovil } from "@/lib/mensajesApi";

/** Guarda (o borra, si llega vacía) la nota privada de este juego — scratchpad de Modo Enfoque. Body: `{ "notes": "..." }`. */
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
  const body = await req.json().catch(() => null);
  const notes = typeof body?.notes === "string" ? body.notes : "";

  await saveGameNotes(userId, gameId, notes);
  return NextResponse.json({ ok: true });
}
