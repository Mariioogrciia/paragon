/**
 * Crea la tabla de invitaciones a clanes (`clan_invite`) — mismo motivo de
 * siempre para SQL explícito en vez de `db:push`: no darle a una
 * herramienta la ocasión de proponer cambios sobre el esquema entero de
 * producción por una tabla nueva y aislada.
 *
 *   npx tsx scripts/crear-tabla-clan-invites.mts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";

async function main() {
  // DIRECT_URL (session pooler), no DATABASE_URL (transaction pooler): el
  // de transacciones no mantiene sesión y el DDL da timeout/falla.
  const url = process.env.DIRECT_URL;
  if (!url) throw new Error("Falta DIRECT_URL en .env.local");

  const sql = postgres(url, { prepare: false });

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS "clan_invite" (
        "clanId" text NOT NULL,
        "invitedUserId" text NOT NULL,
        "invitedByUserId" text NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        PRIMARY KEY ("clanId", "invitedUserId"),
        CONSTRAINT "clan_invite_clanId_clans_id_fk" FOREIGN KEY ("clanId") REFERENCES "clans"("id") ON DELETE CASCADE,
        CONSTRAINT "clan_invite_invitedUserId_user_id_fk" FOREIGN KEY ("invitedUserId") REFERENCES "user"("id") ON DELETE CASCADE,
        CONSTRAINT "clan_invite_invitedByUserId_user_id_fk" FOREIGN KEY ("invitedByUserId") REFERENCES "user"("id") ON DELETE CASCADE
      )
    `;

    await sql`CREATE INDEX IF NOT EXISTS "clan_invite_invitedUserId_idx" ON "clan_invite" ("invitedUserId")`;

    console.log("OK: tabla clan_invite creada (o ya existía), con su índice.");
  } finally {
    await sql.end();
  }
}

main();
