import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";
import path from "path";

const EXTENSIONES_PERMITIDAS = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

// Mismo bucket "Avatars" y mismo criterio (`avatarPersonalizado: true`, gana
// a la de PSN/proveedor de login — ver `resolveAvatarUrl` en lib/profiles.ts)
// que el subidor de la web (src/app/api/upload/route.ts), pero autenticado
// con el token propio de la app (`getMobileUserId`) en vez de la cookie de
// NextAuth: la Custom Tab del login web no comparte sesión con las llamadas
// normales de Retrofit, así que /api/upload (que exige `auth()`) no sirve
// aquí. Sin refactor del route de la web a propósito — es una ruta ya en
// producción, duplicar estas ~30 líneas es más seguro que tocarla.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

/** Sube y vincula una foto de perfil nueva desde la app nativa — `multipart/form-data`, campo `file`. */
export async function POST(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (!supabaseUrl || !supabaseKey) {
    console.error("Faltan las variables de entorno de Supabase Storage.");
    return NextResponse.json({ error: "Storage no configurado" }, { status: 500 });
  }

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No se envió ningún archivo" }, { status: 400 });
  }

  const ext = path.extname(file.name).toLowerCase();
  if (!EXTENSIONES_PERMITIDAS.includes(ext)) {
    return NextResponse.json({ error: "Formato no admitido" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const filename = `avatars/${userId}-${Date.now()}${ext}`;

  const { error: uploadError } = await supabase.storage.from("Avatars").upload(filename, buffer, {
    contentType: file.type,
    upsert: true,
  });
  if (uploadError) {
    console.error("Error al subir a Supabase:", uploadError);
    return NextResponse.json({ error: "No se pudo subir la imagen" }, { status: 500 });
  }

  const { data: publicUrlData } = supabase.storage.from("Avatars").getPublicUrl(filename);
  const url = publicUrlData.publicUrl;

  const db = getDb();
  await db.update(users).set({ image: url, avatarPersonalizado: true }).where(eq(users.id, userId));

  return NextResponse.json({ url });
}
