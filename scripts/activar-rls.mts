/**
 * Cierra la API REST de Supabase (PostgREST) sobre el esquema `public` —
 * auditoría del 25 de septiembre de 2026.
 *
 * Hallazgo: 32 de las 35 tablas tenían RLS desactivado y los roles `anon` y
 * `authenticated` conservaban los permisos por defecto de Supabase (SELECT,
 * INSERT, UPDATE, DELETE, TRUNCATE...) sobre todas. La app nunca usa esa API
 * (se conecta por `DATABASE_URL` como `postgres`, dueño de las tablas y con
 * BYPASSRLS), pero con la clave `anon` —que Supabase trata como pública—
 * cualquiera habría podido leer `session`/`account` (tokens) o borrar tablas.
 *
 * Tres capas, todas idempotentes:
 *   1. RLS activado SIN políticas en cada tabla → `anon`/`authenticated` no
 *      ven ni tocan ninguna fila. `postgres` no se entera (BYPASSRLS).
 *   2. REVOKE de todos los permisos de esos dos roles sobre tablas y
 *      secuencias existentes.
 *   3. ALTER DEFAULT PRIVILEGES para que las tablas que creen los próximos
 *      scripts de `scripts/` nazcan ya sin esos permisos.
 *
 *   npx tsx scripts/activar-rls.mts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";

async function main() {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL/DIRECT_URL en .env.local");

  const sql = postgres(url, { prepare: false });

  try {
    const tablas = await sql<{ tablename: string }[]>`
      select tablename from pg_tables where schemaname = 'public' and not rowsecurity
    `;
    for (const { tablename } of tablas) {
      await sql.unsafe(`ALTER TABLE public."${tablename}" ENABLE ROW LEVEL SECURITY`);
      console.log(`RLS: ${tablename}`);
    }

    await sql.unsafe(`REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated`);
    await sql.unsafe(`REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated`);
    await sql.unsafe(`ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated`);
    await sql.unsafe(`ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated`);
    console.log("OK: permisos de anon/authenticated retirados");

    const [resto] = await sql<{ sinRls: number; grants: number }[]>`
      select
        (select count(*)::int from pg_tables where schemaname = 'public' and not rowsecurity) as "sinRls",
        (select count(*)::int from information_schema.role_table_grants
          where table_schema = 'public' and grantee in ('anon', 'authenticated')) as grants
    `;
    console.log(`Comprobación: ${resto.sinRls} tablas sin RLS, ${resto.grants} permisos de anon/authenticated`);
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
