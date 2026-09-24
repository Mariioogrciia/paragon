import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getMobileUserId } from "@/lib/mobileAuth";
import { listTrophyGuides, upsertTrophyGuide, deleteTrophyGuide, TrophyGuideError } from "@/lib/trophyGuides";

/**
 * Guías escritas de un trofeo — apuntes reales de gente de aquí, no un
 * enlace de búsqueda (eso es GET .../guide, el vídeo). Una fila por
 * (usuario, juego, trofeo): publicar de nuevo actualiza la tuya, nunca
 * duplica. Mismo dato que la pestaña "Guía escrita" de TrophyGuideModal.tsx
 * en la web.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ gameId: string; trophyId: string }> },
) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { gameId, trophyId } = await params;
  const guides = await listTrophyGuides(gameId, trophyId);
  return NextResponse.json({ guides, currentUserId: userId });
}

/** Publica (o actualiza la tuya) — `{ "body": "..." }`. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ gameId: string; trophyId: string }> },
) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { gameId, trophyId } = await params;
  const body = await req.json().catch(() => null);
  const texto = typeof body?.body === "string" ? body.body : "";

  const [dbUser] = await db.select({ language: users.language }).from(users).where(eq(users.id, userId)).limit(1);
  const idioma = (dbUser?.language ?? "es-ES").slice(0, 2);

  try {
    await upsertTrophyGuide(userId, gameId, trophyId, texto, idioma);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof TrophyGuideError ? e.message : "No se ha podido guardar la guía.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/** Borra la guía propia de este trofeo — sin body. */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ gameId: string; trophyId: string }> },
) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { gameId, trophyId } = await params;
  await deleteTrophyGuide(userId, gameId, trophyId);
  return NextResponse.json({ ok: true });
}
