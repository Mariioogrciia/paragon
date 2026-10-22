import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { platformAccounts } from "@/db/schema";
import { esViolacionDe } from "@/lib/profiles";
import { prepararTablas } from "@/lib/esquema";

/**
 * Cuentas verificadas por la propia plataforma: Epic con su login oficial
 * (Epic Account Services, 21 oct 2026) y Steam con "Iniciar sesión con
 * Steam" (OpenID, 22 oct 2026, ver lib/steam/openid.ts). Vincular pegando un
 * enlace o un ID deja a cualquiera decir "esta cuenta es mía"; con el login de
 * la plataforma es ella quien dice qué cuenta es tuya.
 *
 * Esos logins NO sirven para entrar a Paragon: solo vinculan y verifican,
 * con la sesión de Paragon ya abierta.
 *
 * Una fila por usuario y plataforma con el id de cuenta que se verificó: la
 * cuenta vinculada cuenta como verificada solo si sigue siendo ESA (si luego
 * se cambia a otra pegando un enlace, deja de estarlo sola). Tabla creada la
 * primera vez (lib/esquema.ts).
 */

let tablaLista: Promise<boolean> | null = null;
function asegurarTabla(): Promise<boolean> {
  tablaLista ??= (async () => {
    try {
      // Sin tocar nada si ya está todo (ver lib/esquema.ts: el ALTER de cada arranque
      // bloqueaba la tabla y dejaba colgado lo demás).
      const ok = await prepararTablas({
        tablas: ["cuenta_verificada"],
        ddl: [
        sql`
        CREATE TABLE IF NOT EXISTS "cuenta_verificada" (
          "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
          "platform" text NOT NULL,
          "accountId" text NOT NULL,
          "verificadaEl" timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY ("userId", "platform")
        )
      `,
        ],
      });
      if (!ok) throw new Error("tablas sin crear");
      return true;
    } catch (error) {
      console.error("[verificacion] no se pudo crear la tabla", error);
      tablaLista = null;
      return false;
    }
  })();
  return tablaLista;
}

export type ResultadoVerificacion = "verificada" | "de-otro" | "error";

/**
 * Guarda la cuenta de Epic que ha dado el login de Epic como LA cuenta de
 * Epic del usuario, y la marca verificada. Sin sincronizar: Epic bloquea
 * las lecturas desde el servidor, los logros siguen llegando con la
 * extensión (que ya irá contra esta cuenta).
 */
export async function guardarEpicVerificada(userId: string, accountId: string, nombre: string): Promise<ResultadoVerificacion> {
  try {
    await db
      .insert(platformAccounts)
      .values({ userId, platform: "epic", accountId, username: nombre, isPublic: true })
      .onConflictDoUpdate({
        target: [platformAccounts.userId, platformAccounts.platform],
        set: { accountId, username: nombre },
      });
  } catch (error) {
    if (esViolacionDe(error, "platform_account_identity_idx")) return "de-otro";
    console.error("[verificacion] guardar cuenta de Epic", error);
    return "error";
  }

  return marcarVerificada(userId, "epic", accountId);
}

/** Apunta que la cuenta `accountId` de `platform` la ha confirmado la propia plataforma. */
export async function marcarVerificada(userId: string, platform: string, accountId: string): Promise<ResultadoVerificacion> {
  if (!(await asegurarTabla())) return "error";
  await db.execute(sql`
    INSERT INTO "cuenta_verificada" ("userId", "platform", "accountId", "verificadaEl")
    VALUES (${userId}, ${platform}, ${accountId}, now())
    ON CONFLICT ("userId", "platform") DO UPDATE SET "accountId" = EXCLUDED."accountId", "verificadaEl" = now()
  `);
  return "verificada";
}

/** Si la cuenta de `platform` que tiene vinculada ahora es la que verificó la plataforma. */
export async function cuentaVerificada(userId: string, platform: "epic" | "steam"): Promise<boolean> {
  try {
    if (!(await asegurarTabla())) return false;
    const vinculada = await db.query.platformAccounts.findFirst({
      columns: { accountId: true },
      where: and(eq(platformAccounts.userId, userId), eq(platformAccounts.platform, platform)),
    });
    if (!vinculada) return false;
    const filas = await db.execute<{ accountId: string }>(sql`
      SELECT "accountId" FROM "cuenta_verificada" WHERE "userId" = ${userId} AND "platform" = ${platform}
    `);
    return [...filas][0]?.accountId === vinculada.accountId;
  } catch (error) {
    console.error("[verificacion] leer", error);
    return false;
  }
}

export const epicVerificada = (userId: string) => cuentaVerificada(userId, "epic");
