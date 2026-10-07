import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { getClanByTag, setClanEmblema } from "@/lib/clans";
import { textoAEmblema } from "@/lib/clanEmblema";
import { errorMovil } from "@/lib/mensajesApi";

/**
 * Cambia el escudo del clan — `{ "emblema": "emblema:1:<forma>:<simbolo>:<fondo>:<color>" }`
 * (ver lib/clanEmblema.ts). Solo el líder, como en la web.
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

  const body = await req.json().catch(() => null);
  const emblema = textoAEmblema(typeof body?.emblema === "string" ? body.emblema : null);
  if (!emblema) {
    return errorMovil(req, "Escudo no válido", 400);
  }

  if (!(await setClanEmblema(userId, clan.id, emblema))) {
    return errorMovil(req, "Solo el líder puede cambiar el escudo", 403);
  }
  return NextResponse.json({ ok: true });
}
