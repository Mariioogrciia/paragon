import { config } from "dotenv"; config({ path: ".env.local", quiet: true });
const { artesPorIgdb } = await import("../src/lib/igdb/client");
const m = await artesPorIgdb([119133, 1942, 26192, 7346]);
console.log(m.size, [...m.entries()].map(([k, v]) => k + " " + v.slice(-30)).join("\n"));
