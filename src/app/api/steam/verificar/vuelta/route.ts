import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { accountFor, getProfileByUserId, linkAccount, PlatformAccountAlreadyLinkedError } from "@/lib/profiles";
import { steamIdConfirmado } from "@/lib/steam/openid";
import { marcarVerificada } from "@/lib/verificacion";

/**
 * Vuelta de "Verificar con Steam" (ver ../route.ts y lib/steam/openid.ts).
 * Con el SteamID que confirma Steam: si es la cuenta ya vinculada, se marca
 * verificada; si no hay ninguna (u otra), se vincula esa —como el formulario
 * de siempre— y se marca. Vuelve a Ajustes → Plataformas con `?steam=`.
 */
// Vincular importa la biblioteca: puede tardar como el formulario de siempre.
export const maxDuration = 60;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const volver = (resultado: string) => {
    const r = NextResponse.redirect(`${url.origin}/ajustes/plataformas?steam=${resultado}`);
    r.cookies.delete({ name: "steam_openid", path: "/api/steam/verificar" });
    return r;
  };

  const session = await auth();
  if (!session?.user?.id) return NextResponse.redirect(`${url.origin}/entrar`);
  const userId = session.user.id;

  const n = url.searchParams.get("n");
  const guardado = (await cookies()).get("steam_openid")?.value;
  if (!n || n !== guardado) return volver("error");

  const steamId = await steamIdConfirmado(url.searchParams, `${url.origin}/api/steam/verificar/vuelta?n=${n}`);
  if (!steamId) return volver("error");

  try {
    const vinculada = accountFor(await getProfileByUserId(userId), "steam");
    if (vinculada?.accountId !== steamId) await linkAccount(userId, "steam", steamId);
  } catch (error) {
    if (error instanceof PlatformAccountAlreadyLinkedError) return volver("de-otro");
    console.error("[steam-verificar]", error);
    return volver("error");
  }

  return volver(await marcarVerificada(userId, "steam", steamId));
}
