import "server-only";
import { cache } from "react";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { retirados } from "@/db/schema";
import { SIN_RETIRADOS, type Retirados } from "@/lib/retiradosReglas";

/**
 * Consolas y juegos que ya no tienes (tabla `retirado`, 8 nov 2026). Hasta
 * que exista la tabla (scripts/migraciones/crear-tablas-noviembre-2026.mts)
 * todo responde como si no hubiera nada retirado.
 */
const tablaFalta = (error: unknown) => (error as { cause?: { code?: string } })?.cause?.code === "42P01";

export const getRetirados = cache(async (userId: string): Promise<Retirados> => {
  try {
    const filas = await db.select({ tipo: retirados.tipo, valor: retirados.valor }).from(retirados).where(eq(retirados.userId, userId));
    return {
      dispositivos: new Set(filas.filter((f) => f.tipo === "dispositivo").map((f) => f.valor)),
      juegos: new Set(filas.filter((f) => f.tipo === "juego").map((f) => f.valor)),
    };
  } catch (error) {
    if (tablaFalta(error)) return SIN_RETIRADOS;
    throw error;
  }
});

export async function cambiarRetirado(userId: string, tipo: "dispositivo" | "juego", valor: string, retirado: boolean): Promise<void> {
  const limpio = tipo === "dispositivo" ? valor.trim().toUpperCase() : valor.trim();
  if (!limpio || limpio.length > 200) return;
  if (retirado) {
    await db.insert(retirados).values({ userId, tipo, valor: limpio }).onConflictDoNothing();
  } else {
    await db.delete(retirados).where(and(eq(retirados.userId, userId), eq(retirados.tipo, tipo), eq(retirados.valor, limpio)));
  }
}
