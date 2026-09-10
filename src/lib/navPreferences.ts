import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

/**
 * Funciones "opcionales" de la cabecera que cada usuario puede ocultar de su
 * propio menú porque no le interesan — nada de comunidad, es personal y no
 * afecta a nadie más ni desactiva la función en el servidor (`/feed` sigue
 * existiendo aunque lo ocultes, solo dejas de verlo en tu menú). Panel y
 * Biblioteca no entran: son el núcleo de la app, no algo que "no interese".
 */
export const NAV_OCULTABLE = [
  { key: "feed", label: "Comunidad" },
  { key: "ligas", label: "Ligas" },
  { key: "amigos", label: "Amigos" },
  { key: "descubrir", label: "Descubrir" },
  { key: "noticias", label: "Noticias" },
  { key: "planificador", label: "Planificador" },
] as const;

export type NavKey = (typeof NAV_OCULTABLE)[number]["key"];

const CLAVES_VALIDAS = new Set<string>(NAV_OCULTABLE.map((n) => n.key));

export async function getHiddenNavItems(userId: string): Promise<NavKey[]> {
  const [row] = await db
    .select({ hiddenNavItems: users.hiddenNavItems })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return ((row?.hiddenNavItems ?? []) as string[]).filter((k) => CLAVES_VALIDAS.has(k)) as NavKey[];
}

/** Reemplaza la lista entera — el formulario de ajustes manda el set completo marcado. */
export async function setHiddenNavItems(userId: string, items: string[]): Promise<void> {
  const limpio = [...new Set(items.filter((k) => CLAVES_VALIDAS.has(k)))];
  await db.update(users).set({ hiddenNavItems: limpio }).where(eq(users.id, userId));
}
