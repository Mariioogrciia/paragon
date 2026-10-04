import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { limitar } from "@/lib/rateLimit";
import { addLeagueMember, NotFriendsError } from "@/lib/leagues";
import { errorMovil } from "@/lib/mensajesApi";

/** Añade un amigo a la liga — `{ "userId": "..." }`, solo el dueño puede invitar, y solo a un amigo real. */
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
  const friendUserId = typeof body?.userId === "string" ? body.userId : "";
  if (!friendUserId) {
    return errorMovil(req, "Falta el usuario a añadir", 400);
  }

  try {
    const ok = await addLeagueMember(id, userId, friendUserId);
    if (!ok) return errorMovil(req, "Solo el dueño puede invitar.", 403);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof NotFriendsError) {
      return errorMovil(req, "Solo puedes invitar a amigos.", 400);
    }
    throw error;
  }
}
