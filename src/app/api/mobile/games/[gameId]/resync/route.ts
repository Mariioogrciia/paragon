import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { limitar } from "@/lib/rateLimit";
import { refrescarJuego } from "@/lib/profiles";
import { errorMovil } from "@/lib/mensajesApi";
import { traducirMensaje } from "@/lib/mensajesApi";
import { idiomaDeCabecera } from "@/lib/idiomasTrofeo";

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
    return errorMovil(req, "No autenticado", 401);
  }
  if (!(await limitar("resync", userId))) {
    return errorMovil(req, "Has comprobado este juego muchas veces seguidas. Espera unos minutos.", 429);
  }

  const { gameId } = await params;
  const resultado = await refrescarJuego(userId, gameId);
  const idioma = idiomaDeCabecera(req.headers.get("accept-language"));
  return NextResponse.json(resultado.error ? { ...resultado, error: traducirMensaje(resultado.error, idioma) } : resultado);
}
