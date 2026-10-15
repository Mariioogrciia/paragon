import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { limitar } from "@/lib/rateLimit";
import { describePlatformError, getProfileByUserId } from "@/lib/profiles";
import { SteamExtraError, anadirCuentaSteamExtra } from "@/lib/steamExtra";
import { errorMovil } from "@/lib/mensajesApi";

/**
 * Añadir otra cuenta de Steam (ver lib/steamExtra.ts): `{ "input": "usuario,
 * SteamID64 o URL" }`. Responde como vincular una plataforma: `{ username,
 * legible, juegos }`. De momento solo el desarrollador.
 */
export async function POST(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) return errorMovil(req, "No autenticado", 401);
  if (!(await limitar("vincularCuenta", userId))) {
    return errorMovil(req, "Demasiados intentos de vincular seguidos. Prueba dentro de unos minutos.", 429);
  }

  const profile = await getProfileByUserId(userId);
  if (!profile?.esDesarrollador) return errorMovil(req, "No disponible.", 403);

  const body = await req.json().catch(() => null);
  const input = typeof body?.input === "string" ? body.input.trim() : "";
  if (!input) return errorMovil(req, "Falta el identificador de la cuenta", 400);

  try {
    const r = await anadirCuentaSteamExtra(userId, input);
    return NextResponse.json({ username: r.username, legible: r.legible, juegos: r.juegos });
  } catch (error) {
    return errorMovil(req, error instanceof SteamExtraError ? error.message : describePlatformError(error), 422);
  }
}
