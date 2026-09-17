import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { removeLeagueMember } from "@/lib/leagues";

/** Quita a alguien de la liga — el dueño puede quitar a cualquiera, cualquier otro miembro solo puede quitarse a sí mismo (salir). */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  const requestingUserId = await getMobileUserId(req);
  if (!requestingUserId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id, userId: targetUserId } = await params;
  const ok = await removeLeagueMember(id, requestingUserId, targetUserId);
  if (!ok) {
    return NextResponse.json({ error: "No se pudo quitar a ese miembro." }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}
