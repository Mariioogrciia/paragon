import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { credencialesServidor } from "@/db/schema";
import { cifrar, descifrar } from "@/lib/cifrado";

/**
 * El NPSSO de PSN pegado en Admin → Sistema (15 nov 2026). Manda sobre
 * `PSN_NPSSO`: así renovarlo es pegarlo y ya, sin editar `ENV_PRODUCCION`
 * ni redesplegar Cloud Run. Va cifrado en `credencial_servidor`.
 *
 * Se lee poco (solo cuando hay que sacar un token nuevo de Sony) y se
 * recuerda un minuto, para que varias peticiones a la vez no vayan todas a
 * la base.
 */

const NOMBRE = "psn_npsso";
const PROPOSITO = "psn-npsso";
const MEMORIA_MS = 60_000;

let memoria: { valor: string | null; at: number } | null = null;

const tablaFalta = (error: unknown) => (error as { cause?: { code?: string } })?.cause?.code === "42P01";

export async function leerNpssoGuardado(): Promise<string | null> {
  if (memoria && Date.now() - memoria.at < MEMORIA_MS) return memoria.valor;
  let valor: string | null = null;
  try {
    const [fila] = await db
      .select({ valor: credencialesServidor.valor })
      .from(credencialesServidor)
      .where(eq(credencialesServidor.nombre, NOMBRE))
      .limit(1);
    valor = fila ? descifrar(PROPOSITO, fila.valor) : null;
  } catch (error) {
    if (!tablaFalta(error)) console.error("[npssoGuardado] leer", error);
    // Sin tabla o sin base: se sigue con el de las variables de entorno.
    return memoria?.valor ?? null;
  }
  memoria = { valor, at: Date.now() };
  return valor;
}

/** Guarda (o, con `null`, borra) el NPSSO del servidor. */
export async function guardarNpsso(npsso: string | null): Promise<void> {
  if (!npsso) {
    await db.delete(credencialesServidor).where(eq(credencialesServidor.nombre, NOMBRE));
  } else {
    const fila = { nombre: NOMBRE, valor: cifrar(PROPOSITO, npsso), actualizadaAt: new Date() };
    await db.insert(credencialesServidor).values(fila).onConflictDoUpdate({ target: credencialesServidor.nombre, set: fila });
  }
  memoria = { valor: npsso, at: Date.now() };
}
