import "server-only";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { platformAccounts } from "@/db/schema";
import * as psn from "@/lib/psn/client";
import * as steam from "@/lib/steam/client";
import * as xbl from "@/lib/xbl/client";
import { armarDiagnostico, type Diagnostico, type Lectura, type PlataformaAsistente } from "@/lib/comprobarCuenta";

/**
 * "Comprobar" del asistente de vincular (16 oct 2026): lee la cuenta igual
 * que al vincular (mismas llamadas que `linkAccount` en lib/profiles.ts),
 * pero SIN guardar nada, y dice qué ajuste falta. Así quien vincula ve el
 * problema antes, no con la biblioteca vacía después.
 *
 * Lanza los mismos errores que vincular (perfil no encontrado, plataforma
 * sin configurar...): quien llama los traduce con `describePlatformError`.
 */
export async function diagnosticarCuenta(userId: string, platform: PlataformaAsistente, input: string): Promise<Diagnostico> {
  let lectura: Omit<Lectura, "deOtro">;
  if (platform === "psn") {
    const perfil = await psn.resolveProfile(input);
    lectura = {
      accountId: perfil.accountId,
      username: perfil.onlineId,
      avatarUrl: perfil.avatarUrl ?? null,
      legible: await psn.canReadTrophies(perfil.accountId),
    };
  } else if (platform === "steam") {
    const perfil = await steam.resolveProfile(input);
    lectura = {
      accountId: perfil.steamId,
      username: perfil.personaName,
      avatarUrl: perfil.avatarUrl ?? null,
      perfilPublico: perfil.isPublic,
      legible: perfil.isPublic && (await steam.canReadLibrary(perfil.steamId)),
    };
  } else {
    const perfil = await xbl.resolveProfile(input);
    lectura = {
      accountId: perfil.xuid,
      username: perfil.gamertag,
      avatarUrl: perfil.avatarUrl ?? null,
      legible: await xbl.canReadAchievements(perfil.xuid),
    };
  }

  const [otro] = await db
    .select({ userId: platformAccounts.userId })
    .from(platformAccounts)
    .where(
      and(
        eq(platformAccounts.platform, platform),
        eq(platformAccounts.accountId, lectura.accountId),
        ne(platformAccounts.userId, userId),
      ),
    )
    .limit(1);

  return armarDiagnostico(platform, { ...lectura, deOtro: Boolean(otro) });
}
