import "server-only";
import { getLibrary, getProfileByHandle } from "@/lib/profiles";
import { getParagonLevel } from "@/lib/paragonLevel";
import { ultimosTrofeos } from "@/lib/history";
import { summarise } from "@/lib/stats";
import type { Game } from "@/lib/types";
import type { ResumenStreamer } from "@/lib/streamerTexto";

/**
 * Lo que necesitan el overlay de OBS, el comando de chat (`/api/texto`) y la
 * insignia SVG, en una sola lectura. `null` si el perfil no existe.
 *
 * El juego "actual" es el mismo que elige el overlay desde siempre: el
 * anclado en Modo Enfoque o, si no hay, el último jugado.
 */
export async function resumenStreamer(handleBruto: string): Promise<ResumenStreamer | null> {
  const handle = handleBruto.toLowerCase();
  const profile = await getProfileByHandle(handle);
  if (!profile) return null;

  const [{ player, games }, nivel, recientes] = await Promise.all([
    getLibrary(profile),
    getParagonLevel(profile.userId),
    ultimosTrofeos(profile.userId, 1),
  ]);
  const resumen = summarise(games);
  const actual = juegoActual(games);
  const ultimo = recientes[0];

  return {
    handle,
    nombre: player.name || handle,
    nivel: nivel.level,
    platinos: resumen.platinos,
    trofeos: resumen.trofeos,
    juegos: resumen.juegos,
    completado: resumen.completadoMedio,
    actual: actual
      ? {
          titulo: actual.title,
          ganados: actual.earnedTotal,
          total: actual.definedTotal,
          porcentaje: Math.max(0, Math.min(100, actual.progressPercent)),
          iconUrl: actual.iconUrl ?? null,
        }
      : null,
    ultimo: ultimo
      ? { nombre: ultimo.nombre, juego: ultimo.juego, grado: ultimo.grade, earnedAt: ultimo.earnedAt, iconUrl: ultimo.iconUrl ?? ultimo.gameIconUrl }
      : null,
  };
}

function juegoActual(games: Game[]): Game | undefined {
  const jugados = games.filter((g) => !g.isWishlist);
  return (
    jugados.find((g) => g.isPinned) ??
    [...jugados].sort((a, b) => (b.lastPlayedAt ?? "").localeCompare(a.lastPlayedAt ?? ""))[0]
  );
}
