import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { subirArchivoPerfil } from "@/lib/uploads";
import { limitar } from "@/lib/rateLimit";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    if (!(await limitar("subida", userId))) {
      return NextResponse.json({ error: "Demasiadas subidas seguidas. Prueba dentro de unos minutos." }, { status: 429 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const kind = formData.get("kind") === "banner" ? "banner" : "avatar";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const db = getDb();
    const [actual] = await db
      .select({ image: users.image, profileBannerUrl: users.profileBannerUrl })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const resultado = await subirArchivoPerfil(
      userId,
      file,
      kind,
      kind === "banner" ? (actual?.profileBannerUrl ?? null) : (actual?.image ?? null),
    );
    if ("error" in resultado) {
      return NextResponse.json({ error: resultado.error }, { status: resultado.status });
    }

    await db
      .update(users)
      .set(kind === "banner" ? { profileBannerUrl: resultado.url } : { image: resultado.url, avatarPersonalizado: true })
      .where(eq(users.id, userId));

    return NextResponse.json({ url: resultado.url });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
