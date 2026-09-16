import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { getMobileUserId } from "@/lib/mobileAuth";
import { getProfileByUserId } from "@/lib/profiles";
import type { PlataformaVinculable } from "@/lib/types";

const PLATAFORMAS: PlataformaVinculable[] = ["psn", "steam", "xbox"];

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
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const profile = await getProfileByUserId(userId);
  if (!profile) {
    return NextResponse.json({ error: "Perfil sin terminar de configurar" }, { status: 409 });
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
    return cuenta
      ? { platform, linked: true, username: cuenta.username, level: cuenta.level }
      : { platform, linked: false, username: null, level: null };
  });

  return NextResponse.json({ oauth, platforms });
}
