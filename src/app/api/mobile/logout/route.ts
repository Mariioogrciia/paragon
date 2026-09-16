import { NextResponse } from "next/server";
import { getBearerToken, revokeMobileSession } from "@/lib/mobileAuth";

/**
 * Cerrar sesión SOLO en este móvil — borra únicamente la fila de `session`
 * de este dispositivo (independiente desde `mintMobileSession`, ver
 * lib/mobileAuth.ts). No toca ninguna sesión web ni la de otros
 * dispositivos. Sin token, o token ya inválido: da igual, el resultado que
 * el cliente quiere (quedarse sin sesión) ya es cierto de todas formas.
 */
export async function POST(req: Request) {
  const token = getBearerToken(req);
  if (token) {
    await revokeMobileSession(token);
  }

  return NextResponse.json({ ok: true });
}
