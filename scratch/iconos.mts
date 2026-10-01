import { config } from "dotenv";
config({ path: ".env.local" });
import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
const porPlataforma = await sql`
  select g.platform, count(*)::int total,
    count(*) filter (where gt."iconUrl" is null or gt."iconUrl" = '')::int sin_icono
  from game_trophy gt join game g on g.id = gt."gameId" group by g.platform order by 1`;
console.log(porPlataforma);
const juegos = await sql`
  select g.platform, g.title, count(*)::int sin
  from game_trophy gt join game g on g.id = gt."gameId"
  where gt."iconUrl" is null or gt."iconUrl" = '' group by 1,2 order by 3 desc limit 15`;
console.log(juegos);
const ej = await sql`select g.platform, g.id, gt."trophyId", gt."iconUrl" from game_trophy gt join game g on g.id=gt."gameId" where gt."iconUrl" is not null and gt."iconUrl" <> '' and g.platform in ('xbox','epic','steam') limit 3`;
console.log(ej);
await sql.end();
