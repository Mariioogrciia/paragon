import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { priceAlerts } from "@/db/schema";
import { precioSteamEs } from "@/lib/steamPrecio";
import { avisarUsuario } from "@/lib/avisos";

/**
 * Alertas de precio: "avísame cuando este juego baje de X € en Steam".
 * Las comprueba el cron (`comprobarAlertasPrecio`), unas pocas por pasada,
 * rotando por la que hace más que no se mira.
 */

export interface AlertaPrecio {
  precioObjetivo: number;
  avisadoAt: Date | null;
}

export async function getAlertaPrecio(userId: string, steamAppId: string): Promise<AlertaPrecio | null> {
  const [fila] = await db
    .select({ precioObjetivo: priceAlerts.precioObjetivo, avisadoAt: priceAlerts.avisadoAt })
    .from(priceAlerts)
    .where(and(eq(priceAlerts.userId, userId), eq(priceAlerts.steamAppId, steamAppId)))
    .limit(1);
  return fila ?? null;
}

export async function guardarAlertaPrecio(
  userId: string,
  datos: { steamAppId: string; gameId: string; titulo: string; precioObjetivo: number },
): Promise<void> {
  await db
    .insert(priceAlerts)
    .values({ userId, ...datos })
    .onConflictDoUpdate({
      target: [priceAlerts.userId, priceAlerts.steamAppId],
      // Precio nuevo = alerta nueva: se olvida el último aviso, para que
      // vuelva a avisar si el precio ya está por debajo del objetivo nuevo.
      set: { precioObjetivo: datos.precioObjetivo, titulo: datos.titulo, gameId: datos.gameId, avisadoAt: null, precioAvisado: null },
    });
}

export async function borrarAlertaPrecio(userId: string, steamAppId: string): Promise<void> {
  await db.delete(priceAlerts).where(and(eq(priceAlerts.userId, userId), eq(priceAlerts.steamAppId, steamAppId)));
}

/** No volver a avisar del mismo precio antes de esto, aunque siga por debajo. */
const REAVISO_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * ¿Toca avisar? Por debajo del objetivo, y además: nunca avisado, o ha bajado
 * todavía más desde el último aviso, o hace más de una semana. Sin esto, una
 * rebaja de dos semanas mandaría el mismo aviso en cada pasada del cron.
 */
export function debeAvisar(
  alerta: { precioObjetivo: number; avisadoAt: Date | null; precioAvisado: number | null },
  precioActual: number | null,
  ahora: Date,
): boolean {
  if (precioActual === null || precioActual > alerta.precioObjetivo) return false;
  if (!alerta.avisadoAt) return true;
  if (alerta.precioAvisado !== null && precioActual < alerta.precioAvisado) return true;
  return ahora.getTime() - alerta.avisadoAt.getTime() > REAVISO_MS;
}

/**
 * Pasada del cron. `hasta` es el instante límite (presupuesto de tiempo del
 * cron): no se empieza otra alerta después. Devuelve cuántos avisos mandó.
 */
export async function comprobarAlertasPrecio(hasta: number, maximo = 10): Promise<number> {
  const pendientes = await db
    .select()
    .from(priceAlerts)
    .orderBy(sql`${priceAlerts.comprobadoAt} asc nulls first`, asc(priceAlerts.creadoAt))
    .limit(maximo);

  let avisos = 0;
  for (const alerta of pendientes) {
    if (Date.now() > hasta) break;
    const precio = await precioSteamEs(alerta.steamAppId);
    const ahora = new Date();
    const clave = and(eq(priceAlerts.userId, alerta.userId), eq(priceAlerts.steamAppId, alerta.steamAppId));

    if (precio && debeAvisar(alerta, precio.final, ahora)) {
      const rebaja = precio.descuento > 0 ? ` (-${precio.descuento}%)` : "";
      const eur = (n: number) => n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });
      await avisarUsuario(alerta.userId, {
        titulo: `💸 ${alerta.titulo} a ${eur(precio.final)}`,
        texto: `Ha bajado de tu objetivo de ${eur(alerta.precioObjetivo)} en Steam${rebaja}.`,
        ruta: `/juego/${encodeURIComponent(alerta.gameId)}`,
      }, "precios");
      await db.update(priceAlerts).set({ comprobadoAt: ahora, avisadoAt: ahora, precioAvisado: precio.final }).where(clave);
      avisos++;
    } else {
      await db.update(priceAlerts).set({ comprobadoAt: ahora }).where(clave);
    }
  }
  return avisos;
}
