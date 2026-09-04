import "server-only";
import { unstable_cache } from "next/cache";
import { and, desc, eq, gte, isNotNull, notInArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { games as gamesTable, userGames } from "@/db/schema";
import { getLibrary, getProfileByUserId } from "@/lib/profiles";
import { libraryFacets } from "@/lib/stats";

/**
 * Datos para la página /descubrir que no son "recomendado según tu
 * biblioteca" (eso ya vive en recommendations.ts) — aquí lo que sale es
 * igual para todo el mundo: tendencias, joyas ocultas y tiras por género.
 *
 * Todo se agrupa por `igdbId`, no por `games.id`: el mismo juego en PSN y en
 * Steam son dos filas en `games`, y para "cuánta gente lo tiene" o "qué nota
 * media saca" contarlas por separado partiría el número en dos sin motivo.
 * Mismo criterio que ya usa `getGameRecommendations`.
 */

export interface DiscoverGame {
  igdbId: number;
  title: string;
  iconUrl?: string;
  genres: string[];
}

function parseGenres(raw: string | null): string[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw) ?? [];
  } catch {
    return [];
  }
}

/**
 * Juegos que más gente ha añadido a su biblioteca o a deseados en los
 * últimos `dias` — la sensación de "esto está vivo ahora mismo".
 *
 * Depende de `userGames.createdAt` (migrada en
 * scripts/anadir-createdat-user-game.mts): las filas de antes de esa
 * migración quedaron todas con la misma fecha, así que esto no dirá nada
 * útil hasta que pase un tiempo de uso real — es preferible a inventar una
 * fecha de alta que no se puede saber.
 */
/**
 * Igual para todo el mundo, no personal de nadie — se cachea 5 minutos
 * (`unstable_cache`, la capa de caché de datos de Next, no un `fetch`
 * externo) para no repetir un `GROUP BY` sobre `user_game` en cada visita
 * de cada visitante a /descubrir. Antes se recalculaba entero en cada
 * carga; con pocos usuarios no se notaba, pero es coste real de Postgres
 * que crece con las visitas, no con los datos.
 */
export const getTrendingGames = unstable_cache(
  async (limit = 12, dias = 30): Promise<(DiscoverGame & { recientes: number })[]> => {
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
    .where(and(isNotNull(gamesTable.igdbId), gte(userGames.createdAt, desde)))
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
  },
  ["trending-games"],
  { revalidate: 300 },
);

/**
 * Nota media alta (>= 4.5, con al menos 2 votos para que no sea un solo
 * cinco estrellas de casualidad) y poca gente lo tiene todavía (<= 20
 * propietarios). El umbral de propietarios es generoso a propósito: con los
 * 5 usuarios reales que hay ahora mismo en la base, un límite más estricto
 * dejaría esto vacío siempre — se puede apretar más adelante cuando haya
 * más gente.
 */
export const getHiddenGems = unstable_cache(
  async (limit = 12): Promise<(DiscoverGame & { notaMedia: number; votos: number; propietarios: number })[]> => {
  const rows = await db
    .select({
      igdbId: gamesTable.igdbId,
      title: sql<string>`MAX(${gamesTable.title})`,
      iconUrl: sql<string>`MAX(${gamesTable.iconUrl})`,
      genres: sql<string>`MAX(CAST(${gamesTable.genres} AS text))`,
      notaMedia: sql<number>`AVG(${userGames.rating})`,
      votos: sql<number>`COUNT(${userGames.rating})`,
      propietarios: sql<number>`COUNT(DISTINCT ${userGames.userId})`,
    })
    .from(userGames)
    .innerJoin(gamesTable, eq(gamesTable.id, userGames.gameId))
    .where(and(isNotNull(gamesTable.igdbId), isNotNull(userGames.rating), eq(userGames.isWishlist, false)))
    .groupBy(gamesTable.igdbId)
    .having(
      sql`AVG(${userGames.rating}) >= 4.5 AND COUNT(${userGames.rating}) >= 2 AND COUNT(DISTINCT ${userGames.userId}) <= 20`,
    )
    .orderBy(desc(sql`AVG(${userGames.rating})`))
    .limit(limit);

  return rows
    .filter((r): r is typeof r & { igdbId: number } => r.igdbId != null)
    .map((r) => ({
      igdbId: r.igdbId,
      title: r.title,
      iconUrl: r.iconUrl ?? undefined,
      genres: parseGenres(r.genres),
      notaMedia: Number(Number(r.notaMedia).toFixed(1)),
      votos: Number(r.votos),
      propietarios: Number(r.propietarios),
    }));
  },
  ["hidden-gems"],
  { revalidate: 300 },
);

export interface GenreStrip {
  genero: string;
  juegos: DiscoverGame[];
}

/**
 * "Porque te gustan los X": una tira por cada uno de tus géneros más
 * jugados, con lo más popular de ese género que todavía no tienes. Mismo
 * cálculo de popularidad que `getGameRecommendations` (lib/recommendations.ts,
 * que da una lista mezclada); aquí se reparte en tiras por género en vez de
 * interleaving, para la sección "Explorar por género" de Descubrir.
 */
export async function getRecommendationsByGenre(
  userId: string,
  numGeneros = 3,
  porGenero = 10,
): Promise<GenreStrip[]> {
  const profile = await getProfileByUserId(userId);
  if (!profile) return [];

  const { games: userGamesList } = await getLibrary(profile);

  const ownedIgdbIds = new Set<number>();
  for (const g of userGamesList) if (g.igdbId) ownedIgdbIds.add(g.igdbId);

  const facets = libraryFacets(userGamesList);
  const topGenres = facets.genres.slice(0, numGeneros).map((g) => g.value);
  if (topGenres.length === 0) return [];

  const excludeIgdbIds = ownedIgdbIds.size > 0 ? Array.from(ownedIgdbIds) : [-1];

  const rows = await db
    .select({
      igdbId: gamesTable.igdbId,
      title: sql<string>`MAX(${gamesTable.title})`,
      iconUrl: sql<string>`MAX(${gamesTable.iconUrl})`,
      genres: sql<string>`MAX(CAST(${gamesTable.genres} AS text))`,
      owners: sql<number>`COUNT(DISTINCT ${userGames.userId})`,
    })
    .from(gamesTable)
    .innerJoin(userGames, eq(userGames.gameId, gamesTable.id))
    .where(and(isNotNull(gamesTable.igdbId), notInArray(gamesTable.igdbId, excludeIgdbIds)))
    .groupBy(gamesTable.igdbId)
    .having(sql`COUNT(DISTINCT ${userGames.userId}) > 0`)
    .orderBy(desc(sql`COUNT(DISTINCT ${userGames.userId})`));

  const candidatos = rows
    .filter((r): r is typeof r & { igdbId: number } => r.igdbId != null)
    .map((r) => ({
      igdbId: r.igdbId,
      title: r.title,
      iconUrl: r.iconUrl ?? undefined,
      genres: parseGenres(r.genres),
    }));

  return topGenres
    .map((genero) => ({
      genero,
      juegos: candidatos.filter((g) => g.genres.includes(genero)).slice(0, porGenero),
    }))
    .filter((tira) => tira.juegos.length > 0);
}
