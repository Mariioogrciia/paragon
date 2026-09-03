import "server-only";
import { and, eq, gte, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { gameTrophies, userTrophies } from "@/db/schema";

export interface WeeklyMission {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  xp: number;
}

function inicioSemana(): Date {
  const hoy = new Date();
  const dia = hoy.getUTCDay();
  const distancia = dia === 0 ? 6 : dia - 1;
  return new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate() - distancia));
}

export async function getWeeklyMissions(userId: string): Promise<WeeklyMission[]> {
  const desde = inicioSemana();
  const filas = await db
    .select({
      grade: gameTrophies.grade,
      rarity: userTrophies.rarityPercent,
      dia: sql<string>`date(${userTrophies.earnedAt})`,
    })
    .from(userTrophies)
    .leftJoin(
      gameTrophies,
      and(
        eq(gameTrophies.gameId, userTrophies.gameId),
        eq(gameTrophies.trophyId, userTrophies.trophyId),
      ),
    )
    .where(
      and(
        eq(userTrophies.userId, userId),
        eq(userTrophies.earned, true),
        isNotNull(userTrophies.earnedAt),
        gte(userTrophies.earnedAt, desde),
      ),
    );

  const trofeos = filas.length;
  const platinos = filas.filter((fila) => fila.grade === "platinum").length;
  const raros = filas.filter((fila) => fila.rarity !== null && Number(fila.rarity) <= 10).length;
  const dias = new Set(filas.map((fila) => fila.dia)).size;

  return [
    { id: "weekly-trophies", title: "Ritmo de caza", description: "Consigue 5 trofeos esta semana.", progress: trofeos, target: 5, xp: 100 },
    { id: "weekly-platinum", title: "Una joya semanal", description: "Consigue 1 platino esta semana.", progress: platinos, target: 1, xp: 250 },
    { id: "weekly-rare", title: "Cazador de rarezas", description: "Consigue 2 trofeos con 10% de rareza o menos.", progress: raros, target: 2, xp: 150 },
    { id: "weekly-days", title: "Constancia", description: "Juega y consigue logros en 3 días distintos.", progress: dias, target: 3, xp: 125 },
  ];
}
