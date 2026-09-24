import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { getPendingInvites } from "@/lib/clans";

/** Invitaciones a clanes pendientes del usuario, en cualquier clan. */
export async function GET(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const invites = await getPendingInvites(userId);
  return NextResponse.json({ invites });
}
