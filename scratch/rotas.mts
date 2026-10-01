import { config } from "dotenv";
config({ path: ".env.local" });
import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
const r = await sql`select g.title, g.platform, gt.name, gt."iconUrl" from game_trophy gt join game g on g.id=gt."gameId" where gt.name in ('¡Justo a tiempo!','First Companion')`;
for (const x of r) {
  const st = await fetch(x.iconUrl, { signal: AbortSignal.timeout(8000) }).then((res) => `${res.status} ${res.headers.get("content-type")}`).catch((e) => "ERR " + e.message);
  const nuevo = x.iconUrl.replace("steamcdn-a.akamaihd.net", "cdn.akamai.steamstatic.com");
  const st2 = await fetch(nuevo, { signal: AbortSignal.timeout(8000) }).then((res) => `${res.status} ${res.headers.get("content-type")}`).catch((e) => "ERR " + e.message);
  console.log(x.platform, x.title, "|", x.name, "|", x.iconUrl, "→", st, "| nuevo CDN →", st2);
}
await sql.end();
