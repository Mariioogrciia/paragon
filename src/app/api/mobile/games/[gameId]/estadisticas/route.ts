import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { getProfileByHandle, getProfileByUserId } from "@/lib/profiles";
import { idiomaDeCabecera } from "@/lib/idiomasTrofeo";
import { errorMovil } from "@/lib/mensajesApi";
import { ocultosDelPerfil } from "@/lib/retirados";
import { estadisticasSteamDeJuego } from "@/lib/estadisticasSteam";
import { formatearEstadistica } from "@/lib/estadisticasJuego";

/**
 * Estadísticas dentro del juego (Steam) para la ficha de la app (9 nov 2026),
 * aparte de la ficha para no retrasarla: la app la pide después. `?de=<handle>`
 * como en la ficha. Cada una lleva su `texto` ya formateado en el idioma de
 * la cabecera. Lista vacía = no hay nada que enseñar.
 */
export async function GET(req: Request, { params }: { params: Promise<{ gameId: string }> }) {
  const userId = await getMobileUserId(req);
  if (!userId) return errorMovil(req, "No autenticado", 401);

  const propio = await getProfileByUserId(userId);
  if (!propio?.handle) return errorMovil(req, "Perfil sin terminar de configurar", 409);
  const de = new URL(req.url).searchParams.get("de");
  const profile = de && de !== propio.handle ? await getProfileByHandle(de) : propio;
  if (!profile) return errorMovil(req, "Perfil no encontrado", 404);

  const { gameId } = await params;
  if (profile !== propio && (await ocultosDelPerfil(profile.userId)).has(gameId)) {
    return errorMovil(req, "Juego no encontrado", 404);
  }

  const idioma = idiomaDeCabecera(req.headers.get("accept-language"));
  const lista = (await estadisticasSteamDeJuego(profile, gameId, idioma).catch(() => null)) ?? [];
  return NextResponse.json({
    estadisticas: lista.map((e) => ({ id: e.id, nombre: e.nombre, valor: e.valor, formato: e.formato, texto: formatearEstadistica(e, idioma) })),
  });
}
