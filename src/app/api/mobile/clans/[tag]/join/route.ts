import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { limitar } from "@/lib/rateLimit";
import { getClanByTag, joinClan } from "@/lib/clans";
import { errorMovil } from "@/lib/mensajesApi";

/** Unirse a un clan por su tag. `joinClan` rechaza si ya estás en uno (a nivel de app y de base de datos). Sin body. */
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

  try {
    await joinClan(userId, clan.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorMovil(req, e instanceof Error ? e.message : "No se pudo unir al clan.", 400);
  }
}
