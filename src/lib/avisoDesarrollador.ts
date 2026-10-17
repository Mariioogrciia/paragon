import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { notificationLog, users } from "@/db/schema";
import { avisarUsuario } from "@/lib/avisos";
import { CORREO_DESARROLLADOR } from "@/lib/profiles";

/**
 * Avisos al desarrollador (17 oct 2026): los usan el NPSSO de PSN
 * (lib/credencialPsn.ts) y la vigilancia del servidor (lib/vigilancia.ts).
 * Todo va al `notification_log` del propio desarrollador, sin tabla nueva.
 */

export async function idDesarrollador(): Promise<string | null> {
  const [fila] = await db.select({ id: users.id }).from(users).where(eq(users.email, CORREO_DESARROLLADOR)).limit(1);
  return fila?.id ?? null;
}

/**
 * Manda el aviso (push, DM de Discord y campana) solo si esta `clave` no se
 * ha mandado ya. Para "una vez al día" se mete la fecha en la clave.
 */
export async function avisarAlDesarrolladorUnaVez(
  desarrollador: string,
  tipo: string,
  clave: string,
  aviso: { titulo: string; texto: string; ruta?: string },
): Promise<boolean> {
  const nuevo = await db
    .insert(notificationLog)
    .values({ userId: desarrollador, tipo, clave })
    .onConflictDoNothing()
    .returning({ clave: notificationLog.clave });
  if (nuevo.length === 0) return false;
  await avisarUsuario(desarrollador, aviso);
  return true;
}

/** `true` la primera vez que se pide con esta clave (p. ej. una por hora). */
export async function primeraVez(desarrollador: string, tipo: string, clave: string): Promise<boolean> {
  const nuevo = await db
    .insert(notificationLog)
    .values({ userId: desarrollador, tipo, clave })
    .onConflictDoNothing()
    .returning({ clave: notificationLog.clave });
  return nuevo.length > 0;
}

const TIPO_PASADA = "cron-pasada";

/** Latido del cron: la hora de la última pasada que llegó al final. */
export async function apuntarPasadaCron(desarrollador: string): Promise<void> {
  await db
    .insert(notificationLog)
    .values({ userId: desarrollador, tipo: TIPO_PASADA, clave: "ultima" })
    .onConflictDoUpdate({
      target: [notificationLog.userId, notificationLog.tipo, notificationLog.clave],
      set: { enviadoAt: sql`now()` },
    });
}

/** Para Admin → Sistema: cuándo pasó el cron por última vez (null si nunca o sin datos). */
export async function ultimaPasadaCron(desarrollador: string): Promise<Date | null> {
  const [fila] = await db
    .select({ enviadoAt: notificationLog.enviadoAt })
    .from(notificationLog)
    .where(and(eq(notificationLog.userId, desarrollador), eq(notificationLog.tipo, TIPO_PASADA), eq(notificationLog.clave, "ultima")))
    .limit(1);
  return fila?.enviadoAt ?? null;
}

/** Minutos desde la última pasada del cron (null si nunca). */
export async function minutosDesdePasadaCron(desarrollador: string, ahora = new Date()): Promise<number | null> {
  const ultima = await ultimaPasadaCron(desarrollador);
  return ultima ? Math.max(0, Math.round((ahora.getTime() - ultima.getTime()) / 60_000)) : null;
}
