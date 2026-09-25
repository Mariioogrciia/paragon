import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { linkPsnWithOwnToken, PlatformAccountAlreadyLinkedError } from "@/lib/profiles";
import { PsnAuthError } from "@/lib/psn/auth";

/**
 * Sincroniza PSN con la sesión del propio usuario, leída por la extensión
 * de navegador (ver extension/background.js) — para quien no es amigo de
 * la cuenta maestra que usa el resto de la app (ver lib/psn/auth.ts).
 *
 * Body: `{ "npsso": "..." }`. El token vive solo lo que dura esta petición
 * (ver `authenticateWithNpssoEphemeral`) — nunca se guarda.
 *
 * Auth por Bearer, no por cookie: mismo mecanismo que /api/mobile/* (ver
 * lib/mobileAuth.ts) porque una extensión, a diferencia de una pestaña de
 * paragon.vercel.app, no puede confiar en que la cookie de sesión viaje en
 * una petición cross-site — el token se consigue una vez en
 * /movil/enlazar-extension y se queda en el storage de la extensión.
 */
export async function POST(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "No autenticado — vuelve a conectar la extensión." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const npsso = typeof body?.npsso === "string" ? body.npsso : "";
  if (!npsso) {
    return NextResponse.json({ error: "Falta la sesión de PSN." }, { status: 400 });
  }

  try {
    const resultado = await linkPsnWithOwnToken(userId, npsso);
    return NextResponse.json({ ok: true, ...resultado });
  } catch (error) {
    if (error instanceof PsnAuthError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof PlatformAccountAlreadyLinkedError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("[extension/psn-sync]", error);
    return NextResponse.json({ error: "No se ha podido sincronizar con PSN." }, { status: 500 });
  }
}
