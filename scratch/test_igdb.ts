import { igdbRequest } from "../src/lib/igdb/client";

async function run() {
  const query = `
    search "Grand Theft Auto VI";
    fields name, cover.url;
    limit 1;
  `;
  const result = await igdbRequest("/games", query);
  console.log(JSON.stringify(result, null, 2));
}

run().catch(console.error);
