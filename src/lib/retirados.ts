import "server-only";
import { cache } from "react";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { retirados } from "@/db/schema";
import { SIN_RETIRADOS, type Marcas, type TipoMarca } from "@/lib/retiradosReglas";

/**
 * Consolas y juegos que ya no tienes (tabla `retirado`, 8 nov 2026). Hasta
 * que exista la tabla (scripts/migraciones/crear-tablas-noviembre-2026.mts)
 * todo responde como si no hubiera nada retirado.
 */
const tablaFalta = (error: unknown) => (error as { cause?: { code?: string } })?.cause?.code === "42P01";

export const getRetirados = cache(async (userId: string): Promise<Marcas> => {
  try {
    const filas = await db.select({ tipo: retirados.tipo, valor: retirados.valor }).from(retirados).where(eq(retirados.userId, userId));
    const de = (tipo: string) => new Set(filas.filter((f) => f.tipo === tipo).map((f) => f.valor));
    return {
      dispositivos: de("dispositivo"),
      juegos: de("juego"),
      instalados: de("instalado"),
      ocultosPerfil: de("oculto_perfil"),
      fechaObjetivo: filas.find((f) => f.tipo === "fecha_objetivo")?.valor ?? null,
    };
  } catch (error) {
    if (tablaFalta(error)) return SIN_RETIRADOS;
    throw error;
  }
});

/** Solo lo oculto de tu perfil público, para pintar el perfil de otra persona. */
export async function ocultosDelPerfil(userId: string): Promise<Set<string>> {
  return (await getRetirados(userId)).ocultosPerfil;
}

export async function cambiarRetirado(userId: string, tipo: TipoMarca, valor: string, activo: boolean): Promise<void> {
  const limpio = tipo === "dispositivo" ? valor.trim().toUpperCase() : valor.trim();
  if (!limpio || limpio.length > 200) return;
  if (tipo === "fecha_objetivo") {
    // Una sola fecha por persona (la del platino reservado): se sustituye.
    await db.delete(retirados).where(and(eq(retirados.userId, userId), eq(retirados.tipo, tipo)));
    if (activo && /^\d{4}-\d{2}-\d{2}$/.test(limpio)) await db.insert(retirados).values({ userId, tipo, valor: limpio });
    return;
  }
  if (activo) {
    await db.insert(retirados).values({ userId, tipo, valor: limpio }).onConflictDoNothing();
  } else {
    await db.delete(retirados).where(and(eq(retirados.userId, userId), eq(retirados.tipo, tipo), eq(retirados.valor, limpio)));
  }
}
