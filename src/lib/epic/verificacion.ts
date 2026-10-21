import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { platformAccounts } from "@/db/schema";
import { esViolacionDe } from "@/lib/profiles";

/**
 * Cuentas de Epic verificadas con el login oficial de Epic (Epic Account
 * Services, 21 oct 2026). Hasta ahora, vincular Epic era pegar un enlace o
 * un ID: cualquiera podía decir "esta cuenta es mía". Con el login de Epic
 * es Epic quien dice qué cuenta es la tuya, así que se puede marcar como
 * verificada.
 *
 * El login de Epic NO sirve para entrar a Paragon (no da correo, y no
 * queremos una tercera forma de crear cuentas): solo vincula, con la
 * sesión de Paragon ya abierta. Ver el callback `signIn` de src/auth.ts.
 *
 * Una fila por usuario y plataforma con el id de cuenta que se verificó: la
 * cuenta vinculada cuenta como verificada solo si sigue siendo ESA (si
 * luego se cambia a otra pegando un enlace, deja de estarlo sola). Tabla
 * creada la primera vez, como ajuste_sistema.
 */

let tablaLista: Promise<boolean> | null = null;
function asegurarTabla(): Promise<boolean> {
  tablaLista ??= (async () => {
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "cuenta_verificada" (
          "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
          "platform" text NOT NULL,
          "accountId" text NOT NULL,
          "verificadaEl" timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY ("userId", "platform")
        )
      `);
      await db.execute(sql`ALTER TABLE "cuenta_verificada" ENABLE ROW LEVEL SECURITY`);
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

  if (!(await asegurarTabla())) return "error";
  await db.execute(sql`
    INSERT INTO "cuenta_verificada" ("userId", "platform", "accountId", "verificadaEl")
    VALUES (${userId}, 'epic', ${accountId}, now())
    ON CONFLICT ("userId", "platform") DO UPDATE SET "accountId" = EXCLUDED."accountId", "verificadaEl" = now()
  `);
  return "verificada";
}

/** Si la cuenta de Epic que tiene vinculada ahora es la que verificó con Epic. */
export async function epicVerificada(userId: string): Promise<boolean> {
  try {
    if (!(await asegurarTabla())) return false;
    const vinculada = await db.query.platformAccounts.findFirst({
      columns: { accountId: true },
      where: and(eq(platformAccounts.userId, userId), eq(platformAccounts.platform, "epic")),
    });
    if (!vinculada) return false;
    const filas = await db.execute<{ accountId: string }>(sql`
      SELECT "accountId" FROM "cuenta_verificada" WHERE "userId" = ${userId} AND "platform" = 'epic'
    `);
    return [...filas][0]?.accountId === vinculada.accountId;
  } catch (error) {
    console.error("[verificacion] leer", error);
    return false;
  }
}
