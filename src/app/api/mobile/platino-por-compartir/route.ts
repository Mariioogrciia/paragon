import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { limitar } from "@/lib/rateLimit";
import { marcarPlatinoPreguntado, platinoPorCompartir } from "@/lib/compartirPlatino";
import { errorMovil } from "@/lib/mensajesApi";

/**
 * "¿Lo compartes?" tras un platino nuevo, en la app (16 oct 2026, ver
 * lib/compartirPlatino.ts y CONTRACT.md). GET: el platino de esta semana por
 * el que aún no se ha preguntado, o `pendiente: null`. POST `{ gameId }`:
 * ya se preguntó (compartido o "ahora no"), no se vuelve a sacar.
 */
export async function GET(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) return errorMovil(req, "No autenticado", 401);
  return NextResponse.json({ pendiente: await platinoPorCompartir(userId) });
}

export async function POST(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) return errorMovil(req, "No autenticado", 401);
  if (!(await limitar("escritura", userId))) {
    return errorMovil(req, "Demasiadas peticiones seguidas. Espera un momento.", 429);
  }
  const body = await req.json().catch(() => null);
  const gameId = typeof body?.gameId === "string" ? body.gameId : "";
  if (!gameId || gameId.length > 200) return errorMovil(req, "Datos no válidos", 400);
  await marcarPlatinoPreguntado(userId, gameId);
  return NextResponse.json({ ok: true });
}
