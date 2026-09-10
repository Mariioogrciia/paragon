/**
 * Da de alta (o actualiza) los comandos de barra del bot de Discord de
 * Paragon. Se ejecuta a mano, una vez por cada comando nuevo o cambiado —
 * Discord no los descubre solo desde el código, hay que decírselo por su
 * API.
 *
 * Con `DISCORD_GUILD_ID` puesto en .env.local, los registra SOLO en ese
 * servidor (aparecen al momento — para probar mientras desarrollas). Sin
 * esa variable, los registra en GLOBAL (para todos los servidores donde
 * esté el bot), que Discord tarda hasta 1 hora en propagar — para cuando ya
 * esté decidido que el comando se queda.
 *
 *   npx tsx scripts/registrar-comandos-discord.mts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

const APPLICATION_ID = process.env.DISCORD_APPLICATION_ID;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID; // Opcional — ver comentario de arriba.

if (!APPLICATION_ID || !BOT_TOKEN) {
  console.error("Faltan DISCORD_APPLICATION_ID y/o DISCORD_BOT_TOKEN en .env.local.");
  process.exit(1);
}

const COMANDOS = [
  {
    name: "platinosalalcance",
    description: "Juegos muy avanzados que llevan meses parados — tu radar de platinos al alcance.",
  },
  {
    name: "quejuegohoy",
    description: "Qué puedes cerrar hoy según el tiempo que tengas.",
    options: [
      {
        type: 4, // INTEGER
        name: "minutos",
        description: "Cuántos minutos tienes hoy",
        required: false,
      },
    ],
  },
];

async function main() {
  const url = GUILD_ID
    ? `https://discord.com/api/v10/applications/${APPLICATION_ID}/guilds/${GUILD_ID}/commands`
    : `https://discord.com/api/v10/applications/${APPLICATION_ID}/commands`;

  const res = await fetch(url, {
    method: "PUT",
    headers: { Authorization: `Bot ${BOT_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(COMANDOS),
  });

  if (!res.ok) {
    console.error(`Discord devolvió ${res.status}:`, await res.text());
    process.exit(1);
  }

  const registrados = (await res.json()) as { name: string }[];
  console.log(
    `Registrados ${registrados.length} comando(s) ${GUILD_ID ? `en el servidor ${GUILD_ID} (al momento)` : "en GLOBAL (tardan hasta 1h en aparecer)"}:`,
    registrados.map((c) => `/${c.name}`).join(", "),
  );
}

main();
