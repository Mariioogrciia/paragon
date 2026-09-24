import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { getClanByTag, joinClan } from "@/lib/clans";

/** Unirse a un clan por su tag. `joinClan` rechaza si ya estás en uno (a nivel de app y de base de datos). Sin body. */
export async function POST(req: Request, { params }: { params: Promise<{ tag: string }> }) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { tag } = await params;
  const clan = await getClanByTag(tag);
  if (!clan) {
    return NextResponse.json({ error: "Clan no encontrado" }, { status: 404 });
  }

  try {
    await joinClan(userId, clan.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "No se pudo unir al clan." }, { status: 400 });
  }
}
