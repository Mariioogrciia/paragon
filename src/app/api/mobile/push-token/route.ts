import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { guardarTokenFcm } from "@/lib/fcm";

/**
 * Registra (o reasigna) el token de Firebase Cloud Messaging de este
 * dispositivo — la app lo llama al arrancar y cada vez que Firebase se lo
 * renueva. Body: `{ "token": "..." }`. Ver lib/fcm.ts.
 */
export async function POST(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : "";
  if (!token) {
    return NextResponse.json({ error: "Falta el token" }, { status: 400 });
  }

  await guardarTokenFcm(userId, token);
  return NextResponse.json({ ok: true });
}
