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

// Mismas categorías que Trophy DNA (lib/trophyDna.ts) — se repiten aquí a
// mano porque este script corre suelto con `tsx`, sin pasar por Next, y
// mantenerlo así de simple evita arrastrar el resto de la app solo para
// una lista de 7 nombres que apenas cambia.
const GENEROS = [
  { name: "accion", value: "accion" },
  { name: "rpg", value: "rpg" },
  { name: "aventura", value: "aventura" },
  { name: "estrategia", value: "estrategia" },
  { name: "plataformas", value: "plataformas" },
  { name: "puzles", value: "puzles" },
  { name: "deportes", value: "deportes" },
];

const COMANDOS = [
  {
    name: "platinosalalcance",
    description: "Juegos muy avanzados que llevan meses parados — tu radar de platinos al alcance.",
  },
  {
    name: "hoy",
    description: "Qué puedes cerrar hoy según el tiempo (y el tipo de juego) que te apetezca.",
    options: [
      {
        type: 4, // INTEGER
        name: "minutos",
        description: "Cuántos minutos tienes hoy",
        required: false,
      },
      {
        type: 3, // STRING
        name: "genero",
        description: "Si te apetece un tipo concreto",
        required: false,
        choices: GENEROS,
      },
    ],
  },
  {
    name: "perfil",
    description: "Tus estadísticas de Paragon, o las de un amigo con Discord vinculado.",
    options: [
      {
        type: 6, // USER
        name: "usuario",
        description: "De quién (vacío = tú mismo)",
        required: false,
      },
    ],
  },
  {
    name: "verguenza",
    description: "El Salón de la Vergüenza: juegos en tu biblioteca sin ni una hora, sin ni un trofeo.",
  },
  {
    name: "racha",
    description: "Tu racha actual de días seguidos ganando al menos un trofeo.",
  },
  {
    name: "anunciosaqui",
    description: "Anuncia en este canal cuando alguien del servidor suba de nivel Paragon.",
    // Bitfield de permisos de Discord como texto — 0x20 = MANAGE_GUILD
    // ("Gestionar servidor"). Sin esto, cualquiera podría decidir dónde
    // anuncia el bot en un servidor que no es suyo.
    default_member_permissions: "32",
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
