import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { limitar } from "@/lib/rateLimit";
import { GuerraError, responderGuerra } from "@/lib/clanWars";
import { errorMovil } from "@/lib/mensajesApi";

/**
 * Responder a un reto de guerra — `{ "aceptar": true | false }`. Solo el
 * líder del clan retado, y solo mientras siga pendiente (responderGuerra).
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getMobileUserId(req);
  if (!userId) return errorMovil(req, "No autenticado", 401);
  if (!(await limitar("comentario", userId))) {
    return errorMovil(req, "Demasiadas peticiones seguidas. Espera un momento.", 429);
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (typeof body?.aceptar !== "boolean") return errorMovil(req, "Ese reto ya no está pendiente.", 400);

  try {
    await responderGuerra(userId, id, body.aceptar);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof GuerraError) return errorMovil(req, e.message, 409);
    throw e;
  }
}
