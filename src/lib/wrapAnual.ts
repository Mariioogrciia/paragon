import "server-only";
import { cache } from "react";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { games, gameTrophies, userTrophies } from "@/db/schema";

/**
 * Los datos del Wrap del año (21 oct 2026). Antes el Wrap solo tenía tres
 * cifras sueltas (trofeos del año, género, juego con más horas) y las
 * pintaba sobre un degradado de color: "fotos con color de fondo y letras".
 * Esto saca lo que hace falta para contar el año de verdad: el mes a mes,
 * el reparto por metales, el top de juegos con su carátula, los platinos
 * del año, el trofeo más raro y los géneros.
 *
 * Todo sale de `user_trophy.earnedAt` del año natural en curso (la misma
 * base que `resumenHistorico`): un trofeo sin fecha no entra en ningún
 * año. Una consulta por pieza, todas en paralelo y pequeñas (agrupadas en
 * SQL, nada de traer los trofeos a memoria).
 */

export interface JuegoDelAnio {
  gameId: string;
  titulo: string;
  iconUrl: string | null;
  trofeos: number;
}

export interface PlatinoDelAnio {
  gameId: string;
  titulo: string;
  iconUrl: string | null;
  fecha: string;
}

export interface WrapAnual {
  anio: number;
  /** 12 meses (enero → diciembre), con los vacíos a cero. */
  porMes: { mes: number; total: number }[];
  /** Por metal; "otros" son los logros de Steam/Xbox, que no tienen metal. */
  porMetal: { platinum: number; gold: number; silver: number; bronze: number; otros: number };
  topJuegos: JuegoDelAnio[];
  platinos: PlatinoDelAnio[];
  masRaro: { nombre: string; iconUrl: string | null; juego: string; rareza: number; grado: "platinum" | "gold" | "silver" | "bronze" | null } | null;
  generos: { nombre: string; juegos: number }[];
}

const DEL_ANIO = sql`date_part('year', ${userTrophies.earnedAt}) = date_part('year', now())`;

export const wrapAnual = cache(async (userId: string): Promise<WrapAnual> => {
  const ganadosEsteAnio = and(eq(userTrophies.userId, userId), eq(userTrophies.earned, true), isNotNull(userTrophies.earnedAt), DEL_ANIO);
  const conMetal = and(eq(gameTrophies.gameId, userTrophies.gameId), eq(gameTrophies.trophyId, userTrophies.trophyId));

  const [meses, metales, top, platinos, [raro], generos] = await Promise.all([
    db
      .select({ mes: sql<number>`date_part('month', ${userTrophies.earnedAt})::int`, total: sql<number>`count(*)::int` })
      .from(userTrophies)
      .where(ganadosEsteAnio)
      .groupBy(sql`1`),
    db
      .select({ grado: gameTrophies.grade, total: sql<number>`count(*)::int` })
      .from(userTrophies)
      .leftJoin(gameTrophies, conMetal)
      .where(ganadosEsteAnio)
      .groupBy(gameTrophies.grade),
    db
      .select({ gameId: userTrophies.gameId, titulo: games.title, iconUrl: games.iconUrl, trofeos: sql<number>`count(*)::int` })
      .from(userTrophies)
      .innerJoin(games, eq(games.id, userTrophies.gameId))
      .where(ganadosEsteAnio)
      .groupBy(userTrophies.gameId, games.title, games.iconUrl)
      .orderBy(sql`count(*) desc`, games.title)
      .limit(5),
    db
      .select({ gameId: userTrophies.gameId, titulo: games.title, iconUrl: games.iconUrl, fecha: sql<string>`min(${userTrophies.earnedAt})::text` })
      .from(userTrophies)
      .innerJoin(gameTrophies, conMetal)
      .innerJoin(games, eq(games.id, userTrophies.gameId))
      .where(and(ganadosEsteAnio, eq(gameTrophies.grade, "platinum")))
      .groupBy(userTrophies.gameId, games.title, games.iconUrl)
      .orderBy(sql`min(${userTrophies.earnedAt})`),
    db
      .select({ nombre: gameTrophies.name, iconUrl: gameTrophies.iconUrl, juego: games.title, rareza: userTrophies.rarityPercent, grado: gameTrophies.grade })
      .from(userTrophies)
      .innerJoin(gameTrophies, conMetal)
      .innerJoin(games, eq(games.id, userTrophies.gameId))
      .where(and(ganadosEsteAnio, isNotNull(userTrophies.rarityPercent), sql`${userTrophies.rarityPercent} > 0`))
      .orderBy(userTrophies.rarityPercent)
      .limit(1),
    // Géneros de los juegos con algún trofeo este año (cada juego cuenta una vez por género).
    db.execute<{ nombre: string; juegos: number }>(sql`
      select genero as nombre, count(*)::int as juegos
      from (
        select distinct ${userTrophies.gameId} as game_id
        from ${userTrophies}
        where ${ganadosEsteAnio}
      ) j
      join ${games} g on g.id = j.game_id
      cross join lateral jsonb_array_elements_text(coalesce(g."genres", '[]'::jsonb)) as genero
      group by genero
      order by juegos desc, genero
      limit 3
    `),
  ]);

  const porMetal = { platinum: 0, gold: 0, silver: 0, bronze: 0, otros: 0 };
  for (const m of metales) {
    const clave = m.grado === "platinum" || m.grado === "gold" || m.grado === "silver" || m.grado === "bronze" ? m.grado : "otros";
    porMetal[clave] += Number(m.total);
  }

  return {
    anio: new Date().getFullYear(),
    porMes: Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, total: Number(meses.find((m) => Number(m.mes) === i + 1)?.total ?? 0) })),
    porMetal,
    topJuegos: top.map((j) => ({ ...j, trofeos: Number(j.trofeos) })),
    platinos,
    masRaro: raro?.nombre
      ? {
          nombre: raro.nombre,
          iconUrl: raro.iconUrl,
          juego: raro.juego,
          rareza: Number(raro.rareza),
          grado: raro.grado === "platinum" || raro.grado === "gold" || raro.grado === "silver" || raro.grado === "bronze" ? raro.grado : null,
        }
      : null,
    generos: [...generos].map((g) => ({ nombre: g.nombre, juegos: Number(g.juegos) })),
  };
});
