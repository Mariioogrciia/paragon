import "server-only";
import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { gameTrophies, seasonResults, userTrophies, users } from "@/db/schema";
import { avatarUrlSql } from "@/lib/avatarSql";
import { avisarUsuario } from "@/lib/avisos";
import { medallaDe, nivelDe, temporadaAnterior, type Temporada } from "@/lib/temporada";

/**
 * Datos del Pase de Temporada (reglas en lib/temporada.ts). Los puntos se
 * calculan al vuelo con los trofeos de la ventana; al empezar una temporada
 * nueva, el cron guarda el resultado final de la anterior en
 * `season_result` (para el historial de medallas) y avisa a cada uno.
 */

const LANZAMIENTO_PASE = new Date("2026-09-29T00:00:00Z");

const puntosSql = sql<number>`coalesce(sum(
  case
    when ${gameTrophies.grade} = 'platinum' then 100
    when ${gameTrophies.grade} = 'gold' then 50
    when ${gameTrophies.grade} = 'silver' then 25
    else 10
  end
), 0)`;

export interface FilaTemporada {
  userId: string;
  handle: string | null;
  name: string | null;
  image: string | null;
  puntos: number;
  nivel: number;
}

/** Ranking completo de una temporada (solo quien ha sumado algo). */
export async function rankingTemporada(t: Temporada): Promise<FilaTemporada[]> {
  const filas = await db
    .select({
      userId: userTrophies.userId,
      handle: users.handle,
      name: users.name,
      image: avatarUrlSql(users.id, users.image, users.avatarPersonalizado),
      puntos: puntosSql,
    })
    .from(userTrophies)
    .innerJoin(gameTrophies, and(eq(gameTrophies.gameId, userTrophies.gameId), eq(gameTrophies.trophyId, userTrophies.trophyId)))
    .innerJoin(users, eq(users.id, userTrophies.userId))
    .where(and(eq(userTrophies.earned, true), gte(userTrophies.earnedAt, t.inicio), lt(userTrophies.earnedAt, t.fin)))
    .groupBy(userTrophies.userId, users.handle, users.name, users.id, users.image, users.avatarPersonalizado)
    .orderBy(desc(puntosSql));
  return filas.map((f) => ({ ...f, puntos: Number(f.puntos), nivel: nivelDe(Number(f.puntos)) }));
}

export async function historialTemporadas(userId: string) {
  return db
    .select({ temporada: seasonResults.temporada, puntos: seasonResults.puntos, nivel: seasonResults.nivel })
    .from(seasonResults)
    .where(eq(seasonResults.userId, userId))
    .orderBy(desc(seasonResults.temporada))
    .limit(12);
}

/**
 * Cron: si la temporada anterior aún no está cerrada, guarda el resultado
 * de todos los que puntuaron y les avisa de su medalla. Idempotente: una
 * vez hay filas de esa temporada, no vuelve a hacer nada.
 */
export async function cerrarTemporadaAnteriorSiToca(ahora = new Date()): Promise<number> {
  const anterior = temporadaAnterior(ahora);
  // Solo temporadas que terminan con el pase ya en marcha: sin esto, el
  // primer cron "cerraría" la T2 de 2026 y avisaría a todo el mundo de una
  // temporada que nunca existió. La primera de verdad es la T3 (cierra el
  // 1 de octubre de 2026).
  if (anterior.fin < LANZAMIENTO_PASE) return 0;
  const [ya] = await db.select({ userId: seasonResults.userId }).from(seasonResults).where(eq(seasonResults.temporada, anterior.clave)).limit(1);
  if (ya) return 0;

  const ranking = await rankingTemporada(anterior);
  if (ranking.length === 0) return 0;

  const insertadas = await db
    .insert(seasonResults)
    .values(ranking.map((r) => ({ userId: r.userId, temporada: anterior.clave, puntos: r.puntos, nivel: r.nivel })))
    .onConflictDoNothing()
    .returning({ userId: seasonResults.userId });
  // Solo avisa quien de verdad insertó (si dos pasadas coinciden, una sola).
  const nuevos = new Set(insertadas.map((i) => i.userId));

  const nombre = `T${anterior.trimestre} ${anterior.anio}`;
  await Promise.all(
    ranking
      .filter((r) => nuevos.has(r.userId))
      .map((r, i) => {
        const medalla = medallaDe(r.nivel);
        return avisarUsuario(r.userId, {
          titulo: medalla ? `${medalla.emoji} Temporada ${nombre} cerrada: nivel ${r.nivel}` : `Temporada ${nombre} cerrada`,
          texto: `${r.puntos} puntos · ${i + 1}º de ${ranking.length}. Empieza una temporada nueva, desde cero.`,
          ruta: "/temporada",
        }, "ligas");
      }),
  );
  return insertadas.length;
}

/** Tus puntos en una temporada, sin calcular el ranking de todos. */
export async function puntosUsuarioTemporada(userId: string, t: Temporada): Promise<number> {
  const [fila] = await db
    .select({ puntos: puntosSql })
    .from(userTrophies)
    .innerJoin(gameTrophies, and(eq(gameTrophies.gameId, userTrophies.gameId), eq(gameTrophies.trophyId, userTrophies.trophyId)))
    .where(and(eq(userTrophies.userId, userId), eq(userTrophies.earned, true), gte(userTrophies.earnedAt, t.inicio), lt(userTrophies.earnedAt, t.fin)));
  return Number(fila?.puntos ?? 0);
}
