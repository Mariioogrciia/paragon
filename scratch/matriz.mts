import { config } from "dotenv";
config({ path: ".env.local" });
import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
const r = await sql`
  with plat as (
    select gt."gameId", avg(ut."rarityPercent") rareza
    from game_trophy gt join user_trophy ut on ut."gameId"=gt."gameId" and ut."trophyId"=gt."trophyId"
    where gt.grade='platinum' and ut."rarityPercent" is not null group by gt."gameId"),
  horas as (select "gameId", avg("playtimeMinutes")/60.0 h, count(*) n from user_game where "playtimeMinutes" > 0 group by "gameId")
  select count(*)::int juegos, count(*) filter (where h.h is not null)::int con_horas
  from plat p left join horas h on h."gameId"=p."gameId"`;
console.log(r);
await sql.end();
