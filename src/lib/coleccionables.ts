import "server-only";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { coleccionablesTrofeo } from "@/db/schema";
import { setManualTrophyProgress } from "@/lib/profiles";
import { marcadosValidos, MAX_COLECCIONABLES } from "@/lib/coleccionablesReglas";

/**
 * La lista de coleccionables de un trofeo de cada persona (tabla
 * `coleccionable_trofeo`): sus nombres y cuáles tiene. El total y lo marcado
 * se copian al contador manual del trofeo (setManualTrophyProgress), así
 * que el progreso sale igual en la ficha, en Enfoque y en el plan.
 *
 * La lista de la comunidad: si otra persona ya pegó los nombres de ese
 * mismo trofeo, se ofrece para no tener que buscar la guía.
 */

const tablaFalta = (error: unknown) => (error as { cause?: { code?: string } })?.cause?.code === "42P01";

export interface ListaColeccionables {
  nombres: string[];
  marcados: number[];
  total: number;
}

export async function getColeccionables(userId: string, gameId: string, trophyId: string): Promise<{ propia: ListaColeccionables | null; comunidad: string[] | null }> {
  try {
    const [propia] = await db
      .select({ nombres: coleccionablesTrofeo.nombres, marcados: coleccionablesTrofeo.marcados })
      .from(coleccionablesTrofeo)
      .where(and(eq(coleccionablesTrofeo.userId, userId), eq(coleccionablesTrofeo.gameId, gameId), eq(coleccionablesTrofeo.trophyId, trophyId)))
      .limit(1);
    // La de la comunidad: la lista con nombres más repetida entre los demás
    // (la misma guía pegada por varios gana a una suelta), y si no, la más reciente.
    const [comunidad] = await db
      .select({ nombres: coleccionablesTrofeo.nombres, veces: sql<number>`count(*) over (partition by ${coleccionablesTrofeo.nombres})` })
      .from(coleccionablesTrofeo)
      .where(
        and(
          eq(coleccionablesTrofeo.gameId, gameId),
          eq(coleccionablesTrofeo.trophyId, trophyId),
          ne(coleccionablesTrofeo.userId, userId),
          sql`jsonb_array_length(${coleccionablesTrofeo.nombres}) > 0`,
        ),
      )
      .orderBy(sql`2 desc`, desc(coleccionablesTrofeo.actualizadoAt))
      .limit(1);
    return {
      propia: propia ? { nombres: propia.nombres, marcados: propia.marcados, total: 0 } : null,
      comunidad: comunidad?.nombres?.length ? comunidad.nombres : null,
    };
  } catch (error) {
    if (tablaFalta(error)) return { propia: null, comunidad: null };
    throw error;
  }
}

/**
 * Guarda la lista. `total`: cuántas casillas hay (sin nombres, numeradas);
 * con nombres manda su número. Devuelve lo que quedó guardado.
 */
export async function guardarColeccionables(
  userId: string,
  gameId: string,
  trophyId: string,
  datos: { nombres: string[]; marcados: number[]; total: number },
): Promise<ListaColeccionables> {
  const nombres = datos.nombres.slice(0, MAX_COLECCIONABLES);
  const total = nombres.length > 0 ? nombres.length : Math.max(1, Math.min(MAX_COLECCIONABLES, Math.round(datos.total)));
  const marcados = marcadosValidos(datos.marcados, total);
  const fila = { userId, gameId, trophyId, nombres, marcados, actualizadoAt: new Date() };
  await db
    .insert(coleccionablesTrofeo)
    .values(fila)
    .onConflictDoUpdate({ target: [coleccionablesTrofeo.userId, coleccionablesTrofeo.gameId, coleccionablesTrofeo.trophyId], set: fila });
  await setManualTrophyProgress(userId, gameId, trophyId, marcados.length, total);
  return { nombres, marcados, total };
}

export async function borrarColeccionables(userId: string, gameId: string, trophyId: string): Promise<void> {
  await db
    .delete(coleccionablesTrofeo)
    .where(and(eq(coleccionablesTrofeo.userId, userId), eq(coleccionablesTrofeo.gameId, gameId), eq(coleccionablesTrofeo.trophyId, trophyId)));
}
