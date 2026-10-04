import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { getClanByTag, leaveClan } from "@/lib/clans";
import { errorMovil } from "@/lib/mensajesApi";

/**
 * Abandona un clan por su tag. Si eres el owner, `leaveClan` borra el clan
 * ENTERO (sin transferencia de liderazgo, simplificación deliberada de
 * lib/clans.ts) — la app debe confirmarlo con el usuario ANTES de llamar
 * aquí, igual que el `confirm()` de la web (`ClanActions.tsx`). Sin body.
 */
export async function POST(req: Request, { params }: { params: Promise<{ tag: string }> }) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return errorMovil(req, "No autenticado", 401);
  }

  const { tag } = await params;
  const clan = await getClanByTag(tag);
  if (!clan) {
    return errorMovil(req, "Clan no encontrado", 404);
  }

  await leaveClan(userId, clan.id);
  return NextResponse.json({ ok: true });
}
