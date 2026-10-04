import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { fcmTokens } from "@/db/schema";
import { getBearerToken, getMobileUserId, revokeMobileSession } from "@/lib/mobileAuth";

/**
 * Cerrar sesión SOLO en este móvil — borra únicamente la fila de `session`
 * de este dispositivo (independiente desde `mintMobileSession`, ver
 * lib/mobileAuth.ts). No toca ninguna sesión web ni la de otros
 * dispositivos. Sin token, o token ya inválido: da igual, el resultado que
 * el cliente quiere (quedarse sin sesión) ya es cierto de todas formas.
 *
 * Body opcional `{ "fcmToken": "..." }` (auditoría, 4 oct 2026): antes el
 * token de notificaciones seguía asociado a la cuenta después de cerrar
 * sesión, y ese teléfono seguía recibiendo los avisos de esa persona. Solo
 * se borra si es de quien cierra sesión.
 */
export async function POST(req: Request) {
  const token = getBearerToken(req);
  if (token) {
    const userId = await getMobileUserId(req);
    const body = await req.json().catch(() => null);
    const fcmToken = typeof body?.fcmToken === "string" ? body.fcmToken.trim() : "";
    if (userId && fcmToken && fcmToken.length <= 4096) {
      await db.delete(fcmTokens).where(and(eq(fcmTokens.token, fcmToken), eq(fcmTokens.userId, userId)));
    }
    await revokeMobileSession(token);
  }

  return NextResponse.json({ ok: true });
}
