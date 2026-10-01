import { config } from "dotenv";
config({ path: ".env.local" });
import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
console.log(await sql`select count(*)::int total, count(*) filter (where hltb is not null)::int con_hltb, count(*) filter (where "igdbId" is not null)::int con_igdb from game`);
console.log(await sql`select title, hltb from game where hltb is not null limit 3`);
await sql.end();
