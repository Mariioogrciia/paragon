import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { limitar } from "@/lib/rateLimit";
import { setProfileInfo } from "@/lib/profiles";

/** Guarda nombre/foto de Ajustes del perfil — `{ "name": "...", "image": "https://..." | null }`. */
export async function POST(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (!(await limitar("perfil", userId))) {
    return NextResponse.json({ error: "Demasiadas peticiones seguidas. Espera un momento." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const image = typeof body?.image === "string" ? body.image.trim() : null;

  if (!name) {
    return NextResponse.json({ error: "El nombre a mostrar no puede estar vacío." }, { status: 400 });
  }

  await setProfileInfo(userId, name, image || null);
  return NextResponse.json({ ok: true });
}
