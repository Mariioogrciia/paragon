import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { acceptClanInvite } from "@/lib/clans";

/** Acepta una invitación a un clan — `acceptClanInvite` ya valida que la invitación exista y que no estés en otro clan. Sin body. */
export async function POST(req: Request, { params }: { params: Promise<{ clanId: string }> }) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { clanId } = await params;
  try {
    await acceptClanInvite(userId, clanId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "No se pudo aceptar la invitación." }, { status: 400 });
  }
}
