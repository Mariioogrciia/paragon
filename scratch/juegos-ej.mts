import { config } from "dotenv";
config({ path: ".env.local" });
import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
const g = await sql`select g.id, g.title, count(distinct gt."trophyId")::int n, count(distinct gt."iconUrl")::int iconos, (select count(*) from user_game ug where ug."gameId"=g.id)::int jugadores
 from game g join game_trophy gt on gt."gameId"=g.id where g.platform='psn' and g.title ~* '(god of war|ghost of|spider|bloodborne|horizon|last of us|black myth|elden|sekiro|demon|returnal|ratchet|astro|uncharted|gran turismo|stellar|lies of p|hogwarts|red dead|resident)'
 group by g.id, g.title having count(distinct gt."iconUrl") > 20 order by jugadores desc, n desc limit 15`;
console.log(g);
await sql.end();
