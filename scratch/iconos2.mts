import { config } from "dotenv";
config({ path: ".env.local" });
import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
const hosts = await sql`select g.platform, substring(gt."iconUrl" from 'https?://([^/]+)') host, count(*)::int n from game_trophy gt join game g on g.id=gt."gameId" group by 1,2 order by 3 desc`;
console.log(hosts);
for (const h of hosts) {
  const muestra = await sql`select gt."iconUrl" u from game_trophy gt join game g on g.id=gt."gameId" where g.platform=${h.platform} and gt."iconUrl" like ${'%' + h.host + '%'} order by random() limit 6`;
  const res = await Promise.all(muestra.map(async (m) => { try { const r = await fetch(m.u, { method: "GET", signal: AbortSignal.timeout(8000) }); return r.status; } catch (e) { return "ERR"; } }));
  console.log(h.platform, h.host, res.join(","));
}
await sql.end();
