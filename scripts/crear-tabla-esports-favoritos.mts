/**
 * Crea la tabla de equipos de eSports favoritos (`esports_favorito`) — SQL
 * explícito en vez de `db:push`, como el resto de tablas sueltas.
 *
 *   npx tsx scripts/crear-tabla-esports-favoritos.mts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";

async function main() {
  // DIRECT_URL (session pooler): el de transacciones no aguanta DDL.
  const url = process.env.DIRECT_URL;
  if (!url) throw new Error("Falta DIRECT_URL en .env.local");

  const sql = postgres(url, { prepare: false });

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS "esports_favorito" (
        "userId" text NOT NULL,
        "teamId" integer NOT NULL,
        "nombre" text NOT NULL,
        "acronimo" text,
        "logo" text,
        "juego" text,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        PRIMARY KEY ("userId", "teamId"),
        CONSTRAINT "esports_favorito_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
      )
    `;

    console.log("OK: tabla esports_favorito creada (o ya existía).");
  } finally {
    await sql.end();
  }
}

main();
