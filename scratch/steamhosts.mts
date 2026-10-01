import { config } from "dotenv";
config({ path: ".env.local" });
import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
const cols = await sql`select table_name, column_name from information_schema.columns where table_schema='public' and data_type in ('text','character varying') and (column_name ilike '%icon%' or column_name ilike '%image%' or column_name ilike '%cover%' or column_name ilike '%url%')`;
for (const c of cols) {
  const [r] = await sql.unsafe(`select count(*)::int n from "${c.table_name}" where "${c.column_name}" like '%steamcdn-a.akamaihd.net%'`);
  if (r.n) console.log(c.table_name, c.column_name, r.n);
}
await sql.end();
