import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { writeFile } from "fs/promises";
import path from "path";

/**
 * Extensiones admitidas por tipo de subida. El banner además admite vídeo
 * (mp4/webm) para banners animados; el avatar no, porque se recorta en
 * redondo y un vídeo ahí no aporta nada.
 */
const EXTENSIONES_PERMITIDAS: Record<"avatar" | "banner", string[]> = {
  avatar: [".jpg", ".jpeg", ".png", ".gif"],
  banner: [".jpg", ".jpeg", ".png", ".gif", ".mp4", ".webm"],
};

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    // "avatar" por defecto: mantiene compatible cualquier llamada vieja que
    // no mande `kind` todavía.
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

    // Guardar en public/uploads/
    const filename = `${session.user.id}-${Date.now()}${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    const filepath = path.join(uploadDir, filename);

    await writeFile(filepath, buffer);

    const fileUrl = `/uploads/${filename}`;

    // Actualizar la columna que corresponde: antes esto siempre escribía en
    // `image` sin mirar qué se estaba subiendo, así que un banner nuevo
    // pisaba el avatar en silencio.
    const db = getDb();
    await db
      .update(users)
      .set(kind === "banner" ? { profileBannerUrl: fileUrl } : { image: fileUrl })
      .where(eq(users.id, session.user.id));

    return NextResponse.json({ url: fileUrl });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
