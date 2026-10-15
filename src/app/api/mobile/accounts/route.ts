import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { getMobileUserId } from "@/lib/mobileAuth";
import { getProfileByUserId } from "@/lib/profiles";
import type { PlataformaVinculable } from "@/lib/types";
import { esDeclarada } from "@/lib/declarado";
import { errorMovil } from "@/lib/mensajesApi";
import { cuentasSteamExtra } from "@/lib/steamExtraDatos";
import { MAX_CUENTAS_STEAM_EXTRA } from "@/lib/steamExtra";

// Epic va aparte en la app (auditoría, 4 oct 2026): se ve, pero NO se puede
// vincular desde el móvil — su web bloquea al servidor y solo la extensión
// del navegador puede leerla (`appLinkable: false`). Su progreso es
// declarado: no puntúa en nada (`declared`, ver lib/declarado.ts).
const PLATAFORMAS: PlataformaVinculable[] = ["psn", "steam", "xbox", "epic"];

/**
 * Qué cuentas están vinculadas (para la pantalla "Vincular cuentas"). Los
 * proveedores OAuth (Google/Discord) no tienen un POST propio aquí — se
 * vinculan reabriendo `/movil/entrar/{provider}` (mismo route que el login):
 * la Custom Tab comparte cookies con Chrome, así que si ya hay sesión activa
 * en el navegador del sistema, `signIn()` la detecta y VINCULA en vez de
 * crear una cuenta nueva (`vincularLoginASesionActiva` en src/auth.ts) — no
 * hace falta una API distinta para eso.
 */
export async function GET(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return errorMovil(req, "No autenticado", 401);
  }

  const profile = await getProfileByUserId(userId);
  if (!profile) {
    return errorMovil(req, "Perfil sin terminar de configurar", 409);
  }

  const oauthVinculados = await db
    .select({ provider: accounts.provider })
    .from(accounts)
    .where(eq(accounts.userId, userId));
  const yaVinculados = new Set(oauthVinculados.map((a) => a.provider));

  const oauth = [
    { provider: "google", linked: yaVinculados.has("google"), configured: Boolean(process.env.AUTH_GOOGLE_ID) },
    { provider: "discord", linked: yaVinculados.has("discord"), configured: Boolean(process.env.AUTH_DISCORD_ID) },
  ];

  const platforms = PLATAFORMAS.map((platform) => {
    const cuenta = profile.accounts.find((a) => a.platform === platform);
    const extra = { declared: esDeclarada(platform), appLinkable: platform !== "epic" };
    return cuenta
      ? {
          platform,
          linked: true,
          username: cuenta.username,
          level: cuenta.level,
          // Como la web (/ajustes/plataformas): avatar, si es pública y cuándo se sincronizó.
          avatarUrl: cuenta.avatarUrl,
          isPublic: cuenta.isPublic,
          syncedAt: cuenta.syncedAt ? cuenta.syncedAt.toISOString() : null,
          ...extra,
        }
      : { platform, linked: false, username: null, level: null, avatarUrl: null, isPublic: false, syncedAt: null, ...extra };
  });

  // Otras cuentas de Steam (15 oct 2026, ver lib/steamExtra.ts): solo para el
  // desarrollador y con la principal vinculada; `null` para el resto.
  const steamPrincipal = profile.accounts.some((a) => a.platform === "steam");
  const steamExtra =
    profile.esDesarrollador && steamPrincipal
      ? {
          max: MAX_CUENTAS_STEAM_EXTRA,
          cuentas: (await cuentasSteamExtra(userId)).map((c) => ({
            accountId: c.accountId,
            username: c.username,
            avatarUrl: c.avatarUrl,
            isPublic: c.isPublic,
            syncedAt: c.syncedAt ? c.syncedAt.toISOString() : null,
          })),
        }
      : null;

  return NextResponse.json({ oauth, platforms, steamExtra });
}
