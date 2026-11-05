import "server-only";
import { unstable_cache } from "next/cache";
import { and, desc, eq, gte, isNotNull, lte, sql } from "drizzle-orm";
import { avatarUrlSql } from "@/lib/avatarSql";
import { db } from "@/db";
import { gameTrophies, games as gamesTable, userGames, userTrophies, users } from "@/db/schema";
import { noDeclaradoPorId } from "@/lib/declaradoSql";

/**
 * Lo que enseña la portada de toda la comunidad: cifras globales, trofeos
 * más raros de la semana, platinos recientes y mejores cazadores (sacado de
 * lib/profiles.ts el 5 nov 2026). profiles.ts lo reexporta.
 */
/**
 * Suma sobre TODA la tabla `user_game`, igual para cualquiera que la mire
 * (la portada de marketing, sin sesión) — se cachea 5 minutos para no
 * recalcularla en cada visita anónima a "/". Antes se recalculaba entera
 * cada vez; con pocos usuarios no se notaba, pero crece con las visitas,
 * no con los datos.
 */
export const getGlobalStats = unstable_cache(
  async () => {
  const result = await db
    .select({
      totalGames: sql<number>`count(distinct ${userGames.gameId})`,
      totalTrophies: sql<number>`sum(${userGames.earnedTotal})`,
      avgCompletion: sql<number>`avg(nullif(${userGames.progressPercent}, 0))`,
      totalPlatinums: sql<number>`
        coalesce(sum(CAST(${userGames.earned}->>'platinum' AS INTEGER)), 0)
        + count(*) filter (
          where ${gamesTable.platform} = 'steam' and ${userGames.progressPercent} = 100
        )
      `,
    })
    .from(userGames)
    .innerJoin(gamesTable, eq(gamesTable.id, userGames.gameId))
    // Progreso declarado (Epic) no cuenta en cifras públicas: lib/declarado.ts.
    .where(and(eq(userGames.isWishlist, false), ...noDeclaradoPorId(userGames.gameId)));

  const row = result[0];
  return {
    platinos: Number(row?.totalPlatinums ?? 0),
    juegos: Number(row?.totalGames ?? 0),
    trofeos: Number(row?.totalTrophies ?? 0),
    completadoMedio: Math.round(Number(row?.avgCompletion ?? 0)),
  };
  },
  ["global-stats"],
  { revalidate: 300 },
);

export interface RareTrophy {
  userId: string;
  handle: string | null;
  name: string | null;
  image: string | null;
  trophyName: string;
  trophyIconUrl: string | null;
  grade: "bronze" | "silver" | "gold" | "platinum" | null;
  gameId: string;
  gameTitle: string;
  rarityPercent: number;
  earnedAt: Date;
}

/**
 * Los trofeos más raros que se han conseguido de verdad en la plataforma
 * esta última semana — para el bloque "élite" de la landing. Nunca trofeos
 * `hidden` (spoiler del propio juego) ni sin `rarityPercent` (Xbox no lo da).
 */
export const getRarestTrophiesThisWeek = unstable_cache(
  async (limit: number): Promise<RareTrophy[]> => {
    const desde = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const rows = await db
      .select({
        userId: users.id,
        handle: users.handle,
        name: users.name,
        image: avatarUrlSql(users.id, users.image, users.avatarPersonalizado),
        trophyName: gameTrophies.name,
        trophyIconUrl: gameTrophies.iconUrl,
        grade: gameTrophies.grade,
        gameId: gamesTable.id,
        gameTitle: gamesTable.title,
        rarityPercent: userTrophies.rarityPercent,
        earnedAt: userTrophies.earnedAt,
      })
      .from(userTrophies)
      .innerJoin(users, eq(users.id, userTrophies.userId))
      .innerJoin(gamesTable, eq(gamesTable.id, userTrophies.gameId))
      .innerJoin(
        gameTrophies,
        and(eq(gameTrophies.gameId, userTrophies.gameId), eq(gameTrophies.trophyId, userTrophies.trophyId)),
      )
      .where(
        and(
          eq(userTrophies.earned, true),
          eq(gameTrophies.hidden, false),
          // Progreso declarado (Epic) no entra en la vitrina pública: lib/declarado.ts.
          ...noDeclaradoPorId(userTrophies.gameId),
          isNotNull(users.handle),
          isNotNull(userTrophies.rarityPercent),
          isNotNull(userTrophies.earnedAt),
          gte(userTrophies.earnedAt, desde),
          // Es la vitrina de los raros: un 80 % no lo es, aunque sea lo más raro de la semana.
          lte(userTrophies.rarityPercent, 15),
        ),
      )
      .orderBy(sql`${userTrophies.rarityPercent} asc`)
      .limit(limit * 10);

    // Variedad: como mucho uno por juego y dos por cazador. Sin esto, una
    // sola partida a Hollow Knight de una sola persona llenaba la vitrina
    // entera y la "prueba de comunidad" era la semana de un usuario.
    const porJuego = new Set<string>();
    const porCazador = new Map<string, number>();
    const elegidos: typeof rows = [];
    for (const r of rows) {
      if (elegidos.length >= limit) break;
      if (porJuego.has(r.gameId) || (porCazador.get(r.userId) ?? 0) >= 2) continue;
      porJuego.add(r.gameId);
      porCazador.set(r.userId, (porCazador.get(r.userId) ?? 0) + 1);
      elegidos.push(r);
    }
    return elegidos.map((r) => ({ ...r, rarityPercent: Number(r.rarityPercent ?? 0), earnedAt: r.earnedAt! }));
  },
  ["rarest-trophies-week-v2"],
  { revalidate: 300 },
);

export interface RecentPlatinum {
  userId: string;
  handle: string | null;
  name: string | null;
  gameTitle: string;
  /** `Date` en tiempo de ejecución de la query, pero llega serializado a string tras pasar por `unstable_cache`. */
  createdAt: Date | string;
}

/**
 * Los últimos trofeos de platino conseguidos en toda la plataforma (de
 * cualquier usuario, no solo amigos) — para el ticker "en directo" de la
 * landing. Va directo a `userTrophies` (grado platino, ya conseguido) en
 * vez de a `activities`: ese tipo "platinum" está en el esquema pero nada
 * lo inserta todavía, así que siempre saldría vacío.
 */
export const getRecentPlatinumActivity = unstable_cache(
  async (limit: number): Promise<RecentPlatinum[]> => {
    const rows = await db
      .select({
        userId: users.id,
        handle: users.handle,
        name: users.name,
        gameTitle: gamesTable.title,
        createdAt: userTrophies.earnedAt,
      })
      .from(userTrophies)
      .innerJoin(users, eq(users.id, userTrophies.userId))
      .innerJoin(gamesTable, eq(gamesTable.id, userTrophies.gameId))
      .innerJoin(
        gameTrophies,
        and(eq(gameTrophies.gameId, userTrophies.gameId), eq(gameTrophies.trophyId, userTrophies.trophyId)),
      )
      .where(
        and(
          eq(userTrophies.earned, true),
          eq(gameTrophies.grade, "platinum"),
          ...noDeclaradoPorId(userTrophies.gameId),
          isNotNull(users.handle),
          isNotNull(userTrophies.earnedAt),
          // Es una cinta "en directo": un platino de hace ocho meses no lo es.
          gte(userTrophies.earnedAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
        ),
      )
      .orderBy(desc(userTrophies.earnedAt))
      .limit(limit);

    return rows.map((r) => ({ ...r, createdAt: r.createdAt! }));
  },
  ["recent-platinum-activity"],
  { revalidate: 600 },
);

export interface TopHunter {
  userId: string;
  handle: string | null;
  name: string | null;
  image: string | null;
  platinos: number;
}

/**
 * Top cazatrofeos de toda la plataforma, por platinos de siempre (no del mes,
 * a diferencia de `getLigaMensual`) — para el "Muro de la Fama" de la
 * landing. Misma cuenta de platino-equivalente que `getGlobalStats`: el
 * campo `platinum` de PSN/Xbox más el 100% de Steam, que no tiene trofeo de
 * platino propio. Requiere `handle` porque el enlace del perfil lo necesita.
 */
export const getTopHunters = unstable_cache(
  async (limit: number): Promise<TopHunter[]> => {
    const platinosSql = sql<number>`
      coalesce(sum(CAST(${userGames.earned}->>'platinum' AS INTEGER)), 0)
      + count(*) filter (
        where ${gamesTable.platform} = 'steam' and ${userGames.progressPercent} = 100
      )
    `;

    const rows = await db
      .select({
        userId: users.id,
        handle: users.handle,
        name: users.name,
        image: avatarUrlSql(users.id, users.image, users.avatarPersonalizado),
        platinos: platinosSql,
      })
      .from(userGames)
      .innerJoin(gamesTable, eq(gamesTable.id, userGames.gameId))
      .innerJoin(users, eq(users.id, userGames.userId))
      .where(and(eq(userGames.isWishlist, false), isNotNull(users.handle), ...noDeclaradoPorId(userGames.gameId)))
      .groupBy(users.id)
      .orderBy(desc(platinosSql))
      .limit(limit);

    return rows
      .map((r) => ({ ...r, platinos: Number(r.platinos ?? 0) }))
      .filter((r) => r.platinos > 0);
  },
  ["top-hunters"],
  { revalidate: 300 },
);
