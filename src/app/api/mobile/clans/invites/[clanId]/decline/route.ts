import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { declineClanInvite } from "@/lib/clans";
import { errorMovil } from "@/lib/mensajesApi";

/** Rechaza (borra) una invitación a un clan. Sin body. */
export async function POST(req: Request, { params }: { params: Promise<{ clanId: string }> }) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return errorMovil(req, "No autenticado", 401);
  }

  const { clanId } = await params;
  await declineClanInvite(userId, clanId);
  return NextResponse.json({ ok: true });
}
