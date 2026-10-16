import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { limitar } from "@/lib/rateLimit";
import { avisosDe, marcarAvisosLeidos } from "@/lib/bandeja";
import { idiomaDeCabecera } from "@/lib/idiomasTrofeo";
import { errorMovil } from "@/lib/mensajesApi";

/**
 * Bandeja de avisos de la app (16 oct 2026, ver lib/bandeja.ts y
 * CONTRACT.md). GET → `{ avisos, noLeidos }`, en el idioma del teléfono.
 * POST → todo leído.
 */
export async function GET(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) return errorMovil(req, "No autenticado", 401);
  if (!(await limitar("vista", userId))) {
    return errorMovil(req, "Demasiadas peticiones seguidas. Espera un momento.", 429);
  }
  return NextResponse.json(await avisosDe(userId, idiomaDeCabecera(req.headers.get("accept-language"))));
}

export async function POST(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) return errorMovil(req, "No autenticado", 401);
  await marcarAvisosLeidos(userId);
  return NextResponse.json({ ok: true });
}
