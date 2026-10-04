import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { acceptClanInvite } from "@/lib/clans";
import { errorMovil } from "@/lib/mensajesApi";

/** Acepta una invitación a un clan — `acceptClanInvite` ya valida que la invitación exista y que no estés en otro clan. Sin body. */
export async function POST(req: Request, { params }: { params: Promise<{ clanId: string }> }) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return errorMovil(req, "No autenticado", 401);
  }

  const { clanId } = await params;
  try {
    await acceptClanInvite(userId, clanId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorMovil(req, e instanceof Error ? e.message : "No se pudo aceptar la invitación.", 400);
  }
}
