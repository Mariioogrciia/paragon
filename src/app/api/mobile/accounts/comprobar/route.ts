import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { limitar } from "@/lib/rateLimit";
import { describePlatformError } from "@/lib/profiles";
import { esPlataformaAsistente } from "@/lib/comprobarCuenta";
import { diagnosticarCuenta } from "@/lib/diagnosticoCuenta";
import { errorMovil } from "@/lib/mensajesApi";

/**
 * "Comprobar" del asistente de vincular en la app (16 oct 2026), igual que
 * `comprobarCuentaAction` en la web: `{ "platform": "steam", "input": "..." }`
 * → la cuenta encontrada y qué ajustes están bien o faltan, SIN vincularla.
 * Ver lib/diagnosticoCuenta.ts y CONTRACT.md.
 */
export async function POST(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) return errorMovil(req, "No autenticado", 401);
  if (!(await limitar("comprobarCuenta", userId))) {
    return errorMovil(req, "Demasiadas comprobaciones seguidas. Espera un momento.", 429);
  }

  const body = await req.json().catch(() => null);
  const platform: unknown = body?.platform;
  const input = typeof body?.input === "string" ? body.input.trim() : "";
  if (!esPlataformaAsistente(platform)) return errorMovil(req, "Plataforma no válida", 400);
  if (!input) return errorMovil(req, "Falta el identificador de la cuenta", 400);

  try {
    return NextResponse.json(await diagnosticarCuenta(userId, platform, input));
  } catch (error) {
    return errorMovil(req, describePlatformError(error), 422);
  }
}
