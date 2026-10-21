import "server-only";
import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { notificationLog } from "@/db/schema";
import { avisarUsuario } from "@/lib/avisos";
import { avisoNpsso, diasRestantesNpsso, type AvisoNpsso } from "@/lib/caducidadNpsso";
import { idDesarrollador } from "@/lib/avisoDesarrollador";
import { getAuthorization, isPsnConfigured, npssoDelEntorno, olvidarTokenPsn, PsnAuthError } from "@/lib/psn/auth";

/**
 * Aviso al desarrollador cuando el NPSSO del servidor (`PSN_NPSSO`) falla o
 * está a punto de caducar (16 oct 2026). Antes, al caducar, TODA la
 * sincronización de PSN se paraba en silencio hasta que alguien se daba
 * cuenta de que no le entraban trofeos.
 *
 * Lo lanza el cron en cada pasada; es barato porque `getAuthorization` usa
 * el token en caché. El estado va en `notification_log` del propio
 * desarrollador, sin tabla nueva:
 * - `psn-npsso-visto` / huella: cuándo funcionó por primera vez este NPSSO
 *   (la huella es un hash corto: el NPSSO nunca se guarda en la base).
 * - `psn-npsso` / clave del aviso: los avisos ya mandados, para no repetirlos.
 */

const TIPO_VISTO = "psn-npsso-visto";
const TIPO_AVISO = "psn-npsso";
const RUTA_ADMIN = "/admin?tab=system";

function huellaNpsso(): string | null {
  const npsso = npssoDelEntorno();
  return npsso ? createHash("sha256").update(npsso).digest("hex").slice(0, 12) : null;
}

async function vistoDesde(userId: string, huella: string): Promise<Date | null> {
  const [fila] = await db
    .select({ enviadoAt: notificationLog.enviadoAt })
    .from(notificationLog)
    .where(and(eq(notificationLog.userId, userId), eq(notificationLog.tipo, TIPO_VISTO), eq(notificationLog.clave, huella)))
    .limit(1);
  return fila?.enviadoAt ?? null;
}

function textoAviso(aviso: AvisoNpsso): { titulo: string; texto: string } {
  if (aviso.tipo === "falta") {
    return {
      titulo: "⚠️ Falta PSN_NPSSO",
      texto: "El servidor no tiene el NPSSO de PlayStation: la sincronización de PSN está parada. Añádelo en Vercel → Settings → Environment Variables.",
    };
  }
  if (aviso.tipo === "caducado") {
    return {
      titulo: "⚠️ El NPSSO de PSN ha caducado",
      texto:
        "Sony ya no acepta el PSN_NPSSO del servidor y la sincronización de PSN está parada. Copia uno nuevo de ca.account.sony.com/api/v1/ssocookie con la sesión de PlayStation abierta, cámbialo en Vercel y vuelve a desplegar.",
    };
  }
  return {
    titulo: "⏳ El NPSSO de PSN caduca pronto",
    texto: `Lleva casi 2 meses en uso: le quedan unos ${aviso.diasRestantes} días. Renuévalo en Vercel antes de que se pare la sincronización de PSN.`,
  };
}

/** Lo llama el cron: comprueba la credencial y avisa si toca. Devuelve el aviso mandado, si hubo uno. */
export async function revisarCredencialPsn(ahora = new Date()): Promise<AvisoNpsso["tipo"] | null> {
  const desarrollador = await idDesarrollador();
  if (!desarrollador) return null;

  const configurado = isPsnConfigured();
  const huella = huellaNpsso();
  let falla = false;
  if (configurado) {
    try {
      await getAuthorization();
    } catch (error) {
      // Solo el NPSSO rechazado cuenta; PSN caída o lenta no es culpa de la credencial.
      if (!(error instanceof PsnAuthError)) return null;
      falla = true;
    }
  }

  let desde: Date | null = null;
  if (configurado && !falla && huella) {
    await db.insert(notificationLog).values({ userId: desarrollador, tipo: TIPO_VISTO, clave: huella }).onConflictDoNothing();
    desde = await vistoDesde(desarrollador, huella);
  }

  const aviso = avisoNpsso({ configurado, falla, huella, vistoDesde: desde, ahora });
  if (!aviso) return null;

  const nuevo = await db
    .insert(notificationLog)
    .values({ userId: desarrollador, tipo: TIPO_AVISO, clave: aviso.clave })
    .onConflictDoNothing()
    .returning({ clave: notificationLog.clave });
  if (nuevo.length === 0) return null;

  await avisarUsuario(desarrollador, { ...textoAviso(aviso), ruta: RUTA_ADMIN });
  return aviso.tipo;
}

export type EstadoCredencialPsn =
  | { estado: "falta" }
  | { estado: "caducado" }
  | { estado: "ok"; desde: Date | null; diasRestantes: number | null };

/** Para Admin → Sistema: lo que sabe la base, sin llamar a Sony. */
export async function estadoCredencialPsn(userId: string, ahora = new Date()): Promise<EstadoCredencialPsn> {
  const huella = huellaNpsso();
  if (!isPsnConfigured() || !huella) return { estado: "falta" };
  const [fallo] = await db
    .select({ clave: notificationLog.clave })
    .from(notificationLog)
    .where(
      and(
        eq(notificationLog.userId, userId),
        eq(notificationLog.tipo, TIPO_AVISO),
        eq(notificationLog.clave, `caducado-${huella}-${ahora.toISOString().slice(0, 10)}`),
      ),
    )
    .limit(1);
  if (fallo) return { estado: "caducado" };
  const desde = await vistoDesde(userId, huella);
  return { estado: "ok", desde, diasRestantes: desde ? diasRestantesNpsso(desde, ahora) : null };
}

/**
 * Admin → Sistema → "Comprobar ahora" (21 oct 2026): prueba el NPSSO contra
 * Sony en el momento, sin el token en caché ni esperar al cron. Si va bien,
 * lo apunta como visto (así el estado pasa a verde enseguida).
 */
export async function comprobarCredencialPsnAhora(userId: string): Promise<"ok" | "falta" | "caducado" | "sin-respuesta"> {
  if (!isPsnConfigured()) return "falta";
  olvidarTokenPsn();
  try {
    await getAuthorization();
  } catch (error) {
    return error instanceof PsnAuthError ? "caducado" : "sin-respuesta";
  }
  const huella = huellaNpsso();
  if (huella) {
    await db.insert(notificationLog).values({ userId, tipo: TIPO_VISTO, clave: huella }).onConflictDoNothing();
  }
  return "ok";
}
