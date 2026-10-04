import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { getLibrary, getProfileByUserId } from "@/lib/profiles";
import { generoTop, juegoDestacado } from "@/components/ParagonWrap";
import { resumenHistorico, juegosDelAnio, rachas } from "@/lib/history";
import { percentilTrofeosAnio } from "@/lib/wrapPercentile";
import { jsonConEtag } from "@/lib/etag";
import { errorMovil } from "@/lib/mensajesApi";

/**
 * Paragon Wrap — mismo dato que las 3 tarjetas del perfil (ParagonWrap.tsx)
 * más lo que solo tenía sitio en la versión ampliada "Stories" de la web
 * (WrapStories.tsx): mejor mes, racha y percentil mundial. Un único
 * endpoint porque todo se enseña junto, en el mismo recorrido — no hace
 * falta que el cliente pida cinco cosas sueltas.
 *
 * NADA de esto es un dato nuevo: son los mismos cálculos de siempre
 * (lib/history.ts, lib/wrapPercentile.ts, ParagonWrap.tsx), solo que sin
 * sitio en el móvil hasta ahora.
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

  const [resumen, juegosEsteAnio, rachasUsuario, percentil] = await Promise.all([
    resumenHistorico(userId),
    juegosDelAnio(userId),
    games.length > 0 ? rachas(userId) : Promise.resolve({ actual: 0, mejor: 0, diasActivos: 0, hoyCuenta: false }),
    games.length > 0 ? percentilTrofeosAnio(userId) : Promise.resolve(null),
  ]);

  const topGenre = generoTop(games);
  const topGame = juegoDestacado(games);

  return jsonConEtag(req, {
    playerName: profile.displayName ?? profile.handle,
    esteAnio: resumen.esteAnio,
    juegosEsteAnio,
    topGenre,
    topGame: topGame
      ? {
          id: topGame.game.id,
          title: topGame.game.title,
          iconUrl: topGame.game.iconUrl ?? null,
          horasTotal: topGame.horasTotal,
          earnedTrophies: topGame.game.earnedTotal,
        }
      : null,
    mejorMes: resumen.mejorMes,
    rachas: rachasUsuario,
    percentil,
  }, userId);
}
