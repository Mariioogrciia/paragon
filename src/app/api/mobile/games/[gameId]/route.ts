import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { getGameDetail, getProfileByUserId } from "@/lib/profiles";
import { idiomaDeCabecera } from "@/lib/idiomasTrofeo";
import { errorMovil } from "@/lib/mensajesApi";
import { gameProgress } from "@/lib/stats";
import { generarDiarioPlatino } from "@/lib/diarioPlatino";

/**
 * Ficha de un juego para GameDetailScreen (Android) — mismo `getGameDetail`
 * de la web (src/app/u/[handle]/[gameId]/page.tsx): puede lanzar un sync de
 * trofeos en segundo plano si estaban desactualizados, así que la primera
 * carga tras vincular una cuenta puede tardar algo más que las siguientes.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ gameId: string }> },
) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return errorMovil(req, "No autenticado", 401);
  }

  const profile = await getProfileByUserId(userId);
  if (!profile?.handle) {
    return errorMovil(req, "Perfil sin terminar de configurar", 409);
  }

  const { gameId } = await params;
  const detail = await getGameDetail(profile, gameId, idiomaDeCabecera(req.headers.get("accept-language")));
  if (!detail) {
    return errorMovil(req, "Juego no encontrado", 404);
  }

  // "El Diario del Platino", como en la web: solo con el platino (o su
  // equivalente sin metales) conseguido y fechas de verdad; si no, null.
  const diario = gameProgress(detail).platinumEarned ? generarDiarioPlatino(detail.trophies) : null;
  return NextResponse.json({ game: detail, diario });
}
