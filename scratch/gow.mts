import { config } from "dotenv";
config({ path: ".env.local" });
import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
const t = await sql`select gt.name, gt.grade, gt."iconUrl", (select round(avg(ut."rarityPercent")::numeric,1) from user_trophy ut where ut."gameId"=gt."gameId" and ut."trophyId"=gt."trophyId") r
 from game_trophy gt where gt."gameId"='psn-NPWR22392_00' and not gt.hidden and gt.grade in ('gold','silver','bronze') order by r nulls last`;
console.log(t.map((y) => `${y.grade} | ${y.name} | ${y.r} | ${y.iconUrl}`).join("\n"));
const c = await sql`select cover_url, "iconUrl" from game where id='psn-NPWR22392_00'`.catch(async()=>await sql`select "iconUrl" from game where id='psn-NPWR22392_00'`);
console.log(c);
await sql.end();
