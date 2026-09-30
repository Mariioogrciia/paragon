import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

/**
 * Secciones del panel que cada uno puede ocultar (Ajustes → Ocultar). El
 * panel tenía diez seguidas — en móvil, 4.400 px de alto — y no todo el
 * mundo quiere ver misiones o lanzamientos. Una sección oculta tampoco se
 * calcula: además de más corto, el panel carga antes.
 */
export const PANEL_OCULTABLE = [
  { key: "ritmo", label: "Tu ritmo (resumen del mes y gráfica)" },
  { key: "misiones", label: "Misiones semanales" },
  { key: "talDia", label: "Tal día como hoy" },
  { key: "estadisticas", label: "Actividad y estadísticas" },
  { key: "recomendaciones", label: "Siguiente trofeo" },
  { key: "aUnPaso", label: "A un paso del platino" },
  { key: "parados", label: "Juegos parados" },
  { key: "lanzamientos", label: "Próximos lanzamientos" },
  { key: "recientes", label: "Jugado recientemente" },
  { key: "actividad", label: "Actividad reciente" },
] as const;

export type SeccionPanel = (typeof PANEL_OCULTABLE)[number]["key"];

const VALIDAS = new Set<string>(PANEL_OCULTABLE.map((s) => s.key));

export async function getPanelOculto(userId: string): Promise<Set<SeccionPanel>> {
  const [fila] = await db.select({ panelOculto: users.panelOculto }).from(users).where(eq(users.id, userId)).limit(1);
  return new Set(((fila?.panelOculto ?? []) as string[]).filter((k) => VALIDAS.has(k)) as SeccionPanel[]);
}

export async function setPanelOculto(userId: string, claves: string[]): Promise<void> {
  const limpio = [...new Set(claves.filter((k) => VALIDAS.has(k)))];
  await db.update(users).set({ panelOculto: limpio }).where(eq(users.id, userId));
}
