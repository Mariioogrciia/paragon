import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { getLibrary, getProfileByUserId } from "@/lib/profiles";
import { dietaGamer } from "@/lib/dietaGamer";
import { jsonConEtag } from "@/lib/etag";
import { errorMovil } from "@/lib/mensajesApi";

/**
 * "Dieta Gamer" — aviso amistoso si tus últimos 3 juegos terminados
 * comparten género y suman muchas horas (ver `dietaGamer()` en
 * lib/dietaGamer.ts para los umbrales exactos). `null` cuando no aplica —
 * es el estado normal la mayoría de las veces, no un error.
 */
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
  const dieta = dietaGamer(games);

  return jsonConEtag(req, { dieta }, userId);
}
