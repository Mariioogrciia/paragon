import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { urlLoginSteam } from "@/lib/steam/openid";

/**
 * "Verificar con Steam" (22 oct 2026): manda a Steam a iniciar sesión y vuelve
 * a ./vuelta. El `n` de un solo uso va también en una cookie, para que nadie
 * pueda colarte la vuelta de OTRA cuenta de Steam con un enlace.
 */
export async function GET(req: Request) {
  const session = await auth();
  const origen = new URL(req.url).origin;
  if (!session?.user?.id) return NextResponse.redirect(`${origen}/entrar`);

  const n = randomUUID();
  const volverA = `${origen}/api/steam/verificar/vuelta?n=${n}`;
  const respuesta = NextResponse.redirect(urlLoginSteam(volverA, origen));
  respuesta.cookies.set("steam_openid", n, {
    httpOnly: true,
    secure: origen.startsWith("https://"),
    sameSite: "lax",
    path: "/api/steam/verificar",
    maxAge: 600,
  });
  return respuesta;
}
