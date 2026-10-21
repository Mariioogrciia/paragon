import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { limitar } from "@/lib/rateLimit";
import { handleDe, olvidarPerfilPublico, setProfileInfo } from "@/lib/profiles";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
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

/**
 * Eliminar la cuenta desde la app (16 oct 2026) — Google Play lo exige a
 * cualquier app en la que se crea una cuenta. Igual que `deleteAccountAction`
 * en la web (Ajustes → Seguridad): se borra el usuario y la base borra en
 * cascada todo lo suyo, sesiones de la app incluidas. Pide
 * `{ "confirmar": true }` para que una petición suelta no borre nada.
 */
export async function DELETE(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return errorMovil(req, "No autenticado", 401);
  }
  if (!(await limitar("perfil", userId))) {
    return errorMovil(req, "Demasiadas peticiones seguidas. Espera un momento.", 429);
  }
  const body = await req.json().catch(() => null);
  if (body?.confirmar !== true) {
    return errorMovil(req, "Datos no válidos", 400);
  }

  const handle = await handleDe(userId);
  await db.delete(users).where(eq(users.id, userId));
  olvidarPerfilPublico(handle);
  return NextResponse.json({ ok: true });
}
