import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { platformAccounts, steamAccountExtra } from "@/db/schema";
import { canReadLibrary, resolveProfile } from "@/lib/steam/client";
import { syncCuentaSteamExtra } from "@/lib/sync";
import { asegurarTablaSteamExtra, cuentasSteamExtra } from "@/lib/steamExtraDatos";

/**
 * Varias cuentas de Steam en el mismo perfil (15 oct 2026): la principal se
 * vincula como siempre (platform_account) y las demás van aquí, en
 * `steam_account_extra`. Sus juegos se guardan en la misma biblioteca y los
 * logros de un juego se juntan con los de todas las cuentas (ver
 * `syncLibrary` y `logrosSteamDeTodas` en lib/sync.ts). De momento solo para
 * el desarrollador (`esDesarrollador`, lib/profiles.ts): lo comprueba quien
 * llama.
 */

export class SteamExtraError extends Error {}

export const MAX_CUENTAS_STEAM_EXTRA = 3;

export interface ResultadoSteamExtra {
  username: string;
  legible: boolean;
  juegos: number;
}

export async function anadirCuentaSteamExtra(userId: string, entrada: string): Promise<ResultadoSteamExtra> {
  if (!(await asegurarTablaSteamExtra())) {
    throw new SteamExtraError("No se ha podido guardar la cuenta. Inténtalo en un momento.");
  }

  const [principal] = await db
    .select({ accountId: platformAccounts.accountId })
    .from(platformAccounts)
    .where(and(eq(platformAccounts.userId, userId), eq(platformAccounts.platform, "steam")))
    .limit(1);
  if (!principal) throw new SteamExtraError("Vincula primero tu cuenta principal de Steam.");

  const actuales = await cuentasSteamExtra(userId);
  // Lanza los errores de siempre de Steam (no existe, sin clave...): los
  // traduce describePlatformError, como al vincular la principal.
  const perfil = await resolveProfile(entrada);

  if (perfil.steamId === principal.accountId) throw new SteamExtraError("Esa ya es tu cuenta principal de Steam.");
  const yaEsMia = actuales.some((c) => c.accountId === perfil.steamId);
  if (!yaEsMia && actuales.length >= MAX_CUENTAS_STEAM_EXTRA) {
    throw new SteamExtraError(`Como mucho ${MAX_CUENTAS_STEAM_EXTRA} cuentas de Steam además de la principal.`);
  }

  const [deOtro] = await db
    .select({ userId: platformAccounts.userId })
    .from(platformAccounts)
    .where(and(eq(platformAccounts.platform, "steam"), eq(platformAccounts.accountId, perfil.steamId)))
    .limit(1);
  const [extraDeOtro] = await db
    .select({ userId: steamAccountExtra.userId })
    .from(steamAccountExtra)
    .where(eq(steamAccountExtra.accountId, perfil.steamId))
    .limit(1);
  if ((deOtro && deOtro.userId !== userId) || (extraDeOtro && extraDeOtro.userId !== userId)) {
    throw new SteamExtraError(
      "Esa cuenta de Steam ya está vinculada a otro usuario de Paragon — cada cuenta real solo puede estar en un sitio.",
    );
  }

  const legible = perfil.isPublic && (await canReadLibrary(perfil.steamId));
  await db
    .insert(steamAccountExtra)
    .values({
      userId,
      accountId: perfil.steamId,
      username: perfil.personaName,
      avatarUrl: perfil.avatarUrl ?? null,
      isPublic: legible,
      syncedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [steamAccountExtra.userId, steamAccountExtra.accountId],
      set: { username: perfil.personaName, avatarUrl: perfil.avatarUrl ?? null, isPublic: legible, syncedAt: new Date() },
    });

  const juegos = legible ? await syncCuentaSteamExtra(userId, perfil.steamId) : 0;
  return { username: perfil.personaName, legible, juegos };
}

/**
 * Quita una cuenta extra. Sus juegos se quedan en la biblioteca, igual que al
 * desvincular una plataforma: lo ya conseguido no se borra.
 */
export async function quitarCuentaSteamExtra(userId: string, steamId: string): Promise<void> {
  if (!(await asegurarTablaSteamExtra())) return;
  await db
    .delete(steamAccountExtra)
    .where(and(eq(steamAccountExtra.userId, userId), eq(steamAccountExtra.accountId, steamId)));
}
