import { getDb } from "@/db";
import { users, userTrophies, gameTrophies } from "@/db/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";

export interface LigaUser {
  userId: string;
  handle: string | null;
  name: string | null;
  image: string | null;
  points: number;
}

export async function getLigaMensual(): Promise<LigaUser[]> {
  const db = getDb();
  const now = new Date();
  
  // Principio de este mes
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  // Fin de este mes (técnicamente, principio del siguiente)
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  // Expresión SQL para sumar puntos:
  // Platino: 100, Oro: 50, Plata: 25, Bronce: 10, Sin grado (Steam): 10
  const pointsSql = sql<number>`
    SUM(
      CASE 
        WHEN ${gameTrophies.grade} = 'platinum' THEN 100
        WHEN ${gameTrophies.grade} = 'gold' THEN 50
        WHEN ${gameTrophies.grade} = 'silver' THEN 25
        ELSE 10
      END
    )
  `;

  const rows = await db
    .select({
      userId: users.id,
      handle: users.handle,
      name: users.name,
      image: users.image,
      points: pointsSql,
    })
    .from(userTrophies)
    .innerJoin(users, eq(users.id, userTrophies.userId))
    .innerJoin(
      gameTrophies, 
      and(
        eq(gameTrophies.gameId, userTrophies.gameId),
        eq(gameTrophies.trophyId, userTrophies.trophyId)
      )
    )
    .where(
      and(
        eq(userTrophies.earned, true),
        gte(userTrophies.earnedAt, startOfMonth),
        lte(userTrophies.earnedAt, startOfNextMonth)
      )
    )
    .groupBy(users.id)
    .orderBy(desc(pointsSql))
    .limit(100);

  return rows.map(r => ({
    ...r,
    points: Number(r.points ?? 0),
  }));
}
