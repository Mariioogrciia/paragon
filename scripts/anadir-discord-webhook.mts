/**
 * Añade, con SQL explícito, `discordWebhookUrl` a `user` — dónde anunciar
 * los logros nuevos (ver lib/discordWebhook.ts). Sin bot ni permisos: el
 * propio usuario pega la URL de un webhook creado desde su Discord.
 *
 *   npx tsx scripts/anadir-discord-webhook.mts
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
      ADD COLUMN IF NOT EXISTS "discordWebhookUrl" text;
    `;
    console.log("OK: user.discordWebhookUrl");
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
