import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { subirArchivoPerfil } from "@/lib/uploads";
import { limitar } from "@/lib/rateLimit";
import { errorMovil } from "@/lib/mensajesApi";

// Mismo bucket "Avatars" y mismo criterio (`avatarPersonalizado: true`, gana
// a la de PSN/proveedor de login — ver `resolveAvatarUrl` en lib/profiles.ts)
// que el subidor de la web (src/app/api/upload/route.ts), pero autenticado
// con el token propio de la app (`getMobileUserId`) en vez de la cookie de
// NextAuth: la Custom Tab del login web no comparte sesión con las llamadas
// normales de Retrofit, así que /api/upload (que exige `auth()`) no sirve
// aquí. La subida en sí vive en lib/uploads.ts, compartida con la web.

/** Sube y vincula una foto de perfil nueva desde la app nativa — `multipart/form-data`, campo `file`. */
export async function POST(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return errorMovil(req, "No autenticado", 401);
  }
  if (!(await limitar("subida", userId))) {
    return errorMovil(req, "Demasiadas subidas seguidas. Prueba dentro de unos minutos.", 429);
  }

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file") as File | null;
  if (!file) {
    return errorMovil(req, "No se envió ningún archivo", 400);
  }

  const db = getDb();
  const [actual] = await db.select({ image: users.image }).from(users).where(eq(users.id, userId)).limit(1);

  const resultado = await subirArchivoPerfil(userId, file, "avatar", actual?.image ?? null);
  if ("error" in resultado) {
    return errorMovil(req, resultado.error, resultado.status);
  }

  await db.update(users).set({ image: resultado.url, avatarPersonalizado: true }).where(eq(users.id, userId));

  return NextResponse.json({ url: resultado.url });
}
