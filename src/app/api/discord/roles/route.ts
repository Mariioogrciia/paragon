import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { urlAutorizarRoles } from "@/lib/discordRoles";

/**
 * "Linked Roles Verification URL" del bot (lib/discordRoles.ts): Discord
 * manda aquí a quien pulsa "Conectar Paragon" en un rol de un servidor. Se
 * va al OAuth de Discord con un `state` de un solo uso en cookie, igual que
 * "Verificar con Steam".
 */
export async function GET(req: Request) {
  const origen = new URL(req.url).origin;
  const estado = randomUUID();
  const destino = urlAutorizarRoles(origen, estado);
  if (!destino) return NextResponse.redirect(`${origen}/ajustes/discord?roles=sin-configurar`);

  const respuesta = NextResponse.redirect(destino);
  respuesta.cookies.set("discord_roles", estado, {
    httpOnly: true,
    secure: origen.startsWith("https://"),
    sameSite: "lax",
    path: "/api/discord/roles",
    maxAge: 600,
  });
  return respuesta;
}
