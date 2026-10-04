import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { listPendingLeagueInvites } from "@/lib/leagues";
import { errorMovil } from "@/lib/mensajesApi";

/** Invitaciones a ligas todavía sin aceptar ni rechazar. */
export async function GET(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return errorMovil(req, "No autenticado", 401);
  }

  const invites = await listPendingLeagueInvites(userId);
  return NextResponse.json({ invites });
}
