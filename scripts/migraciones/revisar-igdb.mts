/**
 * Deshace los emparejamientos con IGDB que son de otro juego (16 nov 2026).
 *
 * El emparejamiento automático se quedaba con el primer resultado de la
 * búsqueda por título: «The Forest» acabó como «Sons of the Forest», y como
 * syncIgdbMetadata pone la carátula de IGDB en `game.iconUrl`, el juego
 * enseñaba la de otro en toda la web (y en el fondo del perfil).
 *
 * Para cada juego con `igdbId`, se pide a IGDB su nombre, sus nombres
 * alternativos y sus plataformas; si no es el juego (la misma regla que el
 * emparejamiento: esElMismoJuego y salioEn, lib/mismoTitulo.ts), se quita el
 * emparejamiento y sus metadatos y se marca para volver a emparejar. La
 * carátula solo si era la de IGDB: la siguiente sincronización de la
 * biblioteca pone la de la plataforma. Idempotente: lo bueno no se toca.
 *
 * Lo corre el despliegue (desplegar-cloud-run.yml), con la misma estructura de carpetas.
 * Necesita DATABASE_URL, IGDB_CLIENT_ID e IGDB_CLIENT_SECRET.
 */
import postgres from "postgres";
import { esElMismoJuego, salioEn } from "../../src/lib/mismoTitulo";

const LOTE = 500;

async function main() {
  const url = process.env.DATABASE_URL;
  const clientId = process.env.IGDB_CLIENT_ID;
  const clientSecret = process.env.IGDB_CLIENT_SECRET;
  if (!url) throw new Error("Falta DATABASE_URL");
  if (!clientId || !clientSecret) {
    console.log("Sin credenciales de IGDB: no se revisa nada.");
    return;
  }

  const token = await fetch(
    `https://id.twitch.tv/oauth2/token?${new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: "client_credentials" })}`,
    { method: "POST" },
  ).then(async (r) => {
    if (!r.ok) throw new Error(`Twitch rechazó las credenciales de IGDB (${r.status})`);
    return ((await r.json()) as { access_token: string }).access_token;
  });

  const sql = postgres(url, { prepare: false });
  try {
    const juegos = await sql<{ id: string; title: string; platform: string; igdbId: number }[]>`
      select "id", "title", "platform", "igdbId" from "game" where "igdbId" is not null`;
    const ids = [...new Set(juegos.map((j) => j.igdbId))];
    const nombres = new Map<number, string[]>();
    const plataformas = new Map<number, string[]>();
    for (let i = 0; i < ids.length; i += LOTE) {
      const lote = ids.slice(i, i + LOTE);
      const r = await fetch("https://api.igdb.com/v4/games", {
        method: "POST",
        headers: { "Client-ID": clientId, Authorization: `Bearer ${token}`, "Content-Type": "text/plain" },
        body: `fields id, name, alternative_names.name, platforms.abbreviation; where id = (${lote.join(",")}); limit ${LOTE};`,
      });
      if (!r.ok) throw new Error(`IGDB respondió ${r.status}`);
      for (const g of (await r.json()) as {
        id: number;
        name?: string;
        alternative_names?: { name: string }[];
        platforms?: { abbreviation?: string }[];
      }[]) {
        nombres.set(g.id, [g.name ?? "", ...(g.alternative_names ?? []).map((a) => a.name)].filter(Boolean));
        plataformas.set(g.id, (g.platforms ?? []).map((p) => p.abbreviation ?? "").filter(Boolean));
      }
      await new Promise((res) => setTimeout(res, 300)); // IGDB: 4 peticiones/s
    }

    // Un id que IGDB ya no devuelve (borrado o fusionado) también se rehace.
    const malos = juegos.filter(
      (j) => !esElMismoJuego(nombres.get(j.igdbId) ?? [], j.title) || !salioEn(plataformas.get(j.igdbId), j.platform),
    );
    for (const j of malos) {
      // La carátula, solo si era la de IGDB (la puso syncIgdbMetadata): la de
      // la plataforma se queda, y un juego que ya nadie sincroniza no se
      // queda sin ninguna.
      await sql`
        update "game" set
          "igdbId" = null, "developer" = null, "publisher" = null, "genres" = null, "pegi" = null,
          "metadataSyncedAt" = null,
          "iconUrl" = case when "iconUrl" like '%images.igdb.com%' then null else "iconUrl" end
        where "id" = ${j.id}`;
    }
    console.log(`IGDB: ${juegos.length} juegos emparejados revisados, ${malos.length} eran de otro juego y se han deshecho.`);
    // Todos, no los 30 primeros: es la forma de ver si alguno era bueno.
    for (const j of malos) {
      const plat = (plataformas.get(j.igdbId) ?? []).join("/") || "?";
      console.log(`  · ${j.title} (${j.platform}) → era «${nombres.get(j.igdbId)?.[0] ?? "(no existe)"}» [${plat}]`);
    }
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
