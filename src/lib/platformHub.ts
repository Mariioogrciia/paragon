import "server-only";
import { and, desc, eq, gte, isNotNull, notInArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { games as gamesTable, userGames } from "@/db/schema";
import { getProfileByUserId, getLibrary } from "@/lib/profiles";
import type { DiscoverGame } from "@/lib/discover";

/**
 * Consultas para las páginas propias de plataforma (`/descubrir/[plataforma]`).
 *
 * A diferencia de `lib/discover.ts` (que agrupa por `igdbId` a propósito
 * porque no le importa la plataforma), aquí SÍ se filtra `games.platform` —
 * es el punto entero de la página. Un juego con versión en PSN y en Steam
 * cuenta solo en la plataforma que se está mirando, no en las dos.
 *
 * "psn" es el valor real de `games.platform`; la URL y el resto de la UI
 * dicen "playstation", que es más reconocible.
 */
export type PlataformaHub = "psn" | "steam";

function parseGenres(raw: string | null): string[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw) ?? [];
  } catch {
    return [];
  }
}

/** Mismo cálculo que `getTrendingGames` (lib/discover.ts), pero solo con las filas de una plataforma. */
export async function trendingOnPlatform(
  plataforma: PlataformaHub,
  limit = 12,
  dias = 30,
): Promise<(DiscoverGame & { recientes: number })[]> {
  const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      igdbId: gamesTable.igdbId,
      title: sql<string>`MAX(${gamesTable.title})`,
      iconUrl: sql<string>`MAX(${gamesTable.iconUrl})`,
      genres: sql<string>`MAX(CAST(${gamesTable.genres} AS text))`,
      recientes: sql<number>`COUNT(DISTINCT ${userGames.userId})`,
    })
    .from(userGames)
    .innerJoin(gamesTable, eq(gamesTable.id, userGames.gameId))
    .where(and(eq(gamesTable.platform, plataforma), isNotNull(gamesTable.igdbId), gte(userGames.createdAt, desde)))
    .groupBy(gamesTable.igdbId)
    .having(sql`COUNT(DISTINCT ${userGames.userId}) > 0`)
    .orderBy(desc(sql`COUNT(DISTINCT ${userGames.userId})`))
    .limit(limit);

  return rows
    .filter((r): r is typeof r & { igdbId: number } => r.igdbId != null)
    .map((r) => ({
      igdbId: r.igdbId,
      title: r.title,
      iconUrl: r.iconUrl ?? undefined,
      genres: parseGenres(r.genres),
      recientes: Number(r.recientes),
    }));
}

/**
 * Más jugados EN PARAGON, por horas totales registradas — no es un dato
 * global de la plataforma (Sony y Valve no publican eso), es lo que
 * reportan las cuentas vinculadas aquí. Se etiqueta así en la propia
 * pantalla para no dar a entender otra cosa.
 */
export async function mostPlayedOnPlatform(
  plataforma: PlataformaHub,
  limit = 12,
): Promise<(DiscoverGame & { horas: number })[]> {
  const rows = await db
    .select({
      igdbId: gamesTable.igdbId,
      title: sql<string>`MAX(${gamesTable.title})`,
      iconUrl: sql<string>`MAX(${gamesTable.iconUrl})`,
      genres: sql<string>`MAX(CAST(${gamesTable.genres} AS text))`,
      minutos: sql<number>`SUM(${userGames.playtimeMinutes})`,
    })
    .from(userGames)
    .innerJoin(gamesTable, eq(gamesTable.id, userGames.gameId))
    .where(and(eq(gamesTable.platform, plataforma), isNotNull(gamesTable.igdbId), isNotNull(userGames.playtimeMinutes), eq(userGames.isWishlist, false)))
    .groupBy(gamesTable.igdbId)
    .having(sql`SUM(${userGames.playtimeMinutes}) > 0`)
    .orderBy(desc(sql`SUM(${userGames.playtimeMinutes})`))
    .limit(limit);

  return rows
    .filter((r): r is typeof r & { igdbId: number } => r.igdbId != null)
    .map((r) => ({
      igdbId: r.igdbId,
      title: r.title,
      iconUrl: r.iconUrl ?? undefined,
      genres: parseGenres(r.genres),
      horas: Math.round(Number(r.minutos) / 60),
    }));
}

/**
 * "Porque juegas en esta plataforma": lo más popular de esa plataforma
 * concreta que el usuario todavía no tiene — mismo criterio de popularidad
 * que `getGameRecommendations`, filtrado a una sola plataforma. Sin sesión,
 * o sin biblioteca todavía, devuelve lo más popular sin más (sin "porque
 * juegas a X", que necesita saber qué géneros juega la persona).
 */
export async function recommendationsOnPlatform(
  userId: string | null,
  plataforma: PlataformaHub,
  limit = 12,
): Promise<DiscoverGame[]> {
  let ownedIgdbIds: number[] = [];
  if (userId) {
    const profile = await getProfileByUserId(userId);
    if (profile) {
      const { games: userGamesList } = await getLibrary(profile);
      ownedIgdbIds = [...new Set(userGamesList.map((g) => g.igdbId).filter((id): id is number => id != null))];
    }
  }
  const excludeIgdbIds = ownedIgdbIds.length > 0 ? ownedIgdbIds : [-1];

  const rows = await db
    .select({
      igdbId: gamesTable.igdbId,
      title: sql<string>`MAX(${gamesTable.title})`,
      iconUrl: sql<string>`MAX(${gamesTable.iconUrl})`,
      genres: sql<string>`MAX(CAST(${gamesTable.genres} AS text))`,
    })
    .from(gamesTable)
    .innerJoin(userGames, eq(userGames.gameId, gamesTable.id))
    .where(and(eq(gamesTable.platform, plataforma), isNotNull(gamesTable.igdbId), notInArray(gamesTable.igdbId, excludeIgdbIds)))
    .groupBy(gamesTable.igdbId)
    .having(sql`COUNT(DISTINCT ${userGames.userId}) > 0`)
    .orderBy(desc(sql`COUNT(DISTINCT ${userGames.userId})`))
    .limit(limit);

  return rows
    .filter((r): r is typeof r & { igdbId: number } => r.igdbId != null)
    .map((r) => ({
      igdbId: r.igdbId,
      title: r.title,
      iconUrl: r.iconUrl ?? undefined,
      genres: parseGenres(r.genres),
    }));
}

/** Todos los AppID de Steam que tenemos catalogados, para preguntarle a Steam cuánta gente los juega ahora mismo. */
async function steamAppIdsCatalogados(): Promise<{ igdbId: number; appId: string; title: string; iconUrl?: string; genres: string[] }[]> {
  const rows = await db
    .select({
      igdbId: gamesTable.igdbId,
      nativeId: gamesTable.nativeId,
      title: gamesTable.title,
      iconUrl: gamesTable.iconUrl,
      genres: sql<string>`CAST(${gamesTable.genres} AS text)`,
    })
    .from(gamesTable)
    .where(and(eq(gamesTable.platform, "steam"), isNotNull(gamesTable.igdbId)));

  return rows
    .filter((r): r is typeof r & { igdbId: number } => r.igdbId != null)
    .map((r) => ({ igdbId: r.igdbId, appId: r.nativeId, title: r.title, iconUrl: r.iconUrl ?? undefined, genres: parseGenres(r.genres) }));
}

/**
 * "Juegos muertos" de Steam: gente jugando AHORA MISMO en todo Steam, según
 * el contador público de Valve — dato real y global, no de Paragon. Solo se
 * pregunta por los juegos de Steam que ya tenemos catalogados (los que
 * alguien de aquí tiene en su biblioteca): Steam no publica un listado de
 * "todos los juegos con pocos jugadores", así que no hay forma de barrer el
 * catálogo entero, solo de consultar uno a uno.
 *
 * No hay equivalente para PlayStation: Sony no publica cuánta gente juega
 * cada título ahora mismo, ni en ningún momento — a diferencia de las
 * ofertas de PS Store, ni siquiera hay un intento a medias que documentar,
 * directamente no existe el dato en ningún sitio público.
 */
export async function casiSinJugadoresEnSteam(limit = 8): Promise<(DiscoverGame & { jugandoAhora: number })[]> {
  const catalogo = await steamAppIdsCatalogados();
  if (catalogo.length === 0) return [];

  const conContador = await Promise.all(
    catalogo.map(async (g) => {
      try {
        const res = await fetch(
          `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${g.appId}&format=json`,
          { next: { revalidate: 3600 } },
        );
        if (!res.ok) return null;
        const data = (await res.json()) as { response?: { result?: number; player_count?: number } };
        if (data.response?.result !== 1 || data.response.player_count == null) return null;
        return { ...g, jugandoAhora: data.response.player_count };
      } catch {
        return null;
      }
    }),
  );

  return conContador
    .filter((g): g is NonNullable<typeof g> => g !== null)
    .sort((a, b) => a.jugandoAhora - b.jugandoAhora)
    .slice(0, limit)
    .map((g) => ({ igdbId: g.igdbId, title: g.title, iconUrl: g.iconUrl, genres: g.genres, jugandoAhora: g.jugandoAhora }));
}
