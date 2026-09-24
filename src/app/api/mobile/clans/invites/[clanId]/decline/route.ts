import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { declineClanInvite } from "@/lib/clans";

/** Rechaza (borra) una invitación a un clan. Sin body. */
export async function POST(req: Request, { params }: { params: Promise<{ clanId: string }> }) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { clanId } = await params;
  await declineClanInvite(userId, clanId);
  return NextResponse.json({ ok: true });
}
