import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { acceptLeagueInvite } from "@/lib/leagues";
import { errorMovil } from "@/lib/mensajesApi";

/** Acepta una invitación a una liga — a partir de aquí sí cuenta en la clasificación. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return errorMovil(req, "No autenticado", 401);
  }

  const { id } = await params;
  const ok = await acceptLeagueInvite(id, userId);
  if (!ok) {
    return errorMovil(req, "No hay ninguna invitación pendiente a esa liga.", 404);
  }

  return NextResponse.json({ ok: true });
}
