import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { limitar } from "@/lib/rateLimit";
import { guardarTokenFcm } from "@/lib/fcm";
import { errorMovil } from "@/lib/mensajesApi";

/**
 * Registra (o reasigna) el token de Firebase Cloud Messaging de este
 * dispositivo — la app lo llama al arrancar y cada vez que Firebase se lo
 * renueva. Body: `{ "token": "..." }`. Ver lib/fcm.ts.
 */
export async function POST(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return errorMovil(req, "No autenticado", 401);
  }
  if (!(await limitar("pushToken", userId))) {
    return errorMovil(req, "Demasiadas peticiones seguidas. Espera un momento.", 429);
  }

  const body = await req.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  // Los tokens de FCM rondan los 150-200 caracteres; nada de basura enorme en la tabla.
  if (!token || token.length > 4096 || /\s/.test(token)) {
    return errorMovil(req, "Falta el token", 400);
  }

  await guardarTokenFcm(userId, token);
  return NextResponse.json({ ok: true });
}
