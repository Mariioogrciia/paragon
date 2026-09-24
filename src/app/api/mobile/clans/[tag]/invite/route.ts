import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { getClanByTag, inviteToClan } from "@/lib/clans";

/**
 * Invita a un amigo al clan — `{ "invitedUserId": "..." }`. `inviteToClan`
 * ya valida que quien invita sea el owner y que el invitado sea amigo suyo
 * (no cualquier usuario) y no esté ya en un clan.
 */
export async function POST(req: Request, { params }: { params: Promise<{ tag: string }> }) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { tag } = await params;
  const clan = await getClanByTag(tag);
  if (!clan) {
    return NextResponse.json({ error: "Clan no encontrado" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const invitedUserId = typeof body?.invitedUserId === "string" ? body.invitedUserId : "";
  if (!invitedUserId) {
    return NextResponse.json({ error: "Falta invitedUserId" }, { status: 400 });
  }

  try {
    await inviteToClan(clan.id, userId, invitedUserId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "No se pudo invitar." }, { status: 400 });
  }
}
