import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { limitar } from "@/lib/rateLimit";
import { setProfileInfo } from "@/lib/profiles";
import { errorMovil } from "@/lib/mensajesApi";

/** Guarda nombre/foto de Ajustes del perfil — `{ "name": "...", "image": "https://..." | null }`. */
export async function POST(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return errorMovil(req, "No autenticado", 401);
  }
  if (!(await limitar("perfil", userId))) {
    return errorMovil(req, "Demasiadas peticiones seguidas. Espera un momento.", 429);
  }

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const image = typeof body?.image === "string" ? body.image.trim() : null;

  if (!name) {
    return errorMovil(req, "El nombre a mostrar no puede estar vacío.", 400);
  }

  await setProfileInfo(userId, name, image || null);
  return NextResponse.json({ ok: true });
}
