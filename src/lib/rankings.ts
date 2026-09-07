import "server-only";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { games, platformAccounts, userGames, userTrophies, users } from "@/db/schema";
import { avatarUrlSql } from "@/lib/avatarSql";
import { esPlatinoEquivalente } from "@/lib/stats";
import type { Game } from "@/lib/types";

export interface ActivityRanking {
  userId: string;
  name: string | null;
  handle: string | null;
  total: number;
}

function inicioSemana(): Date {
  const hoy = new Date();
  const dia = hoy.getUTCDay();
  const distancia = dia === 0 ? 6 : dia - 1;
  return new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate() - distancia));
}

function inicioMes(): Date {
  const hoy = new Date();
  return new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), 1));
}

async function rankingDesde(userIds: string[], desde: Date): Promise<ActivityRanking[]> {
  if (userIds.length === 0) return [];
  const rows = await db
    .select({ userId: userTrophies.userId, name: users.name, handle: users.handle, total: sql<number>`count(*)` })
    .from(userTrophies)
    .innerJoin(users, eq(users.id, userTrophies.userId))
    .where(and(inArray(userTrophies.userId, userIds), eq(userTrophies.earned, true), gte(userTrophies.earnedAt, desde)))
    .groupBy(userTrophies.userId, users.name, users.handle)
    .orderBy(desc(sql`count(*)`));
  return rows.map((row) => ({ ...row, total: Number(row.total) }));
}

export async function getPeriodRankings(userIds: string[]) {
  const [semanal, mensual] = await Promise.all([rankingDesde(userIds, inicioSemana()), rankingDesde(userIds, inicioMes())]);
  return { semanal, mensual };
}

/* --------------------- Clasificacion de ti y tus amigos -------------------- */

export interface FilaClasificacion {
  userId: string;
  name: string | null;
  handle: string | null;
  avatarUrl: string | null;
  /** Nivel de trofeos de PSN, si tiene esa cuenta vinculada. */
  trophyLevel: number | null;
  platinos: number;
  trofeos: number;
  juegos: number;
  completadoMedio: number;
}

/**
 * Las cifras de la clasificacion de `/amigos`, para TODOS los participantes
 * en dos consultas — no una tanda por persona.
 *
 * Antes esa pagina llamaba, por cada participante, a `getProfileByUserId` +
 * `getLibrary` + `getParagonLevel`: con 5 personas eran del orden de 25-30
 * consultas, varias de ellas pesadas (la biblioteca entera de cada uno), y
 * todas lanzadas a la vez con `Promise.all` contra un pool de 5 conexiones.
 * Era, con diferencia, la pagina con mas papeletas de atascar el pool.
 *
 * El recuento de platinos NO se reimplementa en SQL a proposito: se traen
 * los campos minimos y se decide con `esPlatinoEquivalente` (lib/stats.ts),
 * la MISMA funcion que usa el resto de la app. Un 100% de Steam cuenta como
 * platino, y esa regla ya ha divergido entre sitios en el pasado — ver el
 * historial en HANDOFF.md.
 */
export async function clasificacionAmigos(userIds: string[]): Promise<FilaClasificacion[]> {
  if (userIds.length === 0) return [];

  const [identidades, filas] = await Promise.all([
    db
      .select({
        userId: users.id,
        name: users.name,
        handle: users.handle,
        avatarUrl: avatarUrlSql(users.id, users.image, users.avatarPersonalizado),
        trophyLevel: sql<number | null>`(
          select ${platformAccounts.level} from ${platformAccounts}
          where ${platformAccounts.userId} = ${users.id} and ${platformAccounts.platform} = 'psn'
          limit 1
        )`,
        cuentas: sql<number>`(
          select count(*)::int from ${platformAccounts}
          where ${platformAccounts.userId} = ${users.id}
        )`,
      })
      .from(users)
      .where(inArray(users.id, userIds)),
    db
      .select({
        userId: userGames.userId,
        platform: games.platform,
        earned: userGames.earned,
        earnedTotal: userGames.earnedTotal,
        progressPercent: userGames.progressPercent,
        isWishlist: userGames.isWishlist,
      })
      .from(userGames)
      .innerJoin(games, eq(games.id, userGames.gameId))
      .where(inArray(userGames.userId, userIds)),
  ]);

  const porUsuario = new Map<string, FilaClasificacion & { sumaProgreso: number; empezados: number }>();
  for (const id of identidades) {
    // Sin ninguna cuenta vinculada no hay nada que clasificar: quien acaba
    // de registrarse saldria con todo a cero, ensuciando la tabla.
    if (Number(id.cuentas) === 0) continue;

    porUsuario.set(id.userId, {
      userId: id.userId,
      name: id.name,
      handle: id.handle,
      avatarUrl: id.avatarUrl,
      trophyLevel: id.trophyLevel,
      platinos: 0,
      trofeos: 0,
      juegos: 0,
      completadoMedio: 0,
      sumaProgreso: 0,
      empezados: 0,
    });
  }

  for (const fila of filas) {
    const acc = porUsuario.get(fila.userId);
    if (!acc || fila.isWishlist) continue;

    acc.juegos += 1;
    acc.trofeos += fila.earnedTotal;
    if (fila.progressPercent > 0) {
      acc.empezados += 1;
      acc.sumaProgreso += fila.progressPercent;
    }
    if (
      esPlatinoEquivalente({
        earned: (fila.earned as Game["earned"]) ?? undefined,
        platform: fila.platform,
        progressPercent: fila.progressPercent,
      })
    ) {
      acc.platinos += 1;
    }
  }

  return [...porUsuario.values()].map(({ sumaProgreso, empezados, ...fila }) => ({
    ...fila,
    completadoMedio: empezados === 0 ? 0 : Math.round(sumaProgreso / empezados),
  }));
}
