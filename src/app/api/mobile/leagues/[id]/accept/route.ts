import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { acceptLeagueInvite } from "@/lib/leagues";

/** Acepta una invitación a una liga — a partir de aquí sí cuenta en la clasificación. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const ok = await acceptLeagueInvite(id, userId);
  if (!ok) {
    return NextResponse.json({ error: "No hay ninguna invitación pendiente a esa liga." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
