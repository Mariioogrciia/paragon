import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";
import path from "path";

const EXTENSIONES_PERMITIDAS: Record<"avatar" | "banner", string[]> = {
  avatar: [".jpg", ".jpeg", ".png", ".gif", ".webp"],
  banner: [".jpg", ".jpeg", ".png", ".gif", ".mp4", ".webm", ".webp"],
};

// Inicializamos el cliente de Supabase (con service_role para saltar RLS desde el servidor)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verificar si las variables de entorno están configuradas
    if (!supabaseUrl || !supabaseKey) {
      console.error("Faltan las variables de entorno de Supabase Storage.");
      return NextResponse.json({ error: "Storage no configurado" }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const kindRaw = formData.get("kind") as string | null;
    const kind: "avatar" | "banner" = kindRaw === "banner" ? "banner" : "avatar";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const ext = path.extname(file.name).toLowerCase();
    if (!EXTENSIONES_PERMITIDAS[kind].includes(ext)) {
      return NextResponse.json({ error: "Formato no admitido" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Subir a Supabase Storage (bucket "Avatars")
    // Lo guardamos en una subcarpeta según el tipo (avatars/ o banners/)
    const filename = `${kind}s/${session.user.id}-${Date.now()}${ext}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("Avatars")
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Error al subir a Supabase:", uploadError);
      return NextResponse.json({ error: "Upload to storage failed" }, { status: 500 });
    }

    // Obtener la URL pública de la imagen
    const { data: publicUrlData } = supabase.storage
      .from("Avatars")
      .getPublicUrl(filename);
      
    const fileUrl = publicUrlData.publicUrl;

    // Actualizar la tabla de usuarios
    const db = getDb();
    await db
      .update(users)
      .set(kind === "banner" ? { profileBannerUrl: fileUrl } : { image: fileUrl, avatarPersonalizado: true })
      .where(eq(users.id, session.user.id));

    return NextResponse.json({ url: fileUrl });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
