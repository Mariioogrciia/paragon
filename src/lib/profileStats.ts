import "server-only";
import { and, desc, eq, gte, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { games as gamesTable, userGames, userTrophies } from "@/db/schema";
import { listFriends, getLibrary, getProfileByUserId, resolveAvatarUrl } from "@/lib/profiles";
import { summarise } from "@/lib/stats";

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
 *
 * Agrupado por `igdbId`, no por `games.id`: el mismo juego en PSN y en
 * Steam son dos filas (`psn-X` / `steam-X`, arquitectura de toda la app),
 * cada una con sus propias horas — aquí interesa "cuánto le he echado a
 * este juego en total", así que se suman en una sola fila. Los manuales sin
 * `igdbId` (o cualquier fila suelta) caen cada uno en la suya, con su
 * propio `games.id` como clave.
 */
export async function horasPorJuego(userId: string, limit = 8): Promise<{ gameId: string; titulo: string; iconUrl: string | null; horas: number }[]> {
  const clave = sql<string>`coalesce(${gamesTable.igdbId}::text, ${userGames.gameId})`;

  const rows = await db
    .select({
      clave,
      titulo: sql<string>`max(${gamesTable.title})`,
      iconUrl: sql<string | null>`max(${gamesTable.iconUrl})`,
      minutos: sql<number>`sum(${userGames.playtimeMinutes})`,
    })
    .from(userGames)
    .innerJoin(gamesTable, eq(gamesTable.id, userGames.gameId))
    .where(and(eq(userGames.userId, userId), eq(userGames.isWishlist, false), isNotNull(userGames.playtimeMinutes)))
    .groupBy(clave)
    .orderBy(desc(sql`sum(${userGames.playtimeMinutes})`))
    .limit(limit);

  return rows.map((r) => ({
    gameId: r.clave,
    titulo: r.titulo,
    iconUrl: r.iconUrl,
    horas: Math.round(Number(r.minutos ?? 0) / 60),
  }));
}

/** Suma de TODAS las horas registradas (no solo el top N de `horasPorJuego`) — para "si las juntas seguidas, son X días". */
export async function horasTotales(userId: string): Promise<number> {
  const [row] = await db
    .select({ minutos: sql<number>`coalesce(sum(${userGames.playtimeMinutes}), 0)` })
    .from(userGames)
    .where(and(eq(userGames.userId, userId), eq(userGames.isWishlist, false)));

  return Math.round(Number(row?.minutos ?? 0) / 60);
}

export interface StatsAmigo {
  userId: string;
  handle: string | null;
  displayName: string | null;
  avatarUrl: string | undefined;
  horas: number;
  trofeos: number;
  platinos: number;
  juegos: number;
}

/**
 * Tú y tus amigos, con los mismos números que ya enseña cada perfil —
 * `summarise()` (lib/stats.ts) es la fuente única de verdad para
 * platinos/trofeos (incluye el 100% de Steam como platino, excluye
 * deseados), así que se reutiliza en vez de reimplementar el conteo en SQL
 * aparte, donde sería fácil que las reglas se desincronizaran de las que ya
 * usa el resto de la app. Con el puñado de amigos que tiene cualquiera
 * aquí, una consulta de biblioteca por persona es barato — no hace falta
 * optimizar a una sola query.
 */
export async function estadisticasAmigos(userId: string): Promise<StatsAmigo[]> {
  const propio = await getProfileByUserId(userId);
  if (!propio) return [];

  const amigos = await listFriends(userId);

  const personas = [
    { userId, handle: propio.handle, displayName: propio.displayName, avatarUrl: resolveAvatarUrl(propio) },
    ...amigos.map((a) => ({ userId: a.userId, handle: a.handle, displayName: a.displayName, avatarUrl: a.avatarUrl ?? undefined })),
  ];

  const conStats = await Promise.all(
    personas.map(async (persona) => {
      const profile = persona.userId === userId ? propio : await getProfileByUserId(persona.userId);
      if (!profile) return null;
      const { games } = await getLibrary(profile);
      const [resumen, horas] = await Promise.all([Promise.resolve(summarise(games)), horasTotales(persona.userId)]);
      return { ...persona, horas, trofeos: resumen.trofeos, platinos: resumen.platinos, juegos: resumen.juegos };
    }),
  );

  return conStats
    .filter((p): p is StatsAmigo => p !== null)
    .sort((a, b) => b.horas - a.horas);
}
