import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { removeLeagueMember } from "@/lib/leagues";

/**
 * Salir de una liga uno mismo — igual que DELETE .../members/{userId} con tu
 * propio id, pero sin que el cliente móvil necesite conocer su propio
 * userId (solo tiene el token, no el id — a diferencia de la web, que ya
 * tiene la sesión completa).
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const ok = await removeLeagueMember(id, userId, userId);
  if (!ok) {
    return NextResponse.json({ error: "No se pudo salir de la liga." }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}
