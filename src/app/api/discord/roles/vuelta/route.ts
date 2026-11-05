import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { usuarioParagonDeDiscord } from "@/lib/discordBot";
import { actualizarRolesDiscord, canjearCodigoRoles, guardarConexionRoles } from "@/lib/discordRoles";

/**
 * Vuelta del OAuth de Linked Roles. La cuenta de Paragon sale del Discord
 * que acaba de autorizar (si inició sesión en Paragon con él) o, si no, de
 * la sesión abierta en este navegador. Sin ninguna de las dos, a /entrar.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const origen = url.origin;
  const volver = (motivo: string) => {
    const r = NextResponse.redirect(`${origen}/ajustes/discord?roles=${motivo}`);
    r.cookies.delete({ name: "discord_roles", path: "/api/discord/roles" });
    return r;
  };

  const estado = url.searchParams.get("state");
  const codigo = url.searchParams.get("code");
  if (url.searchParams.get("error")) return volver("cancelado");
  if (!estado || !codigo || req.cookies.get("discord_roles")?.value !== estado) return volver("sesion-perdida");

  try {
    const { tokens, discordUserId } = await canjearCodigoRoles(codigo, origen);
    const userId = (await usuarioParagonDeDiscord(discordUserId)) ?? (await auth())?.user?.id ?? null;
    if (!userId) return NextResponse.redirect(`${origen}/entrar`);
    await guardarConexionRoles(userId, discordUserId, tokens);
    const ok = await actualizarRolesDiscord(userId, true);
    return volver(ok ? "ok" : "fallo");
  } catch (error) {
    console.error("[discord-roles]", error);
    return volver("fallo");
  }
}
