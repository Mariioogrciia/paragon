import { config } from "dotenv";
config({ path: ".env.local" });
import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
console.log(await sql`select name, "iconUrl" from game_trophy where "gameId"='psn-NPWR22392_00' and grade='platinum'`);
await sql.end();
