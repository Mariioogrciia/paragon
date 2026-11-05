/**
 * Registra el webhook y los comandos del bot de Telegram (lib/telegram.ts).
 * Una vez, y si cambia el dominio o el secreto:
 *
 *   npx tsx scripts/registrar-webhook-telegram.mts
 *
 * Con TELEGRAM_BOT_TOKEN y TELEGRAM_WEBHOOK_SECRET en .env.local (los
 * mismos que en Vercel).
 */
import { config } from "dotenv";
config({ path: ".env.local" });

const token = process.env.TELEGRAM_BOT_TOKEN;
const secreto = process.env.TELEGRAM_WEBHOOK_SECRET;
const dominio = process.env.SITE_URL ?? "https://www.paragontrophies.com";
if (!token || !secreto) {
  console.error("Faltan TELEGRAM_BOT_TOKEN y/o TELEGRAM_WEBHOOK_SECRET en .env.local.");
  process.exit(1);
}

async function api(metodo: string, cuerpo: unknown) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${metodo}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
  console.log(metodo, res.status, await res.text());
}

await api("setWebhook", { url: `${dominio}/api/telegram`, secret_token: secreto, allowed_updates: ["message"] });
const comandos = {
  es: [["perfil", "Tus números de Paragon"], ["racha", "Tu racha de días con trofeo"], ["ayuda", "Qué sé hacer"], ["salir", "Dejar de recibir avisos aquí"]],
  en: [["perfil", "Your Paragon numbers"], ["racha", "Your trophy streak"], ["ayuda", "What I can do"], ["salir", "Stop notifications here"]],
};
await api("setMyCommands", { commands: comandos.es.map(([command, description]) => ({ command, description })), language_code: "es" });
await api("setMyCommands", { commands: comandos.en.map(([command, description]) => ({ command, description })) });
