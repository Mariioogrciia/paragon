import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { refrescarJuego } from "@/lib/profiles";

/**
 * "¿Ya lo tengo?" de Modo Enfoque — vuelve a pedir los trofeos de ESTE
 * juego a su plataforma (sin esperar al cron ni resincronizar toda la
 * biblioteca). `{ "nuevos": N }` o `{ "nuevos": 0, "error": "..." }` si no
 * se pudo (nunca 4xx/5xx para este caso — el cliente distingue por el
 * campo `error`, igual que la web).
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ gameId: string }> },
) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { gameId } = await params;
  const resultado = await refrescarJuego(userId, gameId);
  return NextResponse.json(resultado);
}
