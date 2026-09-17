/**
 * Añade duración opcional a `league` (durationValue/durationUnit/endsAt) y
 * el estado de invitación a `league_member` (status pending/accepted) —
 * antes cualquier amigo invitado entraba directo, sin aceptar nada. SQL
 * explícito, mismo motivo que el resto de cambios de esquema de esta app.
 *
 *   npx tsx scripts/anadir-duracion-y-invitaciones-ligas.mts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL en .env.local");

  const sql = postgres(url, { prepare: false });

  try {
    await sql`ALTER TABLE "league" ADD COLUMN IF NOT EXISTS "durationValue" integer`;
    await sql`ALTER TABLE "league" ADD COLUMN IF NOT EXISTS "durationUnit" text`;
    await sql`ALTER TABLE "league" ADD COLUMN IF NOT EXISTS "endsAt" timestamp`;
    // Las filas ya existentes (dueño + miembros ya añadidos antes de este
    // cambio) se dan por aceptadas — nadie tiene que volver a confirmar lo
    // que ya estaba dentro.
    await sql`ALTER TABLE "league_member" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'accepted'`;
    console.log("OK: duración en league, status en league_member.");
  } finally {
    await sql.end();
  }
}

main();
