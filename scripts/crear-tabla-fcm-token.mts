/**
 * Crea la tabla de tokens de Firebase Cloud Messaging (fcm_token) — la app
 * nativa de Android no puede recibir Web Push (VAPID), solo habla
 * navegadores/PWA, así que necesita su propio canal (ver lib/fcm.ts).
 * SQL explícito, mismo motivo que el resto de tablas nuevas: db:push
 * compara el esquema entero y es más arriesgado sobre producción que un
 * CREATE TABLE IF NOT EXISTS con alcance propio — de hecho, la vez que se
 * intentó con `db:push` en esta misma sesión, drizzle-kit preguntó si
 * truncar `push_subscription` (2 filas reales) para poder ponerle una
 * restricción UNIQUE que no tenía nada que ver con esta tabla.
 *
 * Ya ejecutada contra producción el 16 de septiembre de 2026 — se deja
 * aquí por si hace falta recrearla en otro entorno, no para repetirla.
 *
 *   npx tsx scripts/crear-tabla-fcm-token.mts
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
      CREATE TABLE IF NOT EXISTS "fcm_token" (
        "id" text PRIMARY KEY NOT NULL,
        "userId" text NOT NULL,
        "token" text NOT NULL UNIQUE,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "fcm_token_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
      )
    `;
    console.log("OK: tabla fcm_token creada (o ya existía).");
  } finally {
    await sql.end();
  }
}

main();
