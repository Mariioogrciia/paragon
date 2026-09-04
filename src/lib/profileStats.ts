import "server-only";
import { and, desc, eq, gte, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { games as gamesTable, userGames, userTrophies } from "@/db/schema";

/**
 * Datos para /u/[handle]/estadisticas.
 *
 * Ojo con lo que es real y lo que no: PSN y Steam dan un TOTAL acumulado de
 * minutos jugados por juego (`userGames.playtimeMinutes`) y, como mucho, la
 * última vez que se jugó (`lastPlayedAt`) — ninguna de las dos APIs da un
 * registro de sesiones ni de horas por día. Así que "tiempo de juego en el
 * tiempo" no es un dato que exista: lo que SÍ es real, día a día, es cuándo
 * se ganó cada trofeo (`userTrophies.earnedAt`, lo mismo que ya usa
 * `/ritmo`). El mapa de actividad y "días jugados" salen de ahí — son un
 * proxy honesto ("días con trofeos ganados"), no un registro exhaustivo de
 * cada día que se encendió el mando.
 */

export interface DiaActividad {
  /** "YYYY-MM-DD" */
  dia: string;
  trofeos: number;
}

/** Un valor por cada día de la ventana, con los días a cero incluidos — igual que `desgloseDelMes`, pero para todo un año en vez de un mes. */
export async function actividadPorDia(userId: string, dias = 365): Promise<DiaActividad[]> {
  const desde = new Date();
  desde.setUTCDate(desde.getUTCDate() - dias + 1);
  desde.setUTCHours(0, 0, 0, 0);

  const rows = await db
    .select({
      dia: sql<string>`to_char(date(${userTrophies.earnedAt}), 'YYYY-MM-DD')`,
      total: sql<number>`count(*)`,
    })
    .from(userTrophies)
    .where(and(eq(userTrophies.userId, userId), eq(userTrophies.earned, true), gte(userTrophies.earnedAt, desde)))
    .groupBy(sql`date(${userTrophies.earnedAt})`);

  const conteo = new Map(rows.map((r) => [r.dia, Number(r.total)]));

  const resultado: DiaActividad[] = [];
  const cursor = new Date(desde);
  const hoy = new Date();
  hoy.setUTCHours(0, 0, 0, 0);
  while (cursor <= hoy) {
    const clave = cursor.toISOString().slice(0, 10);
    resultado.push({ dia: clave, trofeos: conteo.get(clave) ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return resultado;
}

/**
 * Horas totales por juego, de más a menos — no es "en el tiempo" (ver el
 * comentario de arriba), es un ranking estático de dónde se han ido las
 * horas. Excluye deseados, mismo criterio que el resto de estadísticas de
 * la app.
 */
export async function horasPorJuego(userId: string, limit = 8): Promise<{ gameId: string; titulo: string; iconUrl: string | null; horas: number }[]> {
  const rows = await db
    .select({
      gameId: userGames.gameId,
      titulo: gamesTable.title,
      iconUrl: gamesTable.iconUrl,
      minutos: userGames.playtimeMinutes,
    })
    .from(userGames)
    .innerJoin(gamesTable, eq(gamesTable.id, userGames.gameId))
    .where(and(eq(userGames.userId, userId), eq(userGames.isWishlist, false), isNotNull(userGames.playtimeMinutes)))
    .orderBy(desc(userGames.playtimeMinutes))
    .limit(limit);

  return rows.map((r) => ({
    gameId: r.gameId,
    titulo: r.titulo,
    iconUrl: r.iconUrl,
    horas: Math.round((r.minutos ?? 0) / 60),
  }));
}
