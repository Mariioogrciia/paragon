import "server-only";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { userTrophies, users } from "@/db/schema";

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
