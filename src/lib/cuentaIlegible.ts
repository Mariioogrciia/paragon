import "server-only";
import { and, eq } from "drizzle-orm";
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
 * si se puede leer (las mismas llamadas que el asistente de vincular) y, si
 * no, se le avisa UNA vez por plataforma con el enlace a /vincular. Cuando
 * vuelve a leerse, se olvida, para avisar otra vez si se repite.
 *
 * Se guarda en `notification_log` (tipo `cuenta-ilegible`, clave = plataforma).
 */
const TIPO = "cuenta-ilegible";

const NOMBRE: Record<string, string> = { psn: "PlayStation", steam: "Steam", xbox: "Xbox" };

async function legible(platform: string, accountId: string): Promise<boolean> {
  if (platform === "psn") return psn.canReadTrophies(accountId);
  if (platform === "steam") return steam.canReadLibrary(accountId);
  return xbl.canReadAchievements(accountId);
}

async function olvidar(userId: string, platform: string): Promise<void> {
  await db
    .delete(notificationLog)
    .where(and(eq(notificationLog.userId, userId), eq(notificationLog.tipo, TIPO), eq(notificationLog.clave, platform)));
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
