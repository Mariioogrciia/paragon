/**
 * Tablas nuevas del 5 nov 2026 (auditoría: Discord, producto y plataformas),
 * con SQL explícito y RLS activado (regla de las tablas nuevas, ver
 * docs/HANDOFF.md). Idempotente y solo aditivo: se puede lanzar las veces
 * que haga falta.
 *
 *   npx tsx scripts/migraciones/crear-tablas-noviembre-2026.mts
 *
 * Hasta que se lance, todo lo que usa estas tablas se apaga solo (captura
 * el error 42P01 de "la tabla no existe") en vez de romper la página.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";

const TABLAS: Record<string, string> = {
  discord_guild_member: `
    CREATE TABLE IF NOT EXISTS "discord_guild_member" (
      "guildId" text NOT NULL,
      "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
      "vistoAt" timestamp NOT NULL DEFAULT now(),
      PRIMARY KEY ("guildId", "userId")
    );`,
  discord_role_connection: `
    CREATE TABLE IF NOT EXISTS "discord_role_connection" (
      "userId" text PRIMARY KEY REFERENCES "user"("id") ON DELETE CASCADE,
      "discordUserId" text NOT NULL,
      "accessToken" text NOT NULL,
      "refreshToken" text NOT NULL,
      "expiresAt" timestamp NOT NULL,
      "ultimoEnvio" jsonb,
      "actualizadoAt" timestamp NOT NULL DEFAULT now()
    );`,
  follow: `
    CREATE TABLE IF NOT EXISTS "follow" (
      "followerId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
      "followedId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
      "createdAt" timestamp NOT NULL DEFAULT now(),
      PRIMARY KEY ("followerId", "followedId")
    );
    CREATE INDEX IF NOT EXISTS "follow_followed_idx" ON "follow" ("followedId");`,
  apoyo: `
    CREATE TABLE IF NOT EXISTS "apoyo" (
      "id" text PRIMARY KEY,
      "userId" text REFERENCES "user"("id") ON DELETE SET NULL,
      "email" text,
      "nombre" text,
      "tipo" text NOT NULL,
      "importe" text NOT NULL,
      "moneda" text NOT NULL,
      "suscripcion" boolean NOT NULL DEFAULT false,
      "recibidoAt" timestamp NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS "apoyo_user_idx" ON "apoyo" ("userId", "recibidoAt");`,
  clave_xbl: `
    CREATE TABLE IF NOT EXISTS "clave_xbl" (
      "userId" text PRIMARY KEY REFERENCES "user"("id") ON DELETE CASCADE,
      "clave" text NOT NULL,
      "actualizadaAt" timestamp NOT NULL DEFAULT now()
    );`,
  correo_semanal: `
    CREATE TABLE IF NOT EXISTS "correo_semanal" (
      "userId" text PRIMARY KEY REFERENCES "user"("id") ON DELETE CASCADE,
      "altaAt" timestamp NOT NULL DEFAULT now()
    );`,
  telegram_chat: `
    CREATE TABLE IF NOT EXISTS "telegram_chat" (
      "userId" text PRIMARY KEY REFERENCES "user"("id") ON DELETE CASCADE,
      "chatId" text UNIQUE,
      "codigo" text UNIQUE,
      "vinculadoAt" timestamp
    );`,
  coleccionable_trofeo: `
    CREATE TABLE IF NOT EXISTS "coleccionable_trofeo" (
      "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
      "gameId" text NOT NULL REFERENCES "game"("id") ON DELETE CASCADE,
      "trophyId" text NOT NULL,
      "nombres" jsonb NOT NULL DEFAULT '[]'::jsonb,
      "marcados" jsonb NOT NULL DEFAULT '[]'::jsonb,
      "actualizadoAt" timestamp NOT NULL DEFAULT now(),
      PRIMARY KEY ("userId", "gameId", "trophyId")
    );
    CREATE INDEX IF NOT EXISTS "coleccionable_trofeo_idx" ON "coleccionable_trofeo" ("gameId", "trophyId");`,
  // Consolas y juegos que ya no tienes (8 nov 2026, lib/retirados.ts).
  retirado: `
    CREATE TABLE IF NOT EXISTS "retirado" (
      "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
      "tipo" text NOT NULL,
      "valor" text NOT NULL,
      "creadoAt" timestamp NOT NULL DEFAULT now(),
      PRIMARY KEY ("userId", "tipo", "valor")
    );`,
};

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL en .env.local");
  const sql = postgres(url, { prepare: false });
  try {
    for (const [tabla, crear] of Object.entries(TABLAS)) {
      await sql.unsafe(crear);
      await sql.unsafe(`ALTER TABLE "${tabla}" ENABLE ROW LEVEL SECURITY`);
      await sql.unsafe(`REVOKE ALL ON "${tabla}" FROM anon, authenticated`);
      console.log("OK:", tabla);
    }
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
