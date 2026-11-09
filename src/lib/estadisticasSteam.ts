import "server-only";
import { fetchEstadisticasJuego, SteamNotConfiguredError } from "@/lib/steam/client";
import { cuentasSteamExtra } from "@/lib/steamExtraDatos";
import { prepararEstadisticas, type EstadisticaJuego } from "@/lib/estadisticasJuego";
import { CODIGO_PLATAFORMA, esIdioma } from "@/lib/idiomasTrofeo";
import { accountFor, type ProfileRow } from "@/lib/profiles";
import { parseGameKey } from "@/lib/types";

/**
 * Las estadísticas dentro del juego de un juego de Steam de alguien (9 nov
 * 2026): con su cuenta principal y, si ahí no hay nada, con las demás
 * (lib/steamExtraDatos.ts). `null` = no es de Steam o no hay nada que
 * enseñar (el juego no guarda estadísticas o los detalles son privados).
 */
export async function estadisticasSteamDeJuego(profile: ProfileRow, gameId: string, idioma: string): Promise<EstadisticaJuego[] | null> {
  const { platform, nativeId } = parseGameKey(gameId);
  if (platform !== "steam" || !/^\d+$/.test(nativeId)) return null;
  const cuentas = [
    accountFor(profile, "steam")?.accountId,
    ...(await cuentasSteamExtra(profile.userId).catch(() => [])).map((c) => c.accountId),
  ].filter((id): id is string => Boolean(id));
  const codigo = CODIGO_PLATAFORMA.steam![esIdioma(idioma) ? idioma : "es"];
  for (const steamId of [...new Set(cuentas)].slice(0, 4)) {
    try {
      const { stats, esquema } = await fetchEstadisticasJuego(steamId, nativeId, codigo);
      const lista = prepararEstadisticas(stats, esquema);
      if (lista.length > 0) return lista;
    } catch (e) {
      if (e instanceof SteamNotConfiguredError) return null;
      console.error("[estadisticasSteam]", gameId, e);
    }
  }
  return null;
}
