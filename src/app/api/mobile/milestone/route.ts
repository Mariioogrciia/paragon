import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { getHitoReservado } from "@/lib/milestones";
import { getLibrary, getProfileByUserId } from "@/lib/profiles";
import { summarise } from "@/lib/stats";
import { errorMovil } from "@/lib/mensajesApi";

/** Qué juego está reservado para el próximo hito redondo (o null si no hay ninguno) — "Cerrojo de Hitos" de la web. */
export async function GET(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return errorMovil(req, "No autenticado", 401);
  }

  const profile = await getProfileByUserId(userId);
  if (!profile?.handle) {
    return errorMovil(req, "Perfil sin terminar de configurar", 409);
  }

  const { games } = await getLibrary(profile);
  const { platinos } = summarise(games);
  const hito = await getHitoReservado(userId, platinos);

  return NextResponse.json({ hito });
}
