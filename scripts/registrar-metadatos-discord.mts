/**
 * Da de alta los campos de Linked Roles del bot (nivel, platinos, trofeos y
 * plataformas; ver lib/discordRoles.ts). Una vez, y cada vez que cambien.
 *
 *   npx tsx scripts/registrar-metadatos-discord.mts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

// Mismo array que lib/discordRoles.ts, sin importar el módulo (lleva server-only).
const METADATOS = [
  { key: "nivel", name: "Nivel Paragon", description: "Nivel Paragon mínimo", type: 2, name_localizations: { "en-US": "Paragon level", "en-GB": "Paragon level", de: "Paragon-Stufe", fr: "Niveau Paragon", it: "Livello Paragon", "pt-BR": "Nível Paragon" } },
  { key: "platinos", name: "Platinos", description: "Platinos (o juegos al 100 %) como mínimo", type: 2, name_localizations: { "en-US": "Platinums", "en-GB": "Platinums", de: "Platin", fr: "Platines", it: "Platini", "pt-BR": "Platinas" } },
  { key: "trofeos", name: "Trofeos", description: "Trofeos y logros como mínimo", type: 2, name_localizations: { "en-US": "Trophies", "en-GB": "Trophies", de: "Trophäen", fr: "Trophées", it: "Trofei", "pt-BR": "Troféus" } },
  { key: "plataformas", name: "Plataformas", description: "Plataformas vinculadas como mínimo", type: 2, name_localizations: { "en-US": "Platforms", "en-GB": "Platforms", de: "Plattformen", fr: "Plateformes", it: "Piattaforme", "pt-BR": "Plataformas" } },
];

const APPLICATION_ID = process.env.DISCORD_APPLICATION_ID;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
if (!APPLICATION_ID || !BOT_TOKEN) {
  console.error("Faltan DISCORD_APPLICATION_ID y/o DISCORD_BOT_TOKEN en .env.local.");
  process.exit(1);
}

const res = await fetch(`https://discord.com/api/v10/applications/${APPLICATION_ID}/role-connections/metadata`, {
  method: "PUT",
  headers: { Authorization: `Bot ${BOT_TOKEN}`, "Content-Type": "application/json" },
  body: JSON.stringify(METADATOS),
});
console.log(res.status, await res.text());
if (!res.ok) process.exit(1);
