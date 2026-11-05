import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clavesXbl } from "@/db/schema";
import { cifrar, descifrar } from "@/lib/cifrado";

/**
 * Clave propia de OpenXBL por persona (5 nov 2026). Xbox se lee con
 * OpenXBL, que da 150 peticiones/hora gratis por clave; con una sola clave
 * del servidor, ese cupo es de TODO Paragon y se agota (docs/HANDOFF.md).
 * Quien pega la suya en Ajustes → Plataformas sincroniza con su cupo.
 *
 * La clave viaja a lib/xbl/client.ts por AsyncLocalStorage (`conClaveXbl`)
 * en vez de por parámetro en cada función: así ninguna llamada de Xbox de
 * esa sincronización se olvida de usarla.
 */

const almacen = new AsyncLocalStorage<string>();
const tablaFalta = (error: unknown) => (error as { cause?: { code?: string } })?.cause?.code === "42P01";

/** La clave de la sincronización en curso, si es de alguien con clave propia. */
export function claveXblEnCurso(): string | undefined {
  return almacen.getStore();
}

export async function claveXblDe(userId: string): Promise<string | null> {
  try {
    const [fila] = await db.select({ clave: clavesXbl.clave }).from(clavesXbl).where(eq(clavesXbl.userId, userId)).limit(1);
    return fila ? descifrar("xbl", fila.clave) : null;
  } catch (error) {
    if (tablaFalta(error)) return null;
    throw error;
  }
}

/** Ejecuta `fn` con la clave propia de esta persona, si la tiene. */
export async function conClaveXbl<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  const clave = await claveXblDe(userId);
  return clave ? almacen.run(clave, fn) : fn();
}

export async function guardarClaveXbl(userId: string, clave: string | null): Promise<void> {
  if (!clave) {
    await db.delete(clavesXbl).where(eq(clavesXbl.userId, userId));
    return;
  }
  const fila = { userId, clave: cifrar("xbl", clave), actualizadaAt: new Date() };
  await db.insert(clavesXbl).values(fila).onConflictDoUpdate({ target: clavesXbl.userId, set: fila });
}

export async function tieneClaveXbl(userId: string): Promise<boolean> {
  return (await claveXblDe(userId).catch(() => null)) !== null;
}
