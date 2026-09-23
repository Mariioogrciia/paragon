import { getDb } from "@/db";
import { users, userTrophies, gameTrophies, games } from "@/db/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { avatarUrlSql } from "@/lib/avatarSql";

/** Misma escala de puntos que `getLigaMensual` — un trofeo suelto, no un resumen. */
function puntosPorGrado(grade: string | null): number {
  if (grade === "platinum") return 100;
  if (grade === "gold") return 50;
  if (grade === "silver") return 25;
  return 10;
}

export interface LigaUser {
  userId: string;
  handle: string | null;
  name: string | null;
  image: string | null;
  points: number;
}

export async function getLigaMensual(mesObjetivo?: Date): Promise<LigaUser[]> {
  const db = getDb();
  const targetDate = mesObjetivo || new Date();
  
  // Principio de este mes
  const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
  // Fin de este mes (técnicamente, principio del siguiente)
  const startOfNextMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 1);

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
      image: avatarUrlSql(users.id, users.image, users.avatarPersonalizado),
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

export interface LigaTrofeoDesglose {
  gameTitle: string | null;
  gameIconUrl: string | null;
  trophyName: string;
  grade: string | null;
  points: number;
  earnedAt: Date | null;
}

/**
 * Desglose trofeo a trofeo de la puntuación de un usuario en la Liga
 * Mensual — misma ventana de fechas y misma fórmula de puntos
 * (`puntosPorGrado`) que `getLigaMensual`, para que la suma de aquí
 * cuadre siempre con el número que ya se ve en la clasificación.
 */
export async function getLigaMensualDesglose(userId: string, mesObjetivo?: Date): Promise<LigaTrofeoDesglose[]> {
  const db = getDb();
  const targetDate = mesObjetivo || new Date();

  const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
  const startOfNextMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 1);

  const rows = await db
    .select({
      gameTitle: games.title,
      gameIconUrl: games.iconUrl,
      trophyName: gameTrophies.name,
      grade: gameTrophies.grade,
      earnedAt: userTrophies.earnedAt,
    })
    .from(userTrophies)
    .innerJoin(games, eq(games.id, userTrophies.gameId))
    .innerJoin(
      gameTrophies,
      and(eq(gameTrophies.gameId, userTrophies.gameId), eq(gameTrophies.trophyId, userTrophies.trophyId)),
    )
    .where(
      and(
        eq(userTrophies.userId, userId),
        eq(userTrophies.earned, true),
        gte(userTrophies.earnedAt, startOfMonth),
        lte(userTrophies.earnedAt, startOfNextMonth),
      ),
    )
    .orderBy(desc(userTrophies.earnedAt));

  return rows.map((r) => ({ ...r, points: puntosPorGrado(r.grade) }));
}
