import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { discordRoleConnections, platformAccounts, users, userGames, games } from "@/db/schema";
import { cifrar, descifrar } from "@/lib/cifrado";
import { getParagonLevel } from "@/lib/paragonLevel";
import { esPlatinoEquivalente } from "@/lib/stats";

/**
 * Linked Roles de Discord (5 nov 2026): los servidores dan roles solos
 * («Nivel Paragon ≥ 50», «100 platinos») según los datos que Paragon manda
 * a Discord por cada persona. Cada servidor que lo use enseña Paragon a
 * todos sus miembros.
 *
 * Montaje (una vez, en el Developer Portal de la aplicación del bot):
 * 1. General Information → "Linked Roles Verification URL" =
 *    `https://www.paragontrophies.com/api/discord/roles`.
 * 2. OAuth2 → Redirects: `https://www.paragontrophies.com/api/discord/roles/vuelta`.
 * 3. `npx tsx scripts/registrar-metadatos-discord.mts` (da de alta los
 *    campos de abajo).
 * 4. En Vercel, `DISCORD_CLIENT_SECRET` (OAuth2 → Client Secret) si la
 *    aplicación del bot no es la misma que la del login con Discord.
 *
 * Después, el admin de cada servidor: Ajustes del servidor → Roles → un rol
 * → Links → Añadir requisito → Paragon.
 */

const API = "https://discord.com/api/v10";

/** Tipos de metadato de Discord: 2 = INTEGER_GREATER_THAN_OR_EQUAL, 7 = BOOLEAN_EQUAL. */
export const METADATOS_ROLES = [
  {
    key: "nivel",
    name: "Nivel Paragon",
    description: "Nivel Paragon mínimo",
    type: 2,
    name_localizations: { "en-US": "Paragon level", "en-GB": "Paragon level", de: "Paragon-Stufe", fr: "Niveau Paragon", it: "Livello Paragon", "pt-BR": "Nível Paragon" },
    description_localizations: { "en-US": "Minimum Paragon level", "en-GB": "Minimum Paragon level", de: "Mindest-Paragon-Stufe", fr: "Niveau Paragon minimum", it: "Livello Paragon minimo", "pt-BR": "Nível Paragon mínimo" },
  },
  {
    key: "platinos",
    name: "Platinos",
    description: "Platinos (o juegos al 100 %) como mínimo",
    type: 2,
    name_localizations: { "en-US": "Platinums", "en-GB": "Platinums", de: "Platin", fr: "Platines", it: "Platini", "pt-BR": "Platinas" },
    description_localizations: { "en-US": "Minimum platinums (or 100% games)", "en-GB": "Minimum platinums (or 100% games)", de: "Mindestens Platin (oder 100-%-Spiele)", fr: "Platines (ou jeux à 100 %) minimum", it: "Platini (o giochi al 100%) minimi", "pt-BR": "Platinas (ou jogos a 100%) no mínimo" },
  },
  {
    key: "trofeos",
    name: "Trofeos",
    description: "Trofeos y logros como mínimo",
    type: 2,
    name_localizations: { "en-US": "Trophies", "en-GB": "Trophies", de: "Trophäen", fr: "Trophées", it: "Trofei", "pt-BR": "Troféus" },
    description_localizations: { "en-US": "Minimum trophies and achievements", "en-GB": "Minimum trophies and achievements", de: "Mindestens Trophäen und Erfolge", fr: "Trophées et succès minimum", it: "Trofei e obiettivi minimi", "pt-BR": "Troféus e conquistas no mínimo" },
  },
  {
    key: "plataformas",
    name: "Plataformas",
    description: "Plataformas vinculadas como mínimo",
    type: 2,
    name_localizations: { "en-US": "Platforms", "en-GB": "Platforms", de: "Plattformen", fr: "Plateformes", it: "Piattaforme", "pt-BR": "Plataformas" },
    description_localizations: { "en-US": "Minimum linked platforms", "en-GB": "Minimum linked platforms", de: "Mindestens verknüpfte Plattformen", fr: "Plateformes liées minimum", it: "Piattaforme collegate minime", "pt-BR": "Plataformas ligadas no mínimo" },
  },
] as const;

export function aplicacionDiscord(): { id: string; secreto: string } | null {
  const id = process.env.DISCORD_APPLICATION_ID;
  // Si el bot y el login son la misma aplicación de Discord, vale el secreto del login.
  const secreto =
    process.env.DISCORD_CLIENT_SECRET ?? (process.env.AUTH_DISCORD_ID === id ? process.env.AUTH_DISCORD_SECRET : undefined);
  return id && secreto ? { id, secreto } : null;
}

export function urlAutorizarRoles(origen: string, estado: string): string | null {
  const app = aplicacionDiscord();
  if (!app) return null;
  const params = new URLSearchParams({
    client_id: app.id,
    redirect_uri: `${origen}/api/discord/roles/vuelta`,
    response_type: "code",
    scope: "role_connections.write identify",
    state: estado,
    prompt: "consent",
  });
  return `https://discord.com/oauth2/authorize?${params}`;
}

interface Tokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

async function pedirToken(cuerpo: Record<string, string>): Promise<Tokens> {
  const app = aplicacionDiscord();
  if (!app) throw new Error("Falta la configuración de la aplicación de Discord.");
  const res = await fetch(`${API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: app.id, client_secret: app.secreto, ...cuerpo }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Discord devolvió ${res.status} al pedir el token: ${await res.text()}`);
  return (await res.json()) as Tokens;
}

export async function canjearCodigoRoles(codigo: string, origen: string): Promise<{ tokens: Tokens; discordUserId: string }> {
  const tokens = await pedirToken({ grant_type: "authorization_code", code: codigo, redirect_uri: `${origen}/api/discord/roles/vuelta` });
  const yo = await fetch(`${API}/users/@me`, { headers: { Authorization: `Bearer ${tokens.access_token}` }, signal: AbortSignal.timeout(10_000) });
  if (!yo.ok) throw new Error(`Discord devolvió ${yo.status} en /users/@me`);
  const { id } = (await yo.json()) as { id: string };
  return { tokens, discordUserId: id };
}

export async function guardarConexionRoles(userId: string, discordUserId: string, tokens: Tokens): Promise<void> {
  const fila = {
    userId,
    discordUserId,
    accessToken: cifrar("discord-roles", tokens.access_token),
    refreshToken: cifrar("discord-roles", tokens.refresh_token),
    expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    ultimoEnvio: null,
    actualizadoAt: new Date(),
  };
  await db.insert(discordRoleConnections).values(fila).onConflictDoUpdate({ target: discordRoleConnections.userId, set: fila });
}

/** Los números que se mandan a Discord (claves = las de `METADATOS_ROLES`). */
async function valoresRoles(userId: string): Promise<Record<string, number>> {
  const [nivel, cuentas, juegos] = await Promise.all([
    getParagonLevel(userId),
    db.select({ platform: platformAccounts.platform }).from(platformAccounts).where(eq(platformAccounts.userId, userId)),
    db
      .select({
        platform: games.platform,
        earned: userGames.earned,
        earnedTotal: userGames.earnedTotal,
        progressPercent: userGames.progressPercent,
      })
      .from(userGames)
      .innerJoin(games, eq(games.id, userGames.gameId))
      .where(and(eq(userGames.userId, userId), eq(userGames.isWishlist, false))),
  ]);
  let platinos = 0;
  let trofeos = 0;
  for (const j of juegos) {
    // esPlatinoEquivalente solo mira estos tres campos (ver lib/stats.ts).
    if (esPlatinoEquivalente({ platform: j.platform, progressPercent: j.progressPercent, earned: { platinum: j.earned?.platinum ?? 0, gold: 0, silver: 0, bronze: 0 } })) platinos += 1;
    trofeos += j.earnedTotal ?? 0;
  }
  return { nivel: nivel.level, platinos, trofeos, plataformas: new Set(cuentas.map((c) => c.platform)).size };
}

/**
 * Manda a Discord los datos de esta persona, si conectó Linked Roles. Se
 * llama al terminar cada sincronización; no hace nada si nada cambió desde
 * el último envío. Nunca lanza.
 */
export async function actualizarRolesDiscord(userId: string, forzar = false): Promise<boolean> {
  try {
    const [fila] = await db.select().from(discordRoleConnections).where(eq(discordRoleConnections.userId, userId)).limit(1);
    if (!fila) return false;
    const app = aplicacionDiscord();
    if (!app) return false;

    let acceso = descifrar("discord-roles", fila.accessToken);
    if (!acceso || fila.expiresAt.getTime() < Date.now() + 60_000) {
      const refresco = descifrar("discord-roles", fila.refreshToken);
      if (!refresco) return false;
      const tokens = await pedirToken({ grant_type: "refresh_token", refresh_token: refresco });
      await guardarConexionRoles(userId, fila.discordUserId, tokens);
      acceso = tokens.access_token;
    }

    const valores = await valoresRoles(userId);
    if (!forzar && fila.ultimoEnvio && JSON.stringify(fila.ultimoEnvio) === JSON.stringify(valores)) return true;

    const [usuario] = await db.select({ handle: users.handle }).from(users).where(eq(users.id, userId)).limit(1);
    const res = await fetch(`${API}/users/@me/applications/${app.id}/role-connection`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${acceso}`, "Content-Type": "application/json" },
      body: JSON.stringify({ platform_name: "Paragon", platform_username: usuario?.handle ? `@${usuario.handle}` : undefined, metadata: valores }),
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 401) {
      // Quitó el permiso desde Discord: se olvida la conexión.
      await db.delete(discordRoleConnections).where(eq(discordRoleConnections.userId, userId));
      return false;
    }
    if (!res.ok) {
      console.error("[discordRoles] Discord devolvió", res.status, await res.text());
      return false;
    }
    await db.update(discordRoleConnections).set({ ultimoEnvio: valores, actualizadoAt: new Date() }).where(eq(discordRoleConnections.userId, userId));
    return true;
  } catch (error) {
    // 42P01: la tabla aún no existe (falta la migración de noviembre).
    if ((error as { cause?: { code?: string } })?.cause?.code !== "42P01") console.error("[discordRoles]", error);
    return false;
  }
}

export async function tieneRolesDiscord(userId: string): Promise<boolean> {
  try {
    const [fila] = await db.select({ userId: discordRoleConnections.userId }).from(discordRoleConnections).where(eq(discordRoleConnections.userId, userId)).limit(1);
    return Boolean(fila);
  } catch {
    return false;
  }
}
