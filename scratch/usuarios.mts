import { config } from "dotenv"; config({ path: ".env.local" });
import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });
const r = await sql`select u.id, u.handle, count(ug.*)::int as juegos from "user" u left join user_game ug on ug."userId" = u.id group by u.id order by juegos desc limit 6`;
console.log(r);
await sql.end();
