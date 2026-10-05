import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { esportsFavoritos } from "@/db/schema";

/** Equipo seguido, con lo justo para pintarlo sin pedir PandaScore. */
export interface EquipoFavorito {
  teamId: number;
  nombre: string;
  acronimo: string | null;
  logo: string | null;
  juego: string | null;
}

export const MAX_FAVORITOS = 30;

/** Si la tabla aún no existe, /esports se ve igual, sin favoritos. */
export async function getFavoritos(userId: string): Promise<EquipoFavorito[]> {
  try {
    return await db
      .select({
        teamId: esportsFavoritos.teamId,
        nombre: esportsFavoritos.nombre,
        acronimo: esportsFavoritos.acronimo,
        logo: esportsFavoritos.logo,
        juego: esportsFavoritos.juego,
      })
      .from(esportsFavoritos)
      .where(eq(esportsFavoritos.userId, userId))
      .orderBy(asc(esportsFavoritos.createdAt));
  } catch (error) {
    console.error("[esportsFavoritos] no se pudieron leer", error);
    return [];
  }
}

/** Sigue o deja de seguir; devuelve si queda seguido. */
export async function alternarFavorito(userId: string, equipo: EquipoFavorito): Promise<boolean> {
  const borrados = await db
    .delete(esportsFavoritos)
    .where(and(eq(esportsFavoritos.userId, userId), eq(esportsFavoritos.teamId, equipo.teamId)))
    .returning({ teamId: esportsFavoritos.teamId });
  if (borrados.length > 0) return false;

  const actuales = await db
    .select({ teamId: esportsFavoritos.teamId })
    .from(esportsFavoritos)
    .where(eq(esportsFavoritos.userId, userId));
  if (actuales.length >= MAX_FAVORITOS) throw new Error("LIMITE");

  await db
    .insert(esportsFavoritos)
    .values({ userId, ...equipo })
    .onConflictDoNothing();
  return true;
}
