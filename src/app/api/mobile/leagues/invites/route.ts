import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { listPendingLeagueInvites } from "@/lib/leagues";

/** Invitaciones a ligas todavía sin aceptar ni rechazar. */
export async function GET(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const invites = await listPendingLeagueInvites(userId);
  return NextResponse.json({ invites });
}
