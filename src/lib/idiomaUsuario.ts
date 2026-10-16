import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { esIdioma, type Idioma } from "@/lib/idiomasTrofeo";

/**
 * El idioma de cada persona para lo que le llega sin que esté mirando: push,
 * DM de Discord y la bandeja de avisos (16 oct 2026, ver
 * lib/avisosTraduccion.ts). Se guarda en `users.language`:
 * - en la web, al cambiar de idioma (`updateLanguageAction`) y, si ya había
 *   elegido uno (cookie NEXT_LOCALE), al cargar la página con sesión;
 * - en la app, con el idioma del móvil (cabecera Accept-Language) al
 *   registrar el token de push y al abrir el panel.
 * La web sin cookie no lo toca: sale en español por defecto, y pisaría el
 * idioma que ya hubiera dado la app.
 */

/** "en-US", "en", null... → el idioma de Paragon que toca ("es" si no se sabe). */
export function normalizarIdioma(valor: string | null | undefined): Idioma {
  const corto = (valor ?? "").slice(0, 2).toLowerCase();
  return esIdioma(corto) ? corto : "es";
}

export async function idiomaDeUsuario(userId: string): Promise<Idioma> {
  try {
    const [fila] = await db.select({ language: users.language }).from(users).where(eq(users.id, userId)).limit(1);
    return normalizarIdioma(fila?.language);
  } catch {
    return "es";
  }
}

/** Guarda el idioma solo si ha cambiado (una sentencia, sin escribir si es el mismo). Nunca lanza. */
export async function guardarIdiomaUsuario(userId: string, idioma: Idioma): Promise<void> {
  try {
    await db
      .update(users)
      .set({ language: idioma })
      .where(sql`${users.id} = ${userId} and ${users.language} is distinct from ${idioma}`);
  } catch (error) {
    console.error("[idioma] guardar", error);
  }
}
