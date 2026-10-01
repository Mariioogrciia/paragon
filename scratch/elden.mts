import { config } from "dotenv";
config({ path: ".env.local" });
import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
const g = await sql`select id, platform, title from game where title ilike '%elden ring%'`;
console.log(g);
for (const x of g) {
  const t = await sql`select gt.name, gt.grade, gt."iconUrl", gt.hidden, (select avg(ut."rarityPercent") from user_trophy ut where ut."gameId"=gt."gameId" and ut."trophyId"=gt."trophyId") r from game_trophy gt where gt."gameId"=${x.id} and not gt.hidden order by r nulls last limit 40`;
  console.log(x.id, t.length); console.log(t.map((y) => `${y.grade} | ${y.name} | ${y.r} | ${y.iconUrl}`).join("\n"));
}
await sql.end();
