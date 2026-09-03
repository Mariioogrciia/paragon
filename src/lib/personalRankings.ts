import "server-only";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { games, userTrophies } from "@/db/schema";
import { gruposPorTitulo } from "@/lib/stats";
import type { Game } from "@/lib/types";

/**
 * Rankings personales para el desglose del Wrap.
 *
 * El Wrap enseña un solo dato por tarjeta ("tu género más jugado"); esto es
 * lo mismo pero la lista entera, para quien quiera saber qué hay en segundo
 * y tercer lugar. Con filtro de fecha donde el dato lo permite de verdad —
 * ver el aviso sobre horas más abajo.
 */

export type RangoFecha = "7d" | "30d" | "90d" | "anio" | "todo";

export function desdeDeRango(rango: RangoFecha): Date | null {
  const ahora = Date.now();
  const DIA = 86_400_000;
  switch (rango) {
    case "7d":
      return new Date(ahora - 7 * DIA);
    case "30d":
      return new Date(ahora - 30 * DIA);
    case "90d":
      return new Date(ahora - 90 * DIA);
    case "anio":
      return new Date(new Date().getFullYear(), 0, 1);
    case "todo":
      return null;
  }
}

export interface FilaRankingJuego {
  gameId: string;
  titulo: string;
  iconUrl?: string;
  valor: number;
}

/**
 * Ranking de horas jugadas, sumadas entre plataformas si el mismo juego
 * está en varias (Steam + PSN...), vía `gruposPorTitulo`.
 *
 * OJO: las plataformas solo dan el total acumulado de horas por juego, nunca
 * cuándo se jugaron — así que un "filtro de fecha" no puede recalcular las
 * horas de ese periodo, no existen. Lo que sí es real es filtrar QUÉ juegos
 * entran, por si alguna de sus copias se ha tocado en el periodo
 * (`lastPlayedAt`); las horas que se enseñan siguen siendo las de siempre.
 * Se avisa de esto en la pantalla en vez de fingir una precisión que no hay.
 */
export function rankingHoras(games: Game[], desde: Date | null): FilaRankingJuego[] {
  return gruposPorTitulo(games)
    .filter((grupo) => grupo.horasTotal > 0)
    .filter((grupo) => {
      if (!desde) return true;
      return grupo.copias.some((g) => g.lastPlayedAt && new Date(g.lastPlayedAt) >= desde);
    })
    .map((grupo) => ({
      gameId: grupo.principal.id,
      titulo: grupo.principal.title,
      iconUrl: grupo.principal.iconUrl,
      valor: Math.round(grupo.horasTotal),
    }));
}

/**
 * Ranking de trofeos conseguidos en el periodo, por juego.
 *
 * Este sí es fecha real: `earnedAt` se guarda por trofeo desde el principio
 * (ver lib/history.ts). Cubre solo los juegos cuyo detalle ya se ha
 * sincronizado alguna vez, igual que el resto del histórico.
 */
export async function rankingTrofeosPorJuego(
  userId: string,
  desde: Date | null,
): Promise<FilaRankingJuego[]> {
  const filas = await db
    .select({
      gameId: games.id,
      titulo: games.title,
      iconUrl: games.iconUrl,
      valor: sql<number>`count(*)`,
    })
    .from(userTrophies)
    .innerJoin(games, eq(games.id, userTrophies.gameId))
    .where(
      and(
        eq(userTrophies.userId, userId),
        eq(userTrophies.earned, true),
        desde ? gte(userTrophies.earnedAt, desde) : undefined,
      ),
    )
    .groupBy(games.id, games.title, games.iconUrl)
    .orderBy(sql`count(*) desc`);

  return filas.map((f) => ({
    gameId: f.gameId,
    titulo: f.titulo,
    iconUrl: f.iconUrl ?? undefined,
    valor: Number(f.valor),
  }));
}

export interface FilaRankingGenero {
  genero: string;
  valor: number;
}

/**
 * Ranking de géneros por trofeos conseguidos en el periodo.
 *
 * Un trofeo cuenta para cada género de su juego (un juego puede tener
 * varios). `jsonb_array_elements_text` lo despliega en una fila por género
 * sin traer los trofeos a memoria para agruparlos a mano — es un LATERAL
 * join, que el constructor de consultas de Drizzle no expresa, así que va en
 * SQL directo (con los valores parametrizados por la propia plantilla `sql`,
 * no concatenados a mano).
 */
export async function rankingGeneros(
  userId: string,
  desde: Date | null,
): Promise<FilaRankingGenero[]> {
  const filas = await db.execute<{ genero: string; valor: string | number }>(sql`
    select genero, count(*) as valor
    from ${userTrophies} ut
    join ${games} g on g.id = ut."gameId"
    cross join lateral jsonb_array_elements_text(coalesce(g.genres, '[]'::jsonb)) as genero
    where ut."userId" = ${userId}
      and ut.earned = true
      ${desde ? sql`and ut."earnedAt" >= ${desde}` : sql``}
    group by genero
    order by count(*) desc
  `);

  return [...filas].map((f) => ({ genero: f.genero, valor: Number(f.valor) }));
}
