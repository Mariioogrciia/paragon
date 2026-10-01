import { config } from "dotenv"; config({ path: ".env.local" });
import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });
const r = await sql`select pid, state, wait_event, now()-query_start as dur, left(query,80) q from pg_stat_activity where datname = current_database() and pid <> pg_backend_pid() order by query_start`;
console.log(r.map((x) => [x.pid, x.state, x.wait_event, String(x.dur), x.q].join(" | ")).join("\n"));
await sql.end();
