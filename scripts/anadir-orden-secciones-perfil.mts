/**
 * Añade, con SQL explícito, la columna nueva de esta sesión
 * (`profileSectionOrder` en "user"). No se usa `db:push` a propósito: sobre
 * una base de producción, `db:push` compara el esquema entero y puede
 * proponer cambios sobre tablas que no tienen nada que ver con esto (mismo
 * motivo que `crear-tablas-nuevas.mts`). Con `ADD COLUMN IF NOT EXISTS` se
 * puede volver a ejecutar sin miedo.
 *
 *   npx tsx scripts/anadir-orden-secciones-perfil.mts
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
      ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS "profileSectionOrder" jsonb;
    `;
    console.log("OK: user.profileSectionOrder");
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
