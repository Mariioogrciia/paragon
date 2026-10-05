import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { trofeosPendientes } from "@/lib/sesiones";
import { idiomaDeCabecera } from "@/lib/idiomasTrofeo";
import { errorMovil } from "@/lib/mensajesApi";

/** `?gameId=` — los trofeos que te faltan en ese juego, para elegir el de la sesión. Vacío = escribirlo a mano. */
export async function GET(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) return errorMovil(req, "No autenticado", 401);
  const gameId = new URL(req.url).searchParams.get("gameId");
  if (!gameId) return errorMovil(req, "Datos no válidos", 400);
  const trofeos = await trofeosPendientes(userId, gameId, idiomaDeCabecera(req.headers.get("accept-language")));
  return NextResponse.json({ trofeos });
}
