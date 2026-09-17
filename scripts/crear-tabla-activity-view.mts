/**
 * Crea la tabla de visualizaciones del Feed (activity_view) — una fila por
 * (actividad, usuario que la vio), mismo patrón que activity_reaction.
 * SQL explícito en vez de `db:push`, mismo motivo que el resto de tablas
 * nuevas de esta app (ver scripts/crear-tabla-fcm-token.mts): `db:push`
 * compara el esquema entero y ya ha propuesto una vez truncar una tabla sin
 * relación con el cambio real.
 *
 *   npx tsx scripts/crear-tabla-activity-view.mts
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
      CREATE TABLE IF NOT EXISTS "activity_view" (
        "activityId" text NOT NULL,
        "userId" text NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        PRIMARY KEY ("activityId", "userId"),
        CONSTRAINT "activity_view_activityId_activity_id_fk" FOREIGN KEY ("activityId") REFERENCES "activity"("id") ON DELETE CASCADE,
        CONSTRAINT "activity_view_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
      )
    `;
    console.log("OK: tabla activity_view creada (o ya existía).");
  } finally {
    await sql.end();
  }
}

main();
