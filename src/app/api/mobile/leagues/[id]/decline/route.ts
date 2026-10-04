import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { declineLeagueInvite } from "@/lib/leagues";
import { errorMovil } from "@/lib/mensajesApi";

/** Rechaza una invitación a una liga — se borra, como si nunca hubiera llegado. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return errorMovil(req, "No autenticado", 401);
  }

  const { id } = await params;
  const ok = await declineLeagueInvite(id, userId);
  if (!ok) {
    return errorMovil(req, "No hay ninguna invitación pendiente a esa liga.", 404);
  }

  return NextResponse.json({ ok: true });
}
