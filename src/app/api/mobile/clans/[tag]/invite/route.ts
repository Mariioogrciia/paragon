import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { limitar } from "@/lib/rateLimit";
import { getClanByTag, inviteToClan } from "@/lib/clans";
import { errorMovil } from "@/lib/mensajesApi";

/**
 * Invita a un amigo al clan — `{ "invitedUserId": "..." }`. `inviteToClan`
 * ya valida que quien invita sea el owner y que el invitado sea amigo suyo
 * (no cualquier usuario) y no esté ya en un clan.
 */
export async function POST(req: Request, { params }: { params: Promise<{ tag: string }> }) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return errorMovil(req, "No autenticado", 401);
  }
  if (!(await limitar("comentario", userId))) {
    return errorMovil(req, "Demasiadas peticiones seguidas. Espera un momento.", 429);
  }

  const { tag } = await params;
  const clan = await getClanByTag(tag);
  if (!clan) {
    return errorMovil(req, "Clan no encontrado", 404);
  }

  const body = await req.json().catch(() => null);
  const invitedUserId = typeof body?.invitedUserId === "string" ? body.invitedUserId : "";
  if (!invitedUserId) {
    return errorMovil(req, "Falta invitedUserId", 400);
  }

  try {
    await inviteToClan(clan.id, userId, invitedUserId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorMovil(req, e instanceof Error ? e.message : "No se pudo invitar.", 400);
  }
}
