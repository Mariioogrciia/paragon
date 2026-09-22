/**
 * Crea las tablas del sistema de clanes (`clans`, `clan_members`) — mismo
 * motivo de siempre para SQL explícito en vez de `db:push`: no darle a una
 * herramienta la ocasión de proponer cambios sobre el esquema entero de
 * producción por dos tablas nuevas y aisladas.
 *
 * El índice único en `clan_members.userId` hace dos cosas a la vez: evita
 * que alguien acabe en dos clanes a la vez por una carrera entre dos clics
 * casi simultáneos (la comprobación de "ya estás en un clan" en
 * `lib/clans.ts` se hace primero en la aplicación, sin bloqueo — sin este
 * índice, nada lo impide de verdad a nivel de base de datos), y sirve de
 * índice para `getUserClan`, que se consulta en cada carga de `/u/[handle]`.
 *
 *   npx tsx scripts/crear-tabla-clanes.mts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";

async function main() {
  // DIRECT_URL (session pooler), no DATABASE_URL (transaction pooler): el
  // de transacciones no mantiene sesión y el DDL da timeout/falla — ver
  // HANDOFF.md.
  const url = process.env.DIRECT_URL;
  if (!url) throw new Error("Falta DIRECT_URL en .env.local");

  const sql = postgres(url, { prepare: false });

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS "clans" (
        "id" text PRIMARY KEY NOT NULL,
        "name" text NOT NULL,
        "tag" text NOT NULL,
        "description" text NOT NULL DEFAULT '',
        "ownerId" text NOT NULL,
        "logoUrl" text,
        "level" integer NOT NULL DEFAULT 1,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "clans_name_unique" UNIQUE ("name"),
        CONSTRAINT "clans_tag_unique" UNIQUE ("tag"),
        CONSTRAINT "clans_ownerId_user_id_fk" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE CASCADE
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS "clan_members" (
        "clanId" text NOT NULL,
        "userId" text NOT NULL,
        "role" text NOT NULL DEFAULT 'member',
        "joinedAt" timestamp NOT NULL DEFAULT now(),
        PRIMARY KEY ("clanId", "userId"),
        CONSTRAINT "clan_members_clanId_clans_id_fk" FOREIGN KEY ("clanId") REFERENCES "clans"("id") ON DELETE CASCADE,
        CONSTRAINT "clan_members_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
      )
    `;

    // Un usuario, un clan como mucho — a nivel de base de datos, no solo de
    // aplicación. También es el índice que necesita getUserClan().
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS "clan_members_userId_idx" ON "clan_members" ("userId")`;

    console.log("OK: tablas clans y clan_members creadas (o ya existían), con el índice único de pertenencia.");
  } finally {
    await sql.end();
  }
}

main();
