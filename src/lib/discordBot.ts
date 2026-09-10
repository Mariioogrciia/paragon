import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, users } from "@/db/schema";
import type { Trophy } from "@/lib/types";

/**
 * Avisos de trofeos por DM del propio bot de Discord de Paragon —
 * SUSTITUYE al webhook (lib/discordWebhook.ts, ya no se usa). Diferencia
 * real: el webhook pedía que cada usuario creara una URL a mano en su
 * propio servidor; el bot le escribe directo si inició sesión con Discord
 * (su ID ya está en `accounts`) y tiene los DMs abiertos.
 *
 * Requiere `DISCORD_BOT_TOKEN` (Developer Portal → tu aplicación → Bot →
 * Reset Token) — sin él, todas las funciones de aquí no hacen nada, en vez
 * de romper la sincronización.
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

interface EmbedDiscord {
  title: string;
  description?: string;
  url?: string;
  color: number;
  thumbnail?: { url: string };
  footer?: { text: string };
}

const API_BASE = "https://discord.com/api/v10";

/** El ID de Discord de este usuario, si alguna vez inició sesión con ese proveedor. `null` = nunca lo vinculó, no hay a quién escribir. */
export async function discordUserIdDe(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ providerAccountId: accounts.providerAccountId })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.provider, "discord")))
    .limit(1);
  return row?.providerAccountId ?? null;
}

/** Al revés que la de arriba — de un ID de Discord (quien escribe un comando) a SU cuenta de Paragon. Para los comandos de barra, ver app/api/discord/interactions/route.ts. */
export async function usuarioParagonDeDiscord(discordUserId: string): Promise<string | null> {
  const [row] = await db
    .select({ userId: accounts.userId })
    .from(accounts)
    .where(and(eq(accounts.providerAccountId, discordUserId), eq(accounts.provider, "discord")))
    .limit(1);
  return row?.userId ?? null;
}

/**
 * Manda un DM. Dos peticiones porque así funciona la API de Discord: no
 * hay "escribe a este usuario" directo, primero se abre (o reutiliza) el
 * canal de DM con él, y ahí sí se manda el mensaje.
 *
 * Devuelve un motivo de fallo legible para el botón "Probar" de Ajustes —
 * el caso real más común es 403 (no comparte servidor con el bot, o tiene
 * los DMs cerrados a gente del servidor), y merece decirlo tal cual, no un
 * "algo falló" genérico.
 */
async function enviarDM(discordUserId: string, embed: EmbedDiscord): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return { ok: false, error: "Falta DISCORD_BOT_TOKEN en el servidor." };

  const headers = { Authorization: `Bot ${token}`, "Content-Type": "application/json" };

  try {
    const canal = await fetch(`${API_BASE}/users/@me/channels`, {
      method: "POST",
      headers,
      body: JSON.stringify({ recipient_id: discordUserId }),
    });
    if (!canal.ok) {
      if (canal.status === 403) {
        return { ok: false, error: "Discord no deja escribirte — tenéis que compartir un servidor con el bot y tener los DMs de miembros del servidor activados." };
      }
      return { ok: false, error: `Discord devolvió ${canal.status} al abrir el DM.` };
    }
    const { id: channelId } = (await canal.json()) as { id: string };

    const mensaje = await fetch(`${API_BASE}/channels/${channelId}/messages`, {
      method: "POST",
      headers,
      body: JSON.stringify({ embeds: [embed] }),
    });
    if (!mensaje.ok) return { ok: false, error: `Discord devolvió ${mensaje.status} al mandar el mensaje.` };

    return { ok: true };
  } catch (error) {
    console.error("[discordBot] no se pudo avisar", error);
    return { ok: false, error: "Fallo de red al hablar con Discord." };
  }
}

/**
 * Manda el aviso de logros nuevos de UN juego tras una sincronización, si
 * el usuario tiene los DMs activados y su Discord vinculado. Nunca lanza —
 * un DM que falla no puede tirar abajo el cron de sincronización.
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

  const [row] = await db
    .select({ activado: users.discordDmEnabled, handle: users.handle })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!row?.activado) return;

  const discordUserId = await discordUserIdDe(userId);
  if (!discordUserId) return;

  // `VERCEL_PROJECT_PRODUCTION_URL` (dominio real de producción, sin
  // protocolo) la pone Vercel sola en cada despliegue — sin dominio fijo
  // guardado en el proyecto para no arriesgarse a adivinarlo mal.
  const dominio = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const href = row.handle && dominio ? `https://${dominio}/u/${row.handle}/${opts.gameId}` : undefined;
  const platino = opts.nuevos.find((t) => t.grade === "platinum");

  if (platino) {
    await enviarDM(discordUserId, {
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

  await enviarDM(discordUserId, {
    title: `🎮 ${opts.juego} — ${opts.nuevos.length === 1 ? "1 trofeo nuevo" : `${opts.nuevos.length} trofeos nuevos`}`,
    description: lista + resto,
    url: href,
    color: colorDeGrado(opts.nuevos[0]?.grade),
    thumbnail: opts.iconUrl ? { url: opts.iconUrl } : undefined,
    footer: { text: "Paragon" },
  });
}

/** Botón "Probar" de /ajustes — devuelve el motivo si falla, para no dejar a nadie con un simple "no funcionó". */
export async function probarDiscordDm(userId: string): Promise<{ ok: boolean; error?: string }> {
  const discordUserId = await discordUserIdDe(userId);
  if (!discordUserId) {
    return { ok: false, error: "Tu cuenta de Paragon no inició sesión con Discord, así que no hay a quién escribir." };
  }

  return enviarDM(discordUserId, {
    title: "✅ Paragon conectado",
    description: "Cuando consigas un trofeo nuevo, te lo digo por aquí.",
    color: COLOR_GENERICO,
    footer: { text: "Paragon" },
  });
}

export async function setDiscordDmEnabled(userId: string, enabled: boolean): Promise<void> {
  await db.update(users).set({ discordDmEnabled: enabled }).where(eq(users.id, userId));
}
