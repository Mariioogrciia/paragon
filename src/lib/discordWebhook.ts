import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import type { Trophy } from "@/lib/types";

/**
 * Webhook de Discord para anunciar logros nuevos.
 *
 * La alternativa real al "Rich Presence" que se pidió antes (ver HANDOFF):
 * eso es IPC local con el cliente de Discord, ninguna web app externa puede
 * escribirlo desde un servidor — esto sí, sin bot ni permisos de OAuth de
 * por medio. El propio usuario crea el webhook desde Ajustes del servidor
 * → Integraciones → Webhooks en su Discord, y pega la URL en /ajustes.
 *
 * Un webhook por juego y sincronización, no uno por trofeo: sincronizar de
 * golpe 50 trofeos atrasados (la primera vez que se vincula una cuenta, o
 * tras mucho sin abrir la app) mandaría 50 mensajes seguidos al canal —
 * spam de verdad y, encima, tropieza con el límite de Discord (5
 * peticiones cada 2s por webhook). Un platino sí es su propio mensaje,
 * siempre: es el hito que de verdad se quiere celebrar aparte.
 */

const COLOR_PLATINO = 0x9fd4ec;
const COLOR_ORO = 0xe2b53e;
const COLOR_PLATA = 0xb9c2cc;
const COLOR_BRONCE = 0xc07b4a;
const COLOR_GENERICO = 0x5865f2; // "blurple" de Discord, para plataformas sin metal (Steam/Xbox).

function colorDeGrado(grade: Trophy["grade"]): number {
  if (grade === "platinum") return COLOR_PLATINO;
  if (grade === "gold") return COLOR_ORO;
  if (grade === "silver") return COLOR_PLATA;
  if (grade === "bronze") return COLOR_BRONCE;
  return COLOR_GENERICO;
}

/** Solo se aceptan webhooks de Discord de verdad — la URL la pega el propio
 * usuario y el servidor hace un POST a lo que sea que haya ahí, así que sin
 * esto cualquiera podría usar "el webhook de Paragon" para mandar peticiones
 * a una URL cualquiera (SSRF) con nuestro servidor de por medio. */
export function esWebhookDiscordValido(url: string): boolean {
  return /^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[\w-]+$/.test(url.trim());
}

export async function getDiscordWebhookUrl(userId: string): Promise<string | null> {
  const [row] = await db.select({ url: users.discordWebhookUrl }).from(users).where(eq(users.id, userId)).limit(1);
  return row?.url ?? null;
}

export async function setDiscordWebhookUrl(userId: string, url: string | null): Promise<void> {
  const limpio = url?.trim() || null;
  if (limpio && !esWebhookDiscordValido(limpio)) {
    throw new Error("Eso no parece una URL de webhook de Discord (empieza por https://discord.com/api/webhooks/...).");
  }
  await db.update(users).set({ discordWebhookUrl: limpio }).where(eq(users.id, userId));
}

interface EmbedDiscord {
  title: string;
  description?: string;
  url?: string;
  color: number;
  thumbnail?: { url: string };
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
}

async function enviar(url: string, embed: EmbedDiscord): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // "Paragon" como nombre del bot que publica, para que no salga como
      // "Webhook" a secas en el canal.
      body: JSON.stringify({ username: "Paragon", embeds: [embed] }),
    });
    return res.ok;
  } catch (error) {
    console.error("[discordWebhook] no se pudo avisar", error);
    return false;
  }
}

/**
 * Manda el aviso de logros nuevos de UN juego tras una sincronización, si el
 * usuario tiene un webhook guardado. No lanza si falla — un Discord caído o
 * una URL que dejó de existir no puede tirar abajo el cron de sincronización
 * por esto.
 */
export async function anunciarLogrosNuevos(
  userId: string,
  opts: {
    gameId: string;
    juego: string;
    iconUrl?: string | null;
    nuevos: Trophy[];
  },
): Promise<void> {
  if (opts.nuevos.length === 0) return;

  // Webhook y handle en la misma consulta — esto se llama una vez por juego
  // sincronizado, así que no vale la pena una segunda ida a la base solo
  // para el enlace del embed.
  const [row] = await db
    .select({ url: users.discordWebhookUrl, handle: users.handle })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!row?.url) return;
  const url = row.url;

  // `VERCEL_PROJECT_PRODUCTION_URL` (dominio real de producción, sin
  // protocolo) la pone Vercel sola en cada despliegue — no hay ningún
  // dominio fijo guardado en el proyecto para no arriesgarse a adivinarlo
  // mal. En local (sin esa variable) el enlace simplemente no se manda: un
  // embed sin enlace es mejor que uno con un enlace que no funciona.
  const dominio = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const href = row.handle && dominio ? `https://${dominio}/u/${row.handle}/${opts.gameId}` : undefined;
  const platino = opts.nuevos.find((t) => t.grade === "platinum");

  try {
    if (platino) {
      await enviar(url, {
        title: `🏆 ¡Platino conseguido! — ${opts.juego}`,
        url: href,
        color: COLOR_PLATINO,
        thumbnail: opts.iconUrl ? { url: opts.iconUrl } : undefined,
        footer: { text: "Paragon" },
      });
      return;
    }

    const EMOJI: Partial<Record<NonNullable<Trophy["grade"]>, string>> = {
      gold: "🥇",
      silver: "🥈",
      bronze: "🥉",
    };
    const lista = opts.nuevos
      .slice(0, 5)
      .map((t) => `${t.grade ? (EMOJI[t.grade] ?? "🔹") : "🔹"} ${t.name}`)
      .join("\n");
    const resto = opts.nuevos.length > 5 ? `\n… y ${opts.nuevos.length - 5} más` : "";

    await enviar(url, {
      title: `🎮 ${opts.juego} — ${opts.nuevos.length === 1 ? "1 trofeo nuevo" : `${opts.nuevos.length} trofeos nuevos`}`,
      description: lista + resto,
      url: href,
      color: colorDeGrado(opts.nuevos[0]?.grade),
      thumbnail: opts.iconUrl ? { url: opts.iconUrl } : undefined,
      footer: { text: "Paragon" },
    });
  } catch (error) {
    console.error("[discordWebhook] no se pudo avisar", error);
  }
}

/** Mensaje suelto para el botón "Probar" de /ajustes — sin esto no hay
 * forma de saber si la URL pegada es de verdad correcta hasta que salga un
 * trofeo real, que puede tardar días. */
export async function enviarWebhookDePrueba(url: string): Promise<boolean> {
  if (!esWebhookDiscordValido(url)) return false;
  return enviar(url, {
    title: "✅ Paragon conectado",
    description: "Cuando consigas un trofeo nuevo, se anuncia aquí.",
    color: COLOR_GENERICO,
    footer: { text: "Paragon" },
  });
}
