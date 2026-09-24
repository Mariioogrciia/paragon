import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { getClanByTag, leaveClan } from "@/lib/clans";

/**
 * Abandona un clan por su tag. Si eres el owner, `leaveClan` borra el clan
 * ENTERO (sin transferencia de liderazgo, simplificación deliberada de
 * lib/clans.ts) — la app debe confirmarlo con el usuario ANTES de llamar
 * aquí, igual que el `confirm()` de la web (`ClanActions.tsx`). Sin body.
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

  await leaveClan(userId, clan.id);
  return NextResponse.json({ ok: true });
}
