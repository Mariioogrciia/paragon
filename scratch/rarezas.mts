import { config } from "dotenv";
config({ path: ".env.local" });
import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
const r = await sql`with plat as (select gt."gameId", avg(ut."rarityPercent")::float r from game_trophy gt join user_trophy ut on ut."gameId"=gt."gameId" and ut."trophyId"=gt."trophyId" where gt.grade='platinum' and ut."rarityPercent" is not null group by 1)
select percentile_cont(array[0,0.05,0.25,0.5,0.75,0.95,1]) within group (order by r) q, count(*) filter (where r<=0.1) bajo01 from plat`;
console.log(r);
await sql.end();
