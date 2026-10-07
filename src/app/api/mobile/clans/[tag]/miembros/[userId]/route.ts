import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { getClanByTag, cambiarRango, expulsarDelClan, ClanError } from "@/lib/clans";
import { RANGOS, type Rango } from "@/lib/clanRangos";
import { errorMovil } from "@/lib/mensajesApi";

type Params = { params: Promise<{ tag: string; userId: string }> };

/**
 * Un miembro del clan, para quien tiene rango sobre él (lib/clanRangos.ts).
 * POST `{ "rango": "owner" | "colider" | "veterano" | "member" }` cambia su
 * rango ("owner" pasa el liderazgo); DELETE lo expulsa.
 */
export async function POST(req: Request, { params }: Params) {
  const actorId = await getMobileUserId(req);
  if (!actorId) {
    return errorMovil(req, "No autenticado", 401);
  }
  const { tag, userId } = await params;
  const clan = await getClanByTag(tag);
  if (!clan) {
    return errorMovil(req, "Clan no encontrado", 404);
  }
  const body = await req.json().catch(() => null);
  const rango = typeof body?.rango === "string" ? body.rango : "";
  if (!(RANGOS as readonly string[]).includes(rango)) {
    return errorMovil(req, "Rango no válido", 400);
  }
  try {
    await cambiarRango(actorId, clan.id, userId, rango as Rango);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ClanError) return errorMovil(req, e.message, 403);
    throw e;
  }
}

export async function DELETE(req: Request, { params }: Params) {
  const actorId = await getMobileUserId(req);
  if (!actorId) {
    return errorMovil(req, "No autenticado", 401);
  }
  const { tag, userId } = await params;
  const clan = await getClanByTag(tag);
  if (!clan) {
    return errorMovil(req, "Clan no encontrado", 404);
  }
  try {
    await expulsarDelClan(actorId, clan.id, userId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ClanError) return errorMovil(req, e.message, 403);
    throw e;
  }
}
