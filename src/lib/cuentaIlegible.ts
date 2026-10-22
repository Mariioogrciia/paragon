import "server-only";
import { and, eq, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { notificationLog } from "@/db/schema";
import { avisarUsuario } from "@/lib/avisos";
import * as psn from "@/lib/psn/client";
import * as steam from "@/lib/steam/client";
import * as xbl from "@/lib/xbl/client";

/**
 * "Ya no podemos leer tu cuenta" (21 oct 2026). Si alguien pone su perfil en
 * privado después de vincularlo, su biblioteca deja de actualizarse sin que
 * se entere: Steam, con "Detalles del juego" en privado, devuelve una
 * biblioteca VACÍA sin dar error, así que la sincronización hasta se daba por
 * buena. Ahora, cuando una cuenta no trae ningún juego o falla, se comprueba
 * si se puede leer y, si la plataforma contesta que no, se le avisa con el
 * enlace a /vincular.
 *
 * Con cuidado de no avisar en falso (22 oct 2026: llegaba "No podemos leer tu
 * cuenta de Xbox" cada 3 horas con el perfil en público, porque OpenXBL
 * fallaba a ratos y cada fallo contaba como "privado"):
 * - Si la plataforma no contesta, no se sabe: no cuenta (`lectura*` → null).
 * - Tiene que repetirse: la primera vez solo se apunta la sospecha, y se
 *   avisa si sigue igual en una sincronización al menos `CONFIRMAR` después.
 * - Como mucho un aviso por plataforma cada `REAVISO`: aunque vuelva a leerse
 *   y se estropee otra vez, dentro de ese plazo no se repite.
 *
 * Se guarda en `notification_log` (clave = plataforma): `cuenta-ilegible-sospecha`
 * con la hora de la primera vez y `cuenta-ilegible` con la del aviso.
 */
const TIPO = "cuenta-ilegible";
const SOSPECHA = "cuenta-ilegible-sospecha";
const CONFIRMAR = 6 * 3600_000;
const REAVISO = 7 * 86_400_000;

const NOMBRE: Record<string, string> = { psn: "PlayStation", steam: "Steam", xbox: "Xbox" };

/** `true`/`false` si la plataforma lo dice; `null` si no ha contestado. */
async function legible(platform: string, accountId: string): Promise<boolean | null> {
  if (platform === "psn") return psn.lecturaTrofeos(accountId);
  if (platform === "steam") return steam.lecturaBiblioteca(accountId);
  return xbl.lecturaLogros(accountId);
}

/** Se lee bien: fuera la sospecha, y el aviso solo si ya pasó el plazo para repetirlo. */
async function olvidar(userId: string, platform: string): Promise<void> {
  const deEste = (tipo: string) =>
    and(eq(notificationLog.userId, userId), eq(notificationLog.tipo, tipo), eq(notificationLog.clave, platform));
  await db.delete(notificationLog).where(deEste(SOSPECHA));
  await db
    .delete(notificationLog)
    .where(and(deEste(TIPO), lt(notificationLog.enviadoAt, new Date(Date.now() - REAVISO))));
}

/**
 * Tras sincronizar una cuenta: `juegos` es lo que trajo, o `null` si falló.
 * Nunca lanza: esto no puede tumbar la sincronización.
 */
export async function vigilarLectura(
  userId: string,
  cuenta: { platform: string; accountId: string },
  juegos: number | null,
): Promise<void> {
  const nombre = NOMBRE[cuenta.platform];
  if (!nombre) return;
  try {
    if (juegos !== null && juegos > 0) return await olvidar(userId, cuenta.platform);
    // Sin juegos o con error: ¿es que ya no se puede leer? Si la comprobación
    // misma falla (red, plataforma caída), no se sabe: mejor no avisar.
    const sePuede = await legible(cuenta.platform, cuenta.accountId).catch(() => null);
    if (sePuede === null) return;
    if (sePuede) return await olvidar(userId, cuenta.platform);

    // Desde cuándo se sospecha (la fila existente, si ya estaba).
    const [sospecha] = await db
      .insert(notificationLog)
      .values({ userId, tipo: SOSPECHA, clave: cuenta.platform })
      .onConflictDoUpdate({
        target: [notificationLog.userId, notificationLog.tipo, notificationLog.clave],
        set: { clave: sql`excluded."clave"` },
      })
      .returning({ desde: notificationLog.enviadoAt });
    if (!sospecha || Date.now() - sospecha.desde.getTime() < CONFIRMAR) return;

    const nuevo = await db
      .insert(notificationLog)
      .values({ userId, tipo: TIPO, clave: cuenta.platform })
      .onConflictDoNothing()
      .returning({ clave: notificationLog.clave });
    if (nuevo.length === 0) return;

    // En español: se traduce al salir (lib/avisosTraduccion.ts).
    await avisarUsuario(userId, {
      titulo: `🔒 No podemos leer tu cuenta de ${nombre}`,
      texto: `Tu perfil de ${nombre} ya no es público y tu biblioteca ha dejado de actualizarse. Toca para ver cómo arreglarlo.`,
      ruta: "/vincular",
    });
  } catch (error) {
    console.error("[cuentaIlegible]", cuenta.platform, error);
  }
}
