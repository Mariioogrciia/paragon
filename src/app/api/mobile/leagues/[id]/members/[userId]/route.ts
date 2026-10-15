import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { limitar } from "@/lib/rateLimit";
import { removeLeagueMember } from "@/lib/leagues";
import { errorMovil } from "@/lib/mensajesApi";

/** Quita a alguien de la liga — el dueño puede quitar a cualquiera, cualquier otro miembro solo puede quitarse a sí mismo (salir). */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  const requestingUserId = await getMobileUserId(req);
  if (!requestingUserId) {
    return errorMovil(req, "No autenticado", 401);
  }
  if (!(await limitar("escritura", requestingUserId))) {
    return errorMovil(req, "Demasiadas peticiones seguidas. Espera un momento.", 429);
  }

  const { id, userId: targetUserId } = await params;
  const ok = await removeLeagueMember(id, requestingUserId, targetUserId);
  if (!ok) {
    return errorMovil(req, "No se pudo quitar a ese miembro.", 403);
  }

  return NextResponse.json({ ok: true });
}
