import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { limitar } from "@/lib/rateLimit";
import { quitarCuentaSteamExtra } from "@/lib/steamExtra";
import { errorMovil } from "@/lib/mensajesApi";

/** Quitar una cuenta de Steam extra. Lo ya conseguido con ella se queda en la biblioteca. */
export async function DELETE(req: Request, { params }: { params: Promise<{ steamId: string }> }) {
  const userId = await getMobileUserId(req);
  if (!userId) return errorMovil(req, "No autenticado", 401);
  if (!(await limitar("escritura", userId))) {
    return errorMovil(req, "Demasiadas peticiones seguidas. Espera un momento.", 429);
  }

  const { steamId } = await params;
  if (!/^\d{5,25}$/.test(steamId)) return errorMovil(req, "Datos no válidos", 400);
  await quitarCuentaSteamExtra(userId, steamId);
  return NextResponse.json({ ok: true });
}
