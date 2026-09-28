/**
 * Tabla del limitador de peticiones (src/lib/rateLimit.ts). Mientras no
 * exista, el limitador deja pasar todo (falla abierto) — la app funciona
 * igual, solo que sin límites.
 *
 * RLS activado de paso, igual que el resto tras `activar-rls.mts`.
 *
 *   npx tsx scripts/crear-tabla-rate-limit.mts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";

async function main() {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL/DIRECT_URL en .env.local");

  const sql = postgres(url, { prepare: false });
  try {
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS "rate_limit" (
        "clave" text PRIMARY KEY,
        "ventana" timestamp NOT NULL DEFAULT now(),
        "cuenta" integer NOT NULL DEFAULT 1
      )
    `);
    await sql.unsafe(`ALTER TABLE "rate_limit" ENABLE ROW LEVEL SECURITY`);
    await sql.unsafe(`REVOKE ALL ON "rate_limit" FROM anon, authenticated`);
    console.log("OK: rate_limit");
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
