import "server-only";
import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { games, gameTrophies, users, userTrophies } from "@/db/schema";
import { avatarUrlSql } from "@/lib/avatarSql";
import type { EventoMes } from "@/lib/eventos";

export interface ParticipanteEvento {
  userId: string;
  handle: string | null;
  name: string | null;
  image: string | null;
  puntos: number;
  trofeos: number;
  platinos: number;
}

/** Clasificación del evento del mes (lib/eventos.ts): trofeos de ese mes en juegos de su género. */
export async function clasificacionEvento(evento: EventoMes, limite = 25): Promise<ParticipanteEvento[]> {
  const puntos = sql<number>`sum(case ${gameTrophies.grade} when 'platinum' then 100 when 'gold' then 50 when 'silver' then 25 else 10 end)`;
  const generos = sql`array[${sql.join(evento.generos.map((g) => sql`${g}`), sql`, `)}]::text[]`;
  const filas = await db
    .select({
      userId: users.id,
      handle: users.handle,
      name: users.name,
      image: avatarUrlSql(users.id, users.image, users.avatarPersonalizado),
      puntos,
      trofeos: sql<number>`count(*)`,
      platinos: sql<number>`count(*) filter (where ${gameTrophies.grade} = 'platinum')`,
    })
    .from(userTrophies)
    .innerJoin(users, eq(users.id, userTrophies.userId))
    .innerJoin(games, eq(games.id, userTrophies.gameId))
    .leftJoin(gameTrophies, and(eq(gameTrophies.gameId, userTrophies.gameId), eq(gameTrophies.trophyId, userTrophies.trophyId)))
    .where(
      and(
        eq(userTrophies.earned, true),
        gte(userTrophies.earnedAt, evento.inicio),
        lt(userTrophies.earnedAt, evento.fin),
        sql`${games.genres} ?| ${generos}`,
        // Epic es progreso declarado: no puntúa en nada competitivo.
        sql`${games.platform} <> 'epic'`,
      ),
    )
    .groupBy(users.id)
    .orderBy(desc(puntos))
    .limit(limite);
  return filas.map((f) => ({ ...f, puntos: Number(f.puntos ?? 0), trofeos: Number(f.trofeos), platinos: Number(f.platinos) }));
}
