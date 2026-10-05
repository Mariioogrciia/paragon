import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { limitar } from "@/lib/rateLimit";
import { completarDetalleSteam } from "@/lib/sync";
import { errorMovil } from "@/lib/mensajesApi";

export const maxDuration = 60;

/**
 * Igual que POST /api/steam/completar (web) pero con el Bearer de la app:
 * trae un lote de logros de Steam que faltan y dice cuántos quedan
 * (`{ hechos, restantes }`). La app lo llama en bucle tras vincular Steam y
 * desde su sincronización de fondo, hasta que `restantes` es 0.
 */
export async function POST(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) return errorMovil(req, "No autenticado", 401);
  if (!(await limitar("completarSteam", userId))) {
    return errorMovil(req, "Demasiadas peticiones seguidas. Espera un momento.", 429);
  }
  return NextResponse.json(await completarDetalleSteam(userId));
}
