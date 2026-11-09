import { getMobileUserId } from "@/lib/mobileAuth";
import { getLibrary, getProfileByUserId } from "@/lib/profiles";
import { esPlatinoEquivalente } from "@/lib/stats";
import { platinables, type Platinable } from "@/lib/platinables";
import { getRetirados } from "@/lib/retirados";
import { consolasParaRetirar, sinRetirados } from "@/lib/retiradosReglas";
import { doblesPlatinos, extrasPlatinables, type ExtrasJuego } from "@/lib/platinablesExtras";
import { getTrophyRecommendations } from "@/lib/recommendations";
import { idiomaDeCabecera } from "@/lib/idiomasTrofeo";
import { ultimosTrofeos } from "@/lib/history";
import type { Game } from "@/lib/types";
import { jsonConEtag } from "@/lib/etag";
import { errorMovil } from "@/lib/mensajesApi";

/**
 * "A un paso del platino" y "Jugado recientemente" del Panel (Android) —
 * MISMO cálculo que la portada web (app/page.tsx: nearPlatinum/recientes),
 * no una aproximación aparte. Endpoint propio (no derivado de
 * /api/mobile/library en el cliente) para no duplicar `gameProgress()` en
 * Kotlin y arriesgarse a que las dos versiones diverjan con el tiempo.
 */
function toCard(game: Game) {
  return {
    id: game.id,
    title: game.title,
    coverUrl: game.iconUrl ?? "",
    earnedTrophies: game.earnedTotal,
    totalTrophies: game.definedTotal,
    percent: game.progressPercent,
    // Platinado de verdad (platino del juego base), aunque falten DLC: sin
    // esto la app contaba los trofeos de DLC pendientes y lo daba por
    // "siguiente platino".
    platinado: esPlatinoEquivalente(game),
  };
}

export async function GET(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return errorMovil(req, "No autenticado", 401);
  }

  const profile = await getProfileByUserId(userId);
  if (!profile?.handle) {
    return errorMovil(req, "Perfil sin terminar de configurar", 409);
  }

  const idioma = idiomaDeCabecera(req.headers.get("accept-language"));
  const [{ games }, recomendaciones, ultimos] = await Promise.all([
    getLibrary(profile),
    // "Siguiente trofeo" — ya existía en la portada web (app/page.tsx) y
    // nunca había llegado al móvil. Mismo cálculo, no una aproximación
    // aparte (prioriza juego base sobre DLC, progreso alto y mayor
    // probabilidad real de conseguirlo — ver lib/recommendations.ts).
    getTrophyRecommendations(userId, 4, idioma),
    // "Últimos trofeos" — lo mismo que la sección del perfil web
    // (RecentTrophies.tsx): los más recientes de toda la biblioteca.
    ultimosTrofeos(userId, 5, idioma),
  ]);

  // getLibrary ya devuelve los juegos ordenados por lastPlayedAt desc
  // (ver profiles.ts) — "recientes" es solo tomar los primeros no-deseados,
  // igual que la portada web.
  const recent = games.filter((g) => !g.isWishlist).slice(0, 6);

  // Qué te puedes platinar (8 nov 2026, lib/platinables.ts): las dos listas
  // de la web. `nearPlatinum` se queda (los 3 primeros) para las versiones
  // de la app que aún no conocen `platinables`.
  const marcas = await getRetirados(userId);
  const listas = platinables(sinRetirados(games, marcas), undefined, marcas.instalados);
  const [extras, dobles] = await Promise.all([
    extrasPlatinables(userId, [...listas.cerca, ...listas.jugando].map((p) => p.game.id)).catch(() => new Map<string, ExtrasJuego>()),
    doblesPlatinos(sinRetirados(games, marcas)).catch(() => []),
  ]);
  const nearPlatinum = listas.cerca.slice(0, 3).map((p) => p.game);
  const aFila = (p: Platinable) => {
    const e = extras.get(p.game.id);
    return {
      ...toCard(p.game),
      faltan: p.faltan,
      tienePlatino: (p.game.defined?.platinum ?? 0) > 0,
      sinEmpezar: p.game.earnedTotal === 0,
      diasDesdeJugado: p.diasDesdeJugado,
      horasRestantes: p.horasRestantes,
      dispositivos: p.dispositivos,
      suscripcion: p.suscripcion,
      instalado: p.instalado,
      rarezaPlatino: p.rarezaPlatino,
      perdibles: e?.perdibles ?? 0,
      masRaroPendiente: e?.masRaroPendiente ?? null,
      amigos: (e?.amigos ?? []).map((a) => ({ nombre: a.nombre ?? a.handle, percent: a.percent })),
    };
  };
  const sugerencia = consolasParaRetirar(games, marcas)[0] ?? null;

  return jsonConEtag(req, {
    nearPlatinum: nearPlatinum.map(toCard),
    platinables: {
      cerca: listas.cerca.map(aFila),
      jugando: listas.jugando.map(aFila),
      faciles: listas.faciles.map(aFila),
      dobles: dobles.map((d) => ({ id: d.otra.id, titulo: d.otra.titulo, coverUrl: d.otra.iconUrl ?? "", consola: d.otra.dispositivo, platinadoEn: d.platinado.dispositivo, laTienes: d.laTienes })),
      // "Hace 3 años que no juegas a nada de PS3": la app pregunta si la quita de las sugerencias.
      sugerenciaRetirar: sugerencia,
    },
    recent: recent.map(toCard),
    nextTrophies: recomendaciones.map((r) => ({
      gameId: r.gameId,
      gameTitle: r.gameTitle,
      trophyId: r.trophyId,
      trophyName: r.trophyName,
      detail: r.detail,
      rarityPercent: r.rarityPercent,
      gameProgress: r.gameProgress,
      iconUrl: r.iconUrl,
      grade: r.grade,
    })),
    latestTrophies: ultimos.map((t) => ({
      gameId: t.gameId,
      gameTitle: t.juego,
      gameIconUrl: t.gameIconUrl,
      trophyId: t.trophyId,
      trophyName: t.nombre,
      iconUrl: t.iconUrl,
      grade: t.grade,
      earnedAt: t.earnedAt,
      rarityPercent: t.rarityPercent,
    })),
  }, userId);
}
