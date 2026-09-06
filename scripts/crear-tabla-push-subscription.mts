/**
 * Crea `push_subscription` — una fila por navegador suscrito a
 * notificaciones push (ver lib/webPush.ts y db/schema.ts para el porqué de
 * cada columna).
 *
 *   npx tsx scripts/crear-tabla-push-subscription.mts
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
      CREATE TABLE IF NOT EXISTS "push_subscription" (
        "id" text PRIMARY KEY,
        "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "endpoint" text NOT NULL UNIQUE,
        "p256dh" text NOT NULL,
        "auth" text NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT now()
      );
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS "push_subscription_user_idx" ON "push_subscription" ("userId");
    `;
    console.log("OK: tabla push_subscription");
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
