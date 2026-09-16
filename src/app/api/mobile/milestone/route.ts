import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { getHitoReservado } from "@/lib/milestones";
import { getLibrary, getProfileByUserId } from "@/lib/profiles";
import { summarise } from "@/lib/stats";

/** Qué juego está reservado para el próximo hito redondo (o null si no hay ninguno) — "Cerrojo de Hitos" de la web. */
export async function GET(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const profile = await getProfileByUserId(userId);
  if (!profile?.handle) {
    return NextResponse.json({ error: "Perfil sin terminar de configurar" }, { status: 409 });
  }

  const { games } = await getLibrary(profile);
  const { platinos } = summarise(games);
  const hito = await getHitoReservado(userId, platinos);

  return NextResponse.json({ hito });
}
