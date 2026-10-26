/**
 * Crea `steam_account_extra` (cuentas de Steam además de la principal, 15 oct
 * 2026), con RLS activado (regla de las tablas nuevas, ver docs/HANDOFF.md).
 * Idempotente. No hace falta ejecutarlo: la app la crea sola la primera vez
 * (`asegurarTablaSteamExtra` en lib/steamExtraDatos.ts); queda por si se
 * prefiere hacerlo a mano.
 *
 *   npx tsx scripts/migraciones/crear-tabla-steam-extra.mts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL en .env.local");
  const sql = postgres(url, { prepare: false });

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS "steam_account_extra" (
        "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "accountId" text NOT NULL UNIQUE,
        "username" text NOT NULL,
        "avatarUrl" text,
        "isPublic" boolean NOT NULL DEFAULT true,
        "syncedAt" timestamp,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        PRIMARY KEY ("userId", "accountId")
      );
    `;
    await sql.unsafe(`ALTER TABLE "steam_account_extra" ENABLE ROW LEVEL SECURITY`);
    await sql.unsafe(`REVOKE ALL ON "steam_account_extra" FROM anon, authenticated`).catch(() => {});
    console.log("OK: steam_account_extra");
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
