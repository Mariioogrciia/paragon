import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

/**
 * Categorías de aviso que cada uno puede apagar (Ajustes → General). Antes
 * era todo o nada: o activabas los avisos del navegador/Discord y te llegaba
 * todo, o nada. Las invitaciones y solicitudes de amistad no tienen
 * categoría: van dirigidas a ti y siempre llegan.
 */
export const CATEGORIAS_AVISO = [
  { clave: "trofeos", label: "Trofeos y platinos nuevos" },
  { clave: "perdibles", label: "Trofeos perdibles al empezar un juego" },
  { clave: "lanzamientos", label: "Lanzamientos de tu lista de deseados" },
  { clave: "precios", label: "Alertas de precio" },
  { clave: "ligas", label: "Ligas, temporada y guerras de clanes" },
  { clave: "social", label: "Sesiones y retos de Platinar juntos" },
  { clave: "resumen", label: "Resumen semanal por Discord" },
] as const;

export type CategoriaAviso = (typeof CATEGORIAS_AVISO)[number]["clave"];

const VALIDAS = new Set<string>(CATEGORIAS_AVISO.map((c) => c.clave));

export async function getAvisosDesactivados(userId: string): Promise<Set<CategoriaAviso>> {
  const [fila] = await db.select({ off: users.avisosDesactivados }).from(users).where(eq(users.id, userId)).limit(1);
  return new Set(((fila?.off ?? []) as string[]).filter((c) => VALIDAS.has(c)) as CategoriaAviso[]);
}

/** Si falla la lectura, se avisa: mejor un aviso de más que perder uno que sí se quería. */
export async function avisoPermitido(userId: string, categoria: CategoriaAviso): Promise<boolean> {
  return !(await getAvisosDesactivados(userId).catch(() => new Set<CategoriaAviso>())).has(categoria);
}

/** `activas`: las categorías marcadas en el formulario; el resto se guarda como desactivado. */
export async function setAvisosActivos(userId: string, activas: string[]): Promise<void> {
  const off = CATEGORIAS_AVISO.map((c) => c.clave).filter((c) => !activas.includes(c));
  await db.update(users).set({ avisosDesactivados: off }).where(eq(users.id, userId));
}
