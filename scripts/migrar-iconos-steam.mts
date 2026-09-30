/**
 * Iconos de logros de Steam guardados con el dominio viejo
 * (`steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/`), que da 404
 * en los juegos recientes. Los pasa a
 * `shared.akamai.steamstatic.com/community_assets/images/apps/` (ver
 * `iconoLogroSteam` en lib/steam/client.ts, que ya lo hace al sincronizar).
 *
 *   npx tsx scripts/migrar-iconos-steam.mts            (solo cuenta y prueba)
 *   npx tsx scripts/migrar-iconos-steam.mts --aplicar  (actualiza)
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import postgres from "postgres";

const VIEJO = "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/";
const NUEVO = "https://shared.akamai.steamstatic.com/community_assets/images/apps/";

const sql = postgres(process.env.DIRECT_URL || process.env.DATABASE_URL!, { prepare: false });
try {
  const [{ n }] = await sql`select count(*)::int n from game_trophy where "iconUrl" like ${VIEJO + "%"}`;
  const muestra = await sql`select "iconUrl" u from game_trophy where "iconUrl" like ${VIEJO + "%"} order by random() limit 25`;
  const estados = await Promise.all(
    muestra.map((m) => fetch(String(m.u).replace(VIEJO, NUEVO), { signal: AbortSignal.timeout(10_000) }).then((r) => r.status).catch(() => 0)),
  );
  const ok = estados.filter((e) => e === 200).length;
  console.log(`Con el dominio viejo: ${n}. Muestra con la ruta nueva: ${ok}/${estados.length} responden 200.`);
  if (process.argv.includes("--aplicar")) {
    if (ok < estados.length) throw new Error("La ruta nueva no responde para toda la muestra: no se toca nada.");
    const r = await sql`update game_trophy set "iconUrl" = replace("iconUrl", ${VIEJO}, ${NUEVO}) where "iconUrl" like ${VIEJO + "%"}`;
    console.log(`Actualizadas: ${r.count}`);
  }
} finally {
  await sql.end();
}
