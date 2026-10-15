import "server-only";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { steamAccountExtra } from "@/db/schema";

/**
 * Lectura de las cuentas de Steam extra (ver `steamAccountExtra` en
 * db/schema.ts). Aparte de lib/steamExtra.ts para que lib/sync.ts pueda
 * usarlo sin importar el flujo de vincular (que a su vez usa sync).
 */

export type CuentaSteamExtra = typeof steamAccountExtra.$inferSelect;

let tablaLista: Promise<boolean> | null = null;

/**
 * Crea la tabla si no existe (una vez por instancia). Así la función no
 * depende de que alguien ejecute antes el script a mano. Si la base no deja
 * crearla, se devuelve false y todo sigue como si no hubiera cuentas extra.
 */
export function asegurarTablaSteamExtra(): Promise<boolean> {
  tablaLista ??= (async () => {
    try {
      // Lo normal es que ya exista: entonces ni se toca (sin DDL ni bloqueos).
      const [fila] = await db.execute<{ existe: string | null }>(sql`select to_regclass('public.steam_account_extra')::text as existe`);
      if (fila?.existe) return true;
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "steam_account_extra" (
          "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
          "accountId" text NOT NULL UNIQUE,
          "username" text NOT NULL,
          "avatarUrl" text,
          "isPublic" boolean NOT NULL DEFAULT true,
          "syncedAt" timestamp,
          "createdAt" timestamp NOT NULL DEFAULT now(),
          PRIMARY KEY ("userId", "accountId")
        )
      `);
      await db.execute(sql`ALTER TABLE "steam_account_extra" ENABLE ROW LEVEL SECURITY`);
      return true;
    } catch (error) {
      console.error("[steamExtra] no se pudo crear la tabla", error);
      tablaLista = null;
      return false;
    }
  })();
  return tablaLista;
}

/** Las cuentas de Steam extra de un usuario (vacío si no hay o si la tabla no está). */
export async function cuentasSteamExtra(userId: string): Promise<CuentaSteamExtra[]> {
  if (!(await asegurarTablaSteamExtra())) return [];
  try {
    return await db
      .select()
      .from(steamAccountExtra)
      .where(eq(steamAccountExtra.userId, userId))
      .orderBy(asc(steamAccountExtra.createdAt));
  } catch (error) {
    console.error("[steamExtra] leer", error);
    return [];
  }
}
