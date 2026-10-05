import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { limitar } from "@/lib/rateLimit";
import { getClanByTag } from "@/lib/clans";
import { GuerraError, retarClan } from "@/lib/clanWars";
import { errorMovil } from "@/lib/mensajesApi";

/**
 * Retar a otro clan a una guerra — `{ "rivalId": "<id de clan>" }`. Mismas
 * reglas que la web (retarClan): solo el líder, y ninguno de los dos clanes
 * con otra guerra pendiente o en marcha.
 */
export async function POST(req: Request, { params }: { params: Promise<{ tag: string }> }) {
  const userId = await getMobileUserId(req);
  if (!userId) return errorMovil(req, "No autenticado", 401);
  if (!(await limitar("comentario", userId))) {
    return errorMovil(req, "Demasiadas peticiones seguidas. Espera un momento.", 429);
  }

  const { tag } = await params;
  const clan = await getClanByTag(tag);
  if (!clan) return errorMovil(req, "Clan no encontrado", 404);

  const body = await req.json().catch(() => null);
  const rivalId = typeof body?.rivalId === "string" ? body.rivalId : "";
  if (!rivalId) return errorMovil(req, "Ese clan no existe.", 400);

  try {
    await retarClan(userId, clan.id, rivalId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof GuerraError) return errorMovil(req, e.message, 409);
    throw e;
  }
}
