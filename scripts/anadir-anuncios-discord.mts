/**
 * `users.lastAnnouncedParagonLevel` y la tabla `discord_guild_settings` —
 * ver schema.ts. SQL explícito, saltándose `db:push` a propósito (sigue
 * bloqueado por el aviso de `push_subscription`, ver HANDOFF.md).
 *
 *   npx tsx scripts/anadir-anuncios-discord.mts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL en .env.local");

  const sql = postgres(url, { prepare: false });

  try {
    await sql`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "lastAnnouncedParagonLevel" integer;`;
    console.log("OK: user.lastAnnouncedParagonLevel");

    await sql`
      CREATE TABLE IF NOT EXISTS "discord_guild_settings" (
        "guildId" text PRIMARY KEY,
        "announceChannelId" text NOT NULL,
        "setBy" text,
        "updatedAt" timestamp NOT NULL DEFAULT now()
      );
    `;
    console.log("OK: discord_guild_settings");
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
