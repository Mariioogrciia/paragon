import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { getGameDetail, getProfileByUserId } from "@/lib/profiles";

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
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const profile = await getProfileByUserId(userId);
  if (!profile?.handle) {
    return NextResponse.json({ error: "Perfil sin terminar de configurar" }, { status: 409 });
  }

  const { gameId } = await params;
  const detail = await getGameDetail(profile, gameId);
  if (!detail) {
    return NextResponse.json({ error: "Juego no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ game: detail });
}
